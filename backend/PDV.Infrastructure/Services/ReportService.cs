using System.Text;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Reports;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class ReportService(AppDbContext context, ITenantContext tenantContext) : IReportService
{
    private Guid TenantId => tenantContext.TenantId;

    public async Task<List<SalesChartPoint>> GetSalesChartAsync(
        DateTime startDate, DateTime endDate, string groupBy)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);
        var tenantId = TenantId;

        var sales = await context.Sales
            .Where(s => s.TenantId == tenantId
                     && s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new
            {
                s.CreatedAt,
                s.Total,
                Cost = s.Items.Sum(i =>
                    i.PurchasePriceSnapshot.HasValue
                        ? i.PurchasePriceSnapshot.Value * i.Quantity
                        : 0m)
            })
            .ToListAsync();

        return groupBy.ToLower() switch
        {
            "day" => FillDays(
                sales.GroupBy(s => s.CreatedAt.Date)
                     .ToDictionary(g => g.Key, g => (g.Sum(s => s.Total), g.Count(), g.Sum(s => s.Cost))),
                startDate.Date, endDate.Date),

            "week" => FillWeeks(
                sales.GroupBy(s => GetMonday(s.CreatedAt))
                     .ToDictionary(g => g.Key, g => (g.Sum(s => s.Total), g.Count(), g.Sum(s => s.Cost))),
                GetMonday(startDate), GetMonday(endDate)),

            "month" => FillMonths(
                sales.GroupBy(s => new DateTime(s.CreatedAt.Year, s.CreatedAt.Month, 1))
                     .ToDictionary(g => g.Key, g => (g.Sum(s => s.Total), g.Count(), g.Sum(s => s.Cost))),
                new DateTime(startDate.Year, startDate.Month, 1),
                new DateTime(endDate.Year, endDate.Month, 1)),

            "year" => FillYears(
                sales.GroupBy(s => s.CreatedAt.Year)
                     .ToDictionary(g => g.Key, g => (g.Sum(s => s.Total), g.Count(), g.Sum(s => s.Cost))),
                startDate.Year, endDate.Year),

            _ => throw new BusinessException("Parâmetro groupBy inválido. Use: day, week, month ou year.")
        };
    }

    public async Task<SalesMetricsResponse> GetSalesMetricsAsync(
        string? period, DateTime? startDate, DateTime? endDate)
    {
        var (start, end) = ResolveDateRange(period, startDate, endDate);
        var label = ResolvePeriodLabel(period, start, end);
        var tenantId = TenantId;

        var rows = await context.Sales
            .Where(s => s.TenantId == tenantId
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new { s.Total, s.Status })
            .ToListAsync();

        var active = rows.Where(s => s.Status == SaleStatus.Active).ToList();
        var totalSales = active.Count;
        var totalRevenue = active.Sum(s => s.Total);
        var averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0m;
        var cancelledCount = rows.Count(s => s.Status == SaleStatus.Cancelled);

        return new SalesMetricsResponse(totalSales, totalRevenue, averageTicket, cancelledCount, label);
    }

    public async Task<List<SalesByOperatorResponse>> GetSalesByOperatorAsync(
        string? period, DateTime? startDate, DateTime? endDate)
    {
        var (start, end) = ResolveDateRange(period, startDate, endDate);
        var tenantId = TenantId;

        var rows = await context.Sales
            .Where(s => s.TenantId == tenantId
                     && s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new { s.OperatorId, s.Operator.Name, s.Total })
            .ToListAsync();

        return rows
            .GroupBy(s => new { s.OperatorId, s.Name })
            .Select(g => new SalesByOperatorResponse(
                g.Key.OperatorId,
                g.Key.Name,
                g.Count(),
                g.Sum(s => s.Total)))
            .OrderByDescending(r => r.TotalRevenue)
            .ToList();
    }

    public async Task<List<StockSnapshotResponse>> GetStockSnapshotAsync()
    {
        var tenantId = TenantId;

        return await context.Products
            .Where(p => p.TenantId == tenantId)
            .OrderBy(p => p.Name)
            .Select(p => new StockSnapshotResponse(
                p.Id,
                p.Name,
                p.Barcode,
                p.Stock,
                p.Price,
                p.IsActive))
            .ToListAsync();
    }

    public async Task<byte[]> ExportSalesCsvAsync(
        string? period, DateTime? startDate, DateTime? endDate)
    {
        var (start, end) = ResolveDateRange(period, startDate, endDate);
        var tenantId = TenantId;

        var sales = await context.Sales
            .Where(s => s.TenantId == tenantId
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.CreatedAt,
                OperatorName = s.Operator.Name,
                s.CustomerName,
                s.PaymentMethod,
                s.Status,
                s.Total,
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("ID,Data,Operador,Cliente,Forma de Pagamento,Status,Total");

        foreach (var s in sales)
        {
            var status = s.Status == SaleStatus.Active ? "Ativa" : "Cancelada";
            sb.AppendLine(
                $"{s.Id}," +
                $"{s.CreatedAt:dd/MM/yyyy HH:mm}," +
                $"\"{s.OperatorName}\"," +
                $"\"{s.CustomerName ?? ""}\"," +
                $"{s.PaymentMethod}," +
                $"{status}," +
                $"{s.Total:F2}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportStockCsvAsync()
    {
        var tenantId = TenantId;

        var products = await context.Products
            .Where(p => p.TenantId == tenantId)
            .OrderBy(p => p.Name)
            .Select(p => new { p.Name, p.Barcode, p.NCM, p.Stock, p.Price, p.IsActive })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Produto,Código de Barras,NCM,Estoque,Preço,Ativo");

        foreach (var p in products)
        {
            var ativo = p.IsActive ? "Sim" : "Não";
            sb.AppendLine(
                $"\"{p.Name}\"," +
                $"{p.Barcode ?? ""}," +
                $"{p.NCM ?? ""}," +
                $"{p.Stock}," +
                $"{p.Price:F2}," +
                $"{ativo}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static (DateTime Start, DateTime End) ResolveDateRange(
        string? period, DateTime? startDate, DateTime? endDate)
    {
        if (period is not null)
        {
            var now = DateTime.UtcNow;
            return period.ToLower() switch
            {
                "daily"   => (now.Date, now.Date.AddDays(1).AddTicks(-1)),
                "weekly"  => (GetMonday(now), GetMonday(now).AddDays(7).AddTicks(-1)),
                "monthly" => (new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                              new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1).AddTicks(-1)),
                _ => throw new BusinessException("Parâmetro period inválido. Use: daily, weekly ou monthly.")
            };
        }

        if (startDate is null || endDate is null)
            throw new BusinessException("Informe period ou os parâmetros startDate e endDate.");

        return (startDate.Value.Date, endDate.Value.Date.AddDays(1).AddTicks(-1));
    }

    private static string ResolvePeriodLabel(string? period, DateTime start, DateTime end) =>
        period?.ToLower() switch
        {
            "daily"   => "Hoje",
            "weekly"  => "Esta semana",
            "monthly" => "Este mês",
            _         => $"{start:dd/MM/yyyy} – {end:dd/MM/yyyy}"
        };

    private static List<SalesChartPoint> FillDays(
        Dictionary<DateTime, (decimal Total, int Count, decimal Cost)> data,
        DateTime start, DateTime end)
    {
        var result = new List<SalesChartPoint>();
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            var v = data.GetValueOrDefault(d);
            result.Add(new(d.ToString("dd/MM/yy"), v.Total, v.Count, v.Cost));
        }
        return result;
    }

    private static List<SalesChartPoint> FillWeeks(
        Dictionary<DateTime, (decimal Total, int Count, decimal Cost)> data,
        DateTime start, DateTime end)
    {
        var result = new List<SalesChartPoint>();
        for (var d = start; d <= end; d = d.AddDays(7))
        {
            var v = data.GetValueOrDefault(d);
            result.Add(new(d.ToString("dd/MM/yy"), v.Total, v.Count, v.Cost));
        }
        return result;
    }

    private static List<SalesChartPoint> FillMonths(
        Dictionary<DateTime, (decimal Total, int Count, decimal Cost)> data,
        DateTime start, DateTime end)
    {
        var months = new[] {
            "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
            "Jul", "Ago", "Set", "Out", "Nov", "Dez"
        };
        var result = new List<SalesChartPoint>();
        for (var d = start; d <= end; d = d.AddMonths(1))
        {
            var v = data.GetValueOrDefault(d);
            result.Add(new($"{months[d.Month - 1]}/{d.Year}", v.Total, v.Count, v.Cost));
        }
        return result;
    }

    private static List<SalesChartPoint> FillYears(
        Dictionary<int, (decimal Total, int Count, decimal Cost)> data,
        int start, int end)
    {
        return Enumerable.Range(start, end - start + 1)
            .Select(y => {
                var v = data.GetValueOrDefault(y);
                return new SalesChartPoint(y.ToString(), v.Total, v.Count, v.Cost);
            })
            .ToList();
    }

    private static DateTime GetMonday(DateTime date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-diff).Date;
    }
}
