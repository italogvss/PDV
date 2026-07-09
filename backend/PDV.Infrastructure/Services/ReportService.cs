using System.Text;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Reports;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class ReportService(AppDbContext context, IStorageService storage) : IReportService
{
    public async Task<List<FinancialSummaryPoint>> GetFinancialSummaryAsync(
        DateTime startDate, DateTime endDate, string groupBy, string expenseBasis)
    {
        var gb = groupBy.ToLower();
        if (gb is not ("day" or "week" or "month" or "year"))
            throw new BusinessException("Parâmetro groupBy inválido. Use: day, week, month ou year.");

        var basis = expenseBasis.ToLower();
        if (basis is not ("accrual" or "cash"))
            throw new BusinessException("Parâmetro expenseBasis inválido. Use: accrual ou cash.");

        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // NOTA (fuso): CreatedAt é gravado em UTC e aqui é filtrado/agrupado sem conversão de fuso,
        // igual ao resto da aplicação (ExpenseService.GetChartAsync). Vendas perto da meia-noite podem
        // cair no dia/bucket vizinho. Corrigir exige normalizar o fuso do tenant em toda a aplicação.
        var sales = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new SaleFinancialProjection(
                s.CreatedAt,
                s.Total,
                s.Discount,
                s.FeeAmount,
                s.Items.Sum(i => i.Subtotal),
                s.Items
                    .Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue)
                    .Sum(i => i.Subtotal),
                s.Items
                    .Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue)
                    .Sum(i => (i.PurchasePriceSnapshot ?? 0m) * i.Quantity)))
            .ToListAsync();

        // Despesas por regime:
        // - accrual (competência): pela data de vencimento (DueDate), todas as despesas do período.
        // - cash (caixa): pela data de pagamento (PaidAt), só as despesas efetivamente pagas.
        var expenses = basis == "cash"
            ? await context.Expenses
                .Where(e => e.IsPaid && e.PaidAt != null && e.PaidAt >= start && e.PaidAt <= end)
                .Select(e => new { Date = e.PaidAt!.Value, e.Amount })
                .ToListAsync()
            : await context.Expenses
                .Where(e => e.DueDate >= start && e.DueDate <= end)
                .Select(e => new { Date = e.DueDate, e.Amount })
                .ToListAsync();

        var salesByBucket = sales
            .GroupBy(s => BucketKey(s.CreatedAt, gb))
            .ToDictionary(g => g.Key, g =>
            {
                var parts = g.Select(ToProfitParts).ToList();
                return (
                    Revenue: parts.Sum(p => p.Revenue),
                    Cost: parts.Sum(p => p.Cost),
                    Fees: parts.Sum(p => p.Fees),
                    GrossProfit: parts.Sum(p => p.GrossProfit));
            });

        var expensesByBucket = expenses
            .GroupBy(e => BucketKey(e.Date, gb))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        var result = new List<FinancialSummaryPoint>();
        foreach (var (key, label) in EnumerateBuckets(startDate, endDate, gb))
        {
            var (revenue, cost, fees, grossProfit) = salesByBucket.GetValueOrDefault(key);
            var expenseTotal = expensesByBucket.GetValueOrDefault(key);
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
            .Where(s => s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new { s.Total })
            .ToListAsync();

        var totalSales = rows.Count;
        var totalRevenue = rows.Sum(s => s.Total);
        var averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0m;

        return new SalesMetricsResponse(totalSales, totalRevenue, averageTicket, label);
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
                    ProductId = i.ProductId!.Value,
                    i.ProductName,
                    i.Quantity,
                    i.Subtotal,
                    s.Discount,
                    s.CreatedAt,
                    ItemsTotal = s.Items.Sum(x => x.Subtotal),
                }))
            .ToListAsync();

        // Receita líquida por produto = Subtotal − parte proporcional do desconto da venda
        // (rateado pelo peso do item no total da venda). Agrupado por ProductId (não por nome) —
        // produtos homônimos não se fundem e um item renomeado não fragmenta o histórico; o rótulo
        // usa o nome mais recente (maior CreatedAt).
        return items
            .Select(i => new
            {
                i.ProductId,
                i.ProductName,
                i.Quantity,
                i.CreatedAt,
                NetRevenue = SaleFinancials.NetItemRevenue(i.Subtotal, i.Discount, i.ItemsTotal),
            })
            .GroupBy(i => i.ProductId)
            .Select(g => new TopProductResponse(
                g.OrderByDescending(i => i.CreatedAt).First().ProductName,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.NetRevenue)))
            .OrderByDescending(r => r.Revenue)
            .Take(limit)
            .ToList();
    }

    public async Task<List<TopCustomerResponse>> GetTopCustomersAsync(
        DateTime startDate, DateTime endDate, int limit)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // Só vendas com cliente vinculado — balcão anônimo fica fora do ranking, por natureza do dado.
        var rows = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CustomerId != null
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new { s.CustomerId, CustomerName = s.Customer!.Name, s.Total })
            .ToListAsync();

        // Agrupa por CustomerId (não por nome) — nome vem do Customer vivo, não do snapshot
        // Sale.CustomerName, então clientes homônimos com Ids diferentes não se fundem.
        return rows
            .GroupBy(s => new { s.CustomerId, s.CustomerName })
            .Select(g => new TopCustomerResponse(
                g.Key.CustomerId!.Value,
                g.Key.CustomerName,
                g.Count(),
                g.Sum(s => s.Total)))
            .OrderByDescending(r => r.TotalRevenue)
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

    // Lista de funcionários para a seção "Funcionário" dos Relatórios — servida pelo módulo de
    // Relatórios (mesmo gate da página), não pelo módulo de Funcionários. Só ativos (filtro global).
    public async Task<List<ReportEmployeeResponse>> GetEmployeesListAsync()
    {
        var employees = await context.Employees
            .Include(e => e.Role)
            .OrderBy(e => e.UserName)
            .Select(e => new
            {
                e.Id,
                e.UserName,
                RoleName = e.Role != null ? e.Role.Name : null,
                e.Salary,
                e.ImageUrl,
                e.UpdatedAt,
            })
            .ToListAsync();

        var result = new List<ReportEmployeeResponse>(employees.Count);
        foreach (var e in employees)
        {
            var avatarUrl = await storage.ResolveReadUrlAsync(e.ImageUrl, MediaCategory.Profile, e.UpdatedAt);
            result.Add(new ReportEmployeeResponse(e.Id, e.UserName, e.RoleName, e.Salary, avatarUrl));
        }
        return result;
    }

    // Lista de clientes para a seção "Clientes" dos Relatórios — servida pelo módulo de Relatórios.
    public async Task<List<ReportCustomerResponse>> GetCustomersListAsync()
    {
        return await context.Customers
            .OrderBy(c => c.Name)
            .Select(c => new ReportCustomerResponse(c.Id, c.Name))
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
        // Serviços + produtos com custo entram no lucro; produtos sem custo ficam de fora e o desconto
        // é rateado — tudo centralizado em SaleFinancials (mesma matemática do GetFinancialSummaryAsync).
        var sales = await context.Sales
            .Where(s => s.Status == SaleStatus.Active)
            .Select(s => new SaleFinancialProjection(
                s.CreatedAt,
                s.Total,
                s.Discount,
                s.FeeAmount,
                s.Items.Sum(i => i.Subtotal),
                s.Items.Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue).Sum(i => i.Subtotal),
                s.Items.Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue).Sum(i => (i.PurchasePriceSnapshot ?? 0m) * i.Quantity)))
            .ToListAsync();

        var expenses = await context.Expenses
            .Select(e => new { e.DueDate, e.Amount })
            .ToListAsync();

        var salesByMonth = sales
            .GroupBy(s => new DateTime(s.CreatedAt.Year, s.CreatedAt.Month, 1))
            .ToDictionary(g => g.Key, g =>
            {
                var parts = g.Select(ToProfitParts).ToList();
                return (
                    Revenue: parts.Sum(p => p.Revenue),
                    Cost: parts.Sum(p => p.Cost),
                    Fees: parts.Sum(p => p.Fees),
                    GrossProfit: parts.Sum(p => p.GrossProfit));
            });

        var expensesByMonth = expenses
            .GroupBy(e => new DateTime(e.DueDate.Year, e.DueDate.Month, 1))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        var allMonths = salesByMonth.Keys.Union(expensesByMonth.Keys).OrderBy(d => d).ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Mês,Receita,Custo,Taxas,Despesas,Lucro Bruto,Resultado Líquido");

        foreach (var month in allMonths)
        {
            var (revenue, cost, fees, grossProfit) = salesByMonth.GetValueOrDefault(month);
            var expTotal = expensesByMonth.GetValueOrDefault(month);
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
            .Select(s => new SaleFinancialProjection(
                s.CreatedAt,
                s.Total,
                s.Discount,
                s.FeeAmount,
                s.Items.Sum(i => i.Subtotal),
                s.Items.Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue).Sum(i => i.Subtotal),
                s.Items.Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue).Sum(i => (i.PurchasePriceSnapshot ?? 0m) * i.Quantity)))
            .ToListAsync();

        var expenses = await context.Expenses
            .IgnoreQueryFilters()
            .Where(e => e.TenantId == tenantId)
            .Select(e => new { e.DueDate, e.Amount })
            .ToListAsync();

        var salesByMonth = sales.GroupBy(s => new DateTime(s.CreatedAt.Year, s.CreatedAt.Month, 1))
            .ToDictionary(g => g.Key, g =>
            {
                var parts = g.Select(ToProfitParts).ToList();
                return (Revenue: parts.Sum(p => p.Revenue), Cost: parts.Sum(p => p.Cost), Fees: parts.Sum(p => p.Fees), GrossProfit: parts.Sum(p => p.GrossProfit));
            });
        var expensesByMonth = expenses.GroupBy(e => new DateTime(e.DueDate.Year, e.DueDate.Month, 1))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        var allMonths = salesByMonth.Keys.Union(expensesByMonth.Keys).OrderBy(d => d).ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Mês,Receita,Custo,Taxas,Despesas,Lucro Bruto,Resultado Líquido");
        foreach (var month in allMonths)
        {
            var (revenue, cost, fees, grossProfit) = salesByMonth.GetValueOrDefault(month);
            var expTotal = expensesByMonth.GetValueOrDefault(month);
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

        // Carrega cada item com o desconto e o total da venda, para ratear o desconto por item —
        // assim servicesRevenue + productsRevenue = Σ Sale.Total, coerente com o KPI "Receita total".
        var items = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .SelectMany(s => s.Items.Select(i => new
            {
                i.ServiceId,
                i.Subtotal,
                s.Discount,
                ItemsTotal = s.Items.Sum(x => x.Subtotal),
            }))
            .ToListAsync();

        var servicesRevenue = items
            .Where(i => i.ServiceId != null)
            .Sum(i => SaleFinancials.NetItemRevenue(i.Subtotal, i.Discount, i.ItemsTotal));
        var productsRevenue = items
            .Where(i => i.ServiceId == null)
            .Sum(i => SaleFinancials.NetItemRevenue(i.Subtotal, i.Discount, i.ItemsTotal));

        return new RevenueByTypeResponse(servicesRevenue, productsRevenue);
    }

    public async Task<List<AppointmentSummaryPoint>> GetAppointmentSummaryAsync(
        DateTime startDate, DateTime endDate, string groupBy)
    {
        var gb = groupBy.ToLower();
        if (gb is not ("day" or "week" or "month" or "year"))
            throw new BusinessException("Parâmetro groupBy inválido. Use: day, week, month ou year.");

        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // NOTA (fuso): Start é gravado em UTC e aqui é filtrado/agrupado sem conversão de fuso,
        // igual ao resto da aplicação (GetFinancialSummaryAsync).
        // Base oficial de receita = Σ AppointmentServiceItem.Price (preços dos serviços do catálogo),
        // a mesma usada em by-category/top-services — NÃO Appointment.Price (que pode ter valor
        // personalizado). Cancelados são excluídos de Total/RevenueTotal (só entram na série própria
        // "Cancelled"), para não inflar demanda nem receita agendada.
        var appointments = await context.Appointments
            .Where(a => a.Start >= start && a.Start <= end)
            .Select(a => new
            {
                a.Start,
                a.Status,
                ServicesPrice = a.ServiceItems.Sum(si => si.Price),
            })
            .ToListAsync();

        var byBucket = appointments
            .GroupBy(a => BucketKey(a.Start, gb))
            .ToDictionary(g => g.Key, g => new
            {
                Total = g.Count(a => a.Status != AppointmentStatus.Cancelado),
                Completed = g.Count(a => a.Status == AppointmentStatus.Concluido),
                Cancelled = g.Count(a => a.Status == AppointmentStatus.Cancelado),
                InProgress = g.Count(a => a.Status == AppointmentStatus.EmAtendimento),
                Pending = g.Count(a => a.Status == AppointmentStatus.Pendente || a.Status == AppointmentStatus.Confirmado),
                RevenueRealized = g.Where(a => a.Status == AppointmentStatus.Concluido).Sum(a => a.ServicesPrice),
                RevenueTotal = g.Where(a => a.Status != AppointmentStatus.Cancelado).Sum(a => a.ServicesPrice),
            });

        var result = new List<AppointmentSummaryPoint>();
        foreach (var (key, label) in EnumerateBuckets(startDate, endDate, gb))
        {
            var bucket = byBucket.GetValueOrDefault(key);
            result.Add(new AppointmentSummaryPoint(
                label,
                bucket?.Total ?? 0,
                bucket?.Completed ?? 0,
                bucket?.Cancelled ?? 0,
                bucket?.InProgress ?? 0,
                bucket?.Pending ?? 0,
                bucket?.RevenueRealized ?? 0m,
                bucket?.RevenueTotal ?? 0m));
        }

        return result;
    }

    public async Task<List<TopServiceResponse>> GetTopServicesAsync(
        DateTime startDate, DateTime endDate, int limit)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // Ordenado por Start desc para que cada grupo use o nome mais recente do serviço
        // (AppointmentServiceItem.ServiceName é snapshot). Agrupado por ServiceId, não por nome —
        // ver docs/auditoria-matematica-relatorios.md Falha #13. Cancelados não contam como "agendado";
        // a receita só soma atendimentos CONCLUÍDOS.
        var appointments = await context.Appointments
            .Where(a => a.Start >= start && a.Start <= end)
            .Include(a => a.ServiceItems)
            .OrderByDescending(a => a.Start)
            .ToListAsync();

        var items = appointments
            .SelectMany(a => a.ServiceItems.Select(si => new { si.ServiceId, si.ServiceName, si.Price, a.Status }))
            .ToList();

        return items
            .GroupBy(i => i.ServiceId)
            .Select(g => new TopServiceResponse(
                g.Key,
                g.First().ServiceName,
                g.Count(i => i.Status != AppointmentStatus.Cancelado),
                g.Where(i => i.Status == AppointmentStatus.Concluido).Sum(i => i.Price)))
            .OrderByDescending(r => r.Revenue)
            .Take(limit)
            .ToList();
    }

    public async Task<List<AppointmentsByEmployeeResponse>> GetAppointmentsByEmployeeAsync(
        DateTime startDate, DateTime endDate)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // Receita = Σ AppointmentServiceItem.Price dos atendimentos CONCLUÍDOS (base oficial, não
        // Appointment.Price); count = agendamentos não cancelados atribuídos ao funcionário.
        var rows = await context.Appointments
            .Where(a => a.Start >= start && a.Start <= end)
            .Select(a => new
            {
                a.EmployeeId,
                a.EmployeeName,
                a.Status,
                ServicesPrice = a.ServiceItems.Sum(si => si.Price),
            })
            .ToListAsync();

        return rows
            .GroupBy(a => new { a.EmployeeId, a.EmployeeName })
            .Select(g => new AppointmentsByEmployeeResponse(
                g.Key.EmployeeId ?? Guid.Empty,
                g.Key.EmployeeName,
                g.Count(a => a.Status != AppointmentStatus.Cancelado),
                g.Where(a => a.Status == AppointmentStatus.Concluido).Sum(a => a.ServicesPrice)))
            .OrderByDescending(r => r.Revenue)
            .ToList();
    }

    public async Task<List<ServiceCategoryRevenueResponse>> GetServiceCategoryRevenueAsync(
        DateTime startDate, DateTime endDate)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // Só atendimentos CONCLUÍDOS (consumo real) — mesmo critério de CustomerService.GetCrmStatsAsync.
        // AppointmentServiceItem só guarda a cor da categoria (snapshot), não o nome → resolve via Service.
        var consumedItems = await context.Appointments
            .Where(a => a.Start >= start && a.Start <= end && a.Status == AppointmentStatus.Concluido)
            .SelectMany(a => a.ServiceItems.Select(si => new { si.ServiceId, si.Price }))
            .ToListAsync();

        var serviceIds = consumedItems.Select(i => i.ServiceId).Distinct().ToList();
        var categoryInfo = await context.Services
            .Where(s => serviceIds.Contains(s.Id))
            .Select(s => new { s.Id, CategoryName = s.Category != null ? s.Category.Name : null, CategoryColor = s.Category != null ? s.Category.Color : null })
            .ToDictionaryAsync(s => s.Id);

        return consumedItems
            .GroupBy(i => categoryInfo.TryGetValue(i.ServiceId, out var info) && info.CategoryName != null
                ? new { Name = info.CategoryName, Color = info.CategoryColor }
                : new { Name = "Sem categoria", Color = (string?)null })
            .Select(g => new ServiceCategoryRevenueResponse(g.Key.Name, g.Sum(i => i.Price), g.Key.Color))
            .OrderByDescending(c => c.Total)
            .ToList();
    }

    public async Task<List<AppointmentPeakHourResponse>> GetAppointmentPeakHoursAsync(
        DateTime startDate, DateTime endDate)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // NOTA (fuso): Start em UTC sem conversão — mesmo caveat sistêmico do resto da aplicação.
        // Só agendamentos não cancelados contam como demanda real por horário.
        var hours = await context.Appointments
            .Where(a => a.Start >= start && a.Start <= end && a.Status != AppointmentStatus.Cancelado)
            .Select(a => a.Start.Hour)
            .ToListAsync();

        var counts = hours.GroupBy(h => h).ToDictionary(g => g.Key, g => g.Count());

        return Enumerable.Range(0, 24)
            .Select(h => new AppointmentPeakHourResponse(h, counts.GetValueOrDefault(h)))
            .ToList();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    // Projeção mínima por venda para alimentar o cálculo financeiro centralizado (SaleFinancials).
    // ItemsTotal soma TODOS os itens (pré-desconto); CountedSubtotal/CountedCost só os itens contáveis.
    private record SaleFinancialProjection(
        DateTime CreatedAt,
        decimal Total,
        decimal Discount,
        decimal FeeAmount,
        decimal ItemsTotal,
        decimal CountedSubtotal,
        decimal CountedCost);

    private static SaleFinancials.SaleProfitParts ToProfitParts(SaleFinancialProjection s) =>
        SaleFinancials.Compute(s.Total, s.Discount, s.ItemsTotal, s.CountedSubtotal, s.CountedCost, s.FeeAmount);

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
