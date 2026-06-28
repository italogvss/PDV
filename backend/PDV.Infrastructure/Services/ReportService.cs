using System.Text;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Reports;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class ReportService(AppDbContext context) : IReportService
{
    public async Task<List<FinancialSummaryPoint>> GetFinancialSummaryAsync(
        DateTime startDate, DateTime endDate, string groupBy)
    {
        var gb = groupBy.ToLower();
        if (gb is not ("day" or "week" or "month" or "year"))
            throw new BusinessException("Parâmetro groupBy inválido. Use: day, week, month ou year.");

        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // NOTA (fuso): CreatedAt é gravado em UTC e aqui é filtrado/agrupado sem conversão de fuso,
        // igual ao resto da aplicação (ExpenseService.GetChartAsync). Vendas perto da meia-noite podem
        // cair no dia/bucket vizinho. Corrigir exige normalizar o fuso do tenant em toda a aplicação.
        var sales = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new
            {
                s.CreatedAt,
                s.Total,
                s.FeeAmount,
                // O lucro considera serviços (custo zero legítimo) e produtos COM custo cadastrado.
                // Produtos sem snapshot de preço de compra são ignorados, para não inflar o lucro com
                // custo zero. A receita total (s.Total) continua cheia para a linha "Receita".
                ProfitRevenue = s.Items
                    .Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue)
                    .Sum(i => i.Subtotal),
                Cost = s.Items
                    .Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue)
                    .Sum(i => (i.PurchasePriceSnapshot ?? 0m) * i.Quantity),
            })
            .ToListAsync();

        // Despesas pela data de vencimento (competência) — consistente com ExpenseService.GetChartAsync
        var expenses = await context.Expenses
            .Where(e => e.DueDate >= start && e.DueDate <= end)
            .Select(e => new { e.DueDate, e.Amount })
            .ToListAsync();

        var salesByBucket = sales
            .GroupBy(s => BucketKey(s.CreatedAt, gb))
            .ToDictionary(g => g.Key, g => (
                Revenue: g.Sum(s => s.Total),
                ProfitRevenue: g.Sum(s => s.ProfitRevenue),
                Cost: g.Sum(s => s.Cost),
                Fees: g.Sum(s => s.FeeAmount)));

        var expensesByBucket = expenses
            .GroupBy(e => BucketKey(e.DueDate, gb))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        var result = new List<FinancialSummaryPoint>();
        foreach (var (key, label) in EnumerateBuckets(startDate, endDate, gb))
        {
            var (revenue, profitRevenue, cost, fees) = salesByBucket.GetValueOrDefault(key);
            var expenseTotal = expensesByBucket.GetValueOrDefault(key);
            // Lucro bruto = receita dos itens contados (serviços + produtos com custo) menos o custo.
            // Produtos sem custo cadastrado ficam de fora para não inflar o lucro.
            var grossProfit = profitRevenue - cost;
            var netResult = grossProfit - fees - expenseTotal;
            result.Add(new FinancialSummaryPoint(label, revenue, cost, fees, expenseTotal, grossProfit, netResult));
        }

        return result;
    }

    public async Task<SalesMetricsResponse> GetSalesMetricsAsync(
        string? period, DateTime? startDate, DateTime? endDate)
    {
        var (start, end) = ResolveDateRange(period, startDate, endDate);
        var label = ResolvePeriodLabel(period, start, end);

        var rows = await context.Sales
            .Where(s => s.CreatedAt >= start && s.CreatedAt <= end)
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

        var rows = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new { s.OperatorId, s.OperatorName, s.Total })
            .ToListAsync();

        return rows
            .GroupBy(s => new { s.OperatorId, s.OperatorName })
            .Select(g => new SalesByOperatorResponse(
                g.Key.OperatorId ?? Guid.Empty,
                g.Key.OperatorName,
                g.Count(),
                g.Sum(s => s.Total)))
            .OrderByDescending(r => r.TotalRevenue)
            .ToList();
    }

    public async Task<List<SalesByPaymentMethodResponse>> GetSalesByPaymentMethodAsync(
        DateTime startDate, DateTime endDate)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        var rows = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new { s.PaymentMethod, s.Total })
            .ToListAsync();

        return rows
            .GroupBy(s => s.PaymentMethod)
            .Select(g => new SalesByPaymentMethodResponse(
                g.Key.ToString(),
                g.Sum(s => s.Total),
                g.Count()))
            .OrderByDescending(r => r.Total)
            .ToList();
    }

    public async Task<List<TopProductResponse>> GetTopProductsAsync(
        DateTime startDate, DateTime endDate, int limit)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // Só itens de produto (ServiceId nulo) — o gráfico é "Top produtos vendidos".
        // Cada item carrega o desconto da venda e o subtotal de todos os itens, para ratear o desconto.
        var items = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .SelectMany(s => s.Items
                .Where(i => i.ProductId != null)
                .Select(i => new
                {
                    i.ProductName,
                    i.Quantity,
                    i.Subtotal,
                    s.Discount,
                    ItemsTotal = s.Items.Sum(x => x.Subtotal),
                }))
            .ToListAsync();

        // Receita líquida por produto = Subtotal − parte proporcional do desconto da venda
        // (rateado pelo peso do item no total da venda).
        return items
            .Select(i => new
            {
                i.ProductName,
                i.Quantity,
                NetRevenue = i.ItemsTotal > 0
                    ? i.Subtotal - i.Discount * (i.Subtotal / i.ItemsTotal)
                    : i.Subtotal,
            })
            .GroupBy(i => i.ProductName)
            .Select(g => new TopProductResponse(
                g.Key,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.NetRevenue)))
            .OrderByDescending(r => r.Revenue)
            .Take(limit)
            .ToList();
    }

    public async Task<List<ExpensesByCategoryResponse>> GetExpensesByCategoryAsync(
        DateTime startDate, DateTime endDate)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // Despesas pela data de vencimento (competência) — consistente com ExpenseService.GetChartAsync
        var rows = await context.Expenses
            .Where(e => e.DueDate >= start && e.DueDate <= end)
            .Select(e => new { e.Category, e.Amount })
            .ToListAsync();

        return rows
            .GroupBy(e => e.Category)
            .Select(g => new ExpensesByCategoryResponse(
                g.Key.ToString(),
                g.Sum(e => e.Amount),
                g.Count()))
            .OrderByDescending(r => r.Total)
            .ToList();
    }

    public async Task<List<StockSnapshotResponse>> GetStockSnapshotAsync()
    {
        return await context.Products
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

        var sales = await context.Sales
            .Where(s => s.CreatedAt >= start && s.CreatedAt <= end)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.CreatedAt,
                s.OperatorName,
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
                $"{CsvField(s.OperatorName)}," +
                $"{CsvField(s.CustomerName)}," +
                $"{s.PaymentMethod}," +
                $"{status}," +
                $"{s.Total:F2}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportAllSalesCsvAsync()
    {
        var sales = await context.Sales
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.CreatedAt,
                s.OperatorName,
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
                $"{CsvField(s.OperatorName)}," +
                $"{CsvField(s.CustomerName)}," +
                $"{s.PaymentMethod}," +
                $"{status}," +
                $"{s.Total:F2}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportStockCsvAsync()
    {
        var products = await context.Products
            .OrderBy(p => p.Name)
            .Select(p => new { p.Name, p.Barcode, p.NCM, p.Stock, p.Price, p.IsActive })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Produto,Código de Barras,NCM,Estoque,Preço,Ativo");

        foreach (var p in products)
        {
            var ativo = p.IsActive ? "Sim" : "Não";
            sb.AppendLine(
                $"{CsvField(p.Name)}," +
                $"{CsvField(p.Barcode)}," +
                $"{CsvField(p.NCM)}," +
                $"{p.Stock}," +
                $"{p.Price:F2}," +
                $"{ativo}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportCustomersCsvAsync()
    {
        var customers = await context.Customers
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Name,
                c.Phone,
                c.Email,
                c.Document,
                c.AddressStreet,
                c.AddressNumber,
                c.AddressCity,
                c.AddressState,
                c.AddressZipCode,
                c.CreatedAt,
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Nome,Telefone,E-mail,CPF/CNPJ,Rua,Número,Cidade,Estado,CEP,Cadastrado em");

        foreach (var c in customers)
        {
            sb.AppendLine(
                $"{CsvField(c.Name)}," +
                $"{CsvField(c.Phone)}," +
                $"{CsvField(c.Email)}," +
                $"{CsvField(c.Document)}," +
                $"{CsvField(c.AddressStreet)}," +
                $"{CsvField(c.AddressNumber)}," +
                $"{CsvField(c.AddressCity)}," +
                $"{CsvField(c.AddressState)}," +
                $"{CsvField(c.AddressZipCode)}," +
                $"{c.CreatedAt:dd/MM/yyyy}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportServicesCsvAsync()
    {
        var services = await context.Services
            .OrderBy(s => s.Name)
            .Select(s => new
            {
                s.Name,
                s.Description,
                s.Price,
                s.DurationMinutes,
                CategoryName = s.Category != null ? s.Category.Name : "",
                s.IsActive,
                s.CreatedAt,
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Nome,Descrição,Preço,Duração (min),Categoria,Ativo,Cadastrado em");

        foreach (var s in services)
        {
            var ativo = s.IsActive ? "Sim" : "Não";
            sb.AppendLine(
                $"{CsvField(s.Name)}," +
                $"{CsvField(s.Description)}," +
                $"{s.Price:F2}," +
                $"{s.DurationMinutes?.ToString() ?? ""}," +
                $"{CsvField(s.CategoryName)}," +
                $"{ativo}," +
                $"{s.CreatedAt:dd/MM/yyyy}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportExpensesCsvAsync()
    {
        var expenses = await context.Expenses
            .OrderByDescending(e => e.DueDate)
            .Select(e => new
            {
                e.Description,
                e.Category,
                e.Amount,
                e.DueDate,
                e.IsPaid,
                e.PaidAt,
                e.IsRecurring,
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Descrição,Categoria,Valor,Vencimento,Pago,Data de Pagamento,Recorrente");

        foreach (var e in expenses)
        {
            var pago = e.IsPaid ? "Sim" : "Não";
            var recorrente = e.IsRecurring ? "Sim" : "Não";
            sb.AppendLine(
                $"{CsvField(e.Description)}," +
                $"{e.Category}," +
                $"{e.Amount:F2}," +
                $"{e.DueDate:dd/MM/yyyy}," +
                $"{pago}," +
                $"{(e.PaidAt.HasValue ? e.PaidAt.Value.ToString("dd/MM/yyyy") : "")}," +
                $"{recorrente}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportBillingCsvAsync()
    {
        var sales = await context.Sales
            .Where(s => s.Status == SaleStatus.Active)
            .Select(s => new
            {
                s.CreatedAt,
                s.Total,
                s.FeeAmount,
                // Serviços + produtos com custo entram no lucro; produtos sem custo cadastrado ficam
                // de fora (igual ao GetFinancialSummaryAsync).
                ProfitRevenue = s.Items
                    .Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue)
                    .Sum(i => i.Subtotal),
                Cost = s.Items
                    .Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue)
                    .Sum(i => (i.PurchasePriceSnapshot ?? 0m) * i.Quantity),
            })
            .ToListAsync();

        var expenses = await context.Expenses
            .Select(e => new { e.DueDate, e.Amount })
            .ToListAsync();

        var salesByMonth = sales
            .GroupBy(s => new DateTime(s.CreatedAt.Year, s.CreatedAt.Month, 1))
            .ToDictionary(g => g.Key, g => (
                Revenue: g.Sum(s => s.Total),
                ProfitRevenue: g.Sum(s => s.ProfitRevenue),
                Cost: g.Sum(s => s.Cost),
                Fees: g.Sum(s => s.FeeAmount)));

        var expensesByMonth = expenses
            .GroupBy(e => new DateTime(e.DueDate.Year, e.DueDate.Month, 1))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        var allMonths = salesByMonth.Keys.Union(expensesByMonth.Keys).OrderBy(d => d).ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Mês,Receita,Custo,Taxas,Despesas,Lucro Bruto,Resultado Líquido");

        foreach (var month in allMonths)
        {
            var (revenue, profitRevenue, cost, fees) = salesByMonth.GetValueOrDefault(month);
            var expTotal = expensesByMonth.GetValueOrDefault(month);
            var grossProfit = profitRevenue - cost;
            var netResult = grossProfit - fees - expTotal;
            sb.AppendLine(
                $"{month:MM/yyyy}," +
                $"{revenue:F2}," +
                $"{cost:F2}," +
                $"{fees:F2}," +
                $"{expTotal:F2}," +
                $"{grossProfit:F2}," +
                $"{netResult:F2}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportTeamCsvAsync()
    {
        var employees = await context.Employees
            .Include(e => e.Role)
            .OrderBy(e => e.UserName)
            .Select(e => new
            {
                e.UserName,
                e.UserEmail,
                e.Phone,
                RoleName = e.Role != null ? e.Role.Name : "",
                e.IsActive,
                e.CreatedAt,
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Nome,E-mail,Telefone,Cargo,Ativo,Cadastrado em");

        foreach (var e in employees)
        {
            var ativo = e.IsActive ? "Sim" : "Não";
            sb.AppendLine(
                $"{CsvField(e.UserName)}," +
                $"{CsvField(e.UserEmail)}," +
                $"{CsvField(e.Phone)}," +
                $"{CsvField(e.RoleName)}," +
                $"{ativo}," +
                $"{e.CreatedAt:dd/MM/yyyy}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    // Export para tenants agendados para exclusão — IgnoreQueryFilters necessário porque o tenant
    // está com IsActive = false e os registros ficam ocultos pelos filtros globais.
    public async Task<byte[]> ExportForTenantAsync(Guid tenantId, string category)
    {
        return category switch
        {
            "sales"     => await ExportAllSalesForTenantAsync(tenantId),
            "products"  => await ExportStockForTenantAsync(tenantId),
            "customers" => await ExportCustomersForTenantAsync(tenantId),
            "services"  => await ExportServicesForTenantAsync(tenantId),
            "expenses"  => await ExportExpensesForTenantAsync(tenantId),
            "billing"   => await ExportBillingForTenantAsync(tenantId),
            "team"      => await ExportTeamForTenantAsync(tenantId),
            _           => throw new BusinessException("Categoria de exportação inválida."),
        };
    }

    private async Task<byte[]> ExportAllSalesForTenantAsync(Guid tenantId)
    {
        var sales = await context.Sales
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new { s.Id, s.CreatedAt, s.OperatorName, s.CustomerName, s.PaymentMethod, s.Status, s.Total })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("ID,Data,Operador,Cliente,Forma de Pagamento,Status,Total");
        foreach (var s in sales)
        {
            var status = s.Status == SaleStatus.Active ? "Ativa" : "Cancelada";
            sb.AppendLine($"{s.Id},{s.CreatedAt:dd/MM/yyyy HH:mm},{CsvField(s.OperatorName)},{CsvField(s.CustomerName)}," +
                          $"{s.PaymentMethod},{status},{s.Total:F2}");
        }
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private async Task<byte[]> ExportStockForTenantAsync(Guid tenantId)
    {
        var products = await context.Products
            .IgnoreQueryFilters()
            .Where(p => p.TenantId == tenantId)
            .OrderBy(p => p.Name)
            .Select(p => new { p.Name, p.Barcode, p.NCM, p.Stock, p.Price, p.IsActive })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Produto,Código de Barras,NCM,Estoque,Preço,Ativo");
        foreach (var p in products)
            sb.AppendLine($"{CsvField(p.Name)},{CsvField(p.Barcode)},{CsvField(p.NCM)},{p.Stock},{p.Price:F2},{(p.IsActive ? "Sim" : "Não")}");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private async Task<byte[]> ExportCustomersForTenantAsync(Guid tenantId)
    {
        var customers = await context.Customers
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId)
            .OrderBy(c => c.Name)
            .Select(c => new { c.Name, c.Phone, c.Email, c.Document, c.AddressStreet, c.AddressNumber, c.AddressCity, c.AddressState, c.AddressZipCode, c.CreatedAt })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Nome,Telefone,E-mail,CPF/CNPJ,Rua,Número,Cidade,Estado,CEP,Cadastrado em");
        foreach (var c in customers)
            sb.AppendLine($"{CsvField(c.Name)},{CsvField(c.Phone)},{CsvField(c.Email)},{CsvField(c.Document)},{CsvField(c.AddressStreet)}," +
                          $"{CsvField(c.AddressNumber)},{CsvField(c.AddressCity)},{CsvField(c.AddressState)},{CsvField(c.AddressZipCode)},{c.CreatedAt:dd/MM/yyyy}");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private async Task<byte[]> ExportServicesForTenantAsync(Guid tenantId)
    {
        var services = await context.Services
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId)
            .OrderBy(s => s.Name)
            .Select(s => new { s.Name, s.Description, s.Price, s.DurationMinutes, CategoryName = s.Category != null ? s.Category.Name : "", s.IsActive, s.CreatedAt })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Nome,Descrição,Preço,Duração (min),Categoria,Ativo,Cadastrado em");
        foreach (var s in services)
            sb.AppendLine($"{CsvField(s.Name)},{CsvField(s.Description)}," +
                          $"{s.Price:F2},{s.DurationMinutes?.ToString() ?? ""},{CsvField(s.CategoryName)}," +
                          $"{(s.IsActive ? "Sim" : "Não")},{s.CreatedAt:dd/MM/yyyy}");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private async Task<byte[]> ExportExpensesForTenantAsync(Guid tenantId)
    {
        var expenses = await context.Expenses
            .IgnoreQueryFilters()
            .Where(e => e.TenantId == tenantId)
            .OrderByDescending(e => e.DueDate)
            .Select(e => new { e.Description, e.Category, e.Amount, e.DueDate, e.IsPaid, e.PaidAt, e.IsRecurring })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Descrição,Categoria,Valor,Vencimento,Pago,Data de Pagamento,Recorrente");
        foreach (var e in expenses)
            sb.AppendLine($"{CsvField(e.Description)},{e.Category},{e.Amount:F2},{e.DueDate:dd/MM/yyyy}," +
                          $"{(e.IsPaid ? "Sim" : "Não")},{(e.PaidAt.HasValue ? e.PaidAt.Value.ToString("dd/MM/yyyy") : "")},{(e.IsRecurring ? "Sim" : "Não")}");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private async Task<byte[]> ExportBillingForTenantAsync(Guid tenantId)
    {
        var sales = await context.Sales
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId && s.Status == SaleStatus.Active)
            .Select(s => new
            {
                s.CreatedAt,
                s.Total,
                s.FeeAmount,
                ProfitRevenue = s.Items.Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue).Sum(i => i.Subtotal),
                Cost = s.Items.Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue).Sum(i => (i.PurchasePriceSnapshot ?? 0m) * i.Quantity),
            })
            .ToListAsync();

        var expenses = await context.Expenses
            .IgnoreQueryFilters()
            .Where(e => e.TenantId == tenantId)
            .Select(e => new { e.DueDate, e.Amount })
            .ToListAsync();

        var salesByMonth  = sales.GroupBy(s => new DateTime(s.CreatedAt.Year, s.CreatedAt.Month, 1))
            .ToDictionary(g => g.Key, g => (Revenue: g.Sum(s => s.Total), ProfitRevenue: g.Sum(s => s.ProfitRevenue), Cost: g.Sum(s => s.Cost), Fees: g.Sum(s => s.FeeAmount)));
        var expensesByMonth = expenses.GroupBy(e => new DateTime(e.DueDate.Year, e.DueDate.Month, 1))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        var allMonths = salesByMonth.Keys.Union(expensesByMonth.Keys).OrderBy(d => d).ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Mês,Receita,Custo,Taxas,Despesas,Lucro Bruto,Resultado Líquido");
        foreach (var month in allMonths)
        {
            var (revenue, profitRevenue, cost, fees) = salesByMonth.GetValueOrDefault(month);
            var expTotal = expensesByMonth.GetValueOrDefault(month);
            var grossProfit = profitRevenue - cost;
            sb.AppendLine($"{month:MM/yyyy},{revenue:F2},{cost:F2},{fees:F2},{expTotal:F2},{grossProfit:F2},{grossProfit - fees - expTotal:F2}");
        }
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private async Task<byte[]> ExportTeamForTenantAsync(Guid tenantId)
    {
        var employees = await context.Employees
            .IgnoreQueryFilters()
            .Where(e => e.TenantId == tenantId)
            .Include(e => e.Role)
            .OrderBy(e => e.UserName)
            .Select(e => new { e.UserName, e.UserEmail, e.Phone, RoleName = e.Role != null ? e.Role.Name : "", e.IsActive, e.CreatedAt })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Nome,E-mail,Telefone,Cargo,Ativo,Cadastrado em");
        foreach (var e in employees)
            sb.AppendLine($"{CsvField(e.UserName)},{CsvField(e.UserEmail)},{CsvField(e.Phone)},{CsvField(e.RoleName)},{(e.IsActive ? "Sim" : "Não")},{e.CreatedAt:dd/MM/yyyy}");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<RevenueByTypeResponse> GetRevenueByTypeAsync(DateTime startDate, DateTime endDate)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        var items = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .SelectMany(s => s.Items.Select(i => new { i.ServiceId, i.Subtotal }))
            .ToListAsync();

        var servicesRevenue = items.Where(i => i.ServiceId != null).Sum(i => i.Subtotal);
        var productsRevenue = items.Where(i => i.ServiceId == null).Sum(i => i.Subtotal);

        return new RevenueByTypeResponse(servicesRevenue, productsRevenue);
    }

    public async Task<List<CustomerNewVsReturningPoint>> GetCustomerNewVsReturningAsync(
        DateTime startDate, DateTime endDate, string groupBy)
    {
        var gb = groupBy.ToLower();
        if (gb is not ("day" or "week" or "month" or "year"))
            throw new BusinessException("Parâmetro groupBy inválido. Use: day, week, month ou year.");

        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // Vendas com cliente identificado no período
        var salesInRange = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CustomerId != null
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new { CustomerId = s.CustomerId!.Value, s.CreatedAt })
            .ToListAsync();

        if (salesInRange.Count == 0)
            return EnumerateBuckets(startDate, endDate, gb)
                .Select(b => new CustomerNewVsReturningPoint(b.Label, 0, 0))
                .ToList();

        var customerIds = salesInRange.Select(s => s.CustomerId).Distinct().ToList();

        // Primeira venda de cada cliente em todo o histórico do tenant
        var firstSaleDates = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CustomerId != null
                     && customerIds.Contains(s.CustomerId!.Value))
            .GroupBy(s => s.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, FirstSale = g.Min(s => s.CreatedAt) })
            .ToListAsync();

        var firstSaleMap = firstSaleDates.ToDictionary(x => x.CustomerId, x => x.FirstSale);

        var classified = salesInRange.Select(s => new
        {
            s.CustomerId,
            s.CreatedAt,
            // Novo = a primeira venda de todos os tempos está no mesmo bucket deste registro
            IsNew = firstSaleMap.TryGetValue(s.CustomerId, out var first)
                    && BucketKey(first, gb) == BucketKey(s.CreatedAt, gb),
        }).ToList();

        var result = new List<CustomerNewVsReturningPoint>();
        foreach (var (key, label) in EnumerateBuckets(startDate, endDate, gb))
        {
            var inBucket = classified.Where(c => BucketKey(c.CreatedAt, gb) == key).ToList();
            var newCount = inBucket.Where(c => c.IsNew).Select(c => c.CustomerId).Distinct().Count();
            var returningCount = inBucket.Where(c => !c.IsNew).Select(c => c.CustomerId).Distinct().Count();
            result.Add(new CustomerNewVsReturningPoint(label, newCount, returningCount));
        }

        return result;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    // Escapa um campo de texto para CSV: duplica aspas, envolve em aspas quando há vírgula/aspas/quebra
    // de linha, e neutraliza injeção de fórmula (=, +, -, @) prefixando uma aspa simples.
    private static string CsvField(string? value)
    {
        var v = value ?? "";
        if (v.Length > 0 && v[0] is '=' or '+' or '-' or '@')
            v = "'" + v;
        if (v.IndexOfAny(['"', ',', '\n', '\r']) >= 0)
            v = "\"" + v.Replace("\"", "\"\"") + "\"";
        return v;
    }

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

    private static DateTime GetMonday(DateTime date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-diff).Date;
    }

    private static readonly string[] MonthAbbrev =
        ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    private static DateTime BucketKey(DateTime date, string groupBy) => groupBy switch
    {
        "week"  => GetMonday(date),
        "month" => new DateTime(date.Year, date.Month, 1),
        "year"  => new DateTime(date.Year, 1, 1),
        _       => date.Date,
    };

    private static IEnumerable<(DateTime Key, string Label)> EnumerateBuckets(
        DateTime startDate, DateTime endDate, string groupBy)
    {
        switch (groupBy)
        {
            case "week":
                for (var d = GetMonday(startDate); d <= GetMonday(endDate); d = d.AddDays(7))
                    yield return (d, d.ToString("dd/MM/yy"));
                break;

            case "month":
                var ms = new DateTime(startDate.Year, startDate.Month, 1);
                var me = new DateTime(endDate.Year, endDate.Month, 1);
                for (var d = ms; d <= me; d = d.AddMonths(1))
                    yield return (d, $"{MonthAbbrev[d.Month - 1]}/{d.Year}");
                break;

            case "year":
                for (var y = startDate.Year; y <= endDate.Year; y++)
                    yield return (new DateTime(y, 1, 1), y.ToString());
                break;

            default: // day
                for (var d = startDate.Date; d <= endDate.Date; d = d.AddDays(1))
                    yield return (d, d.ToString("dd/MM/yy"));
                break;
        }
    }
}
