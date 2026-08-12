using System.Text;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Credit;
using PDV.Application.DTOs.Reports;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class ReportService(AppDbContext context, IStorageService storage) : IReportService
{
    public async Task<List<FinancialSummaryPoint>> GetFinancialSummaryAsync(
        DateTime startDate, DateTime endDate, string groupBy, string basis)
    {
        var gb = groupBy.ToLower();
        if (gb is not ("day" or "week" or "month" or "year"))
            throw new BusinessException("Parâmetro groupBy inválido. Use: day, week, month ou year.");

        var cash = ParseBasis(basis);

        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // NOTA (fuso): CreatedAt é gravado em UTC e aqui é filtrado/agrupado sem conversão de fuso,
        // igual ao resto da aplicação (ExpenseService.GetChartAsync). Vendas perto da meia-noite podem
        // cair no dia/bucket vizinho. Corrigir exige normalizar o fuso do tenant em toda a aplicação.
        var events = await BuildSaleEventsAsync(start, end, cash);

        // Despesas seguem o MESMO regime das vendas:
        // - accrual (competência): pela data de vencimento (DueDate), todas as despesas do período.
        // - cash (caixa): pela data de pagamento (PaidAt), só as despesas efetivamente pagas.
        var expenses = cash
            ? await context.Expenses
                .Where(e => e.IsPaid && e.PaidAt != null && e.PaidAt >= start && e.PaidAt <= end)
                .Select(e => new { Date = e.PaidAt!.Value, e.Amount })
                .ToListAsync()
            : await context.Expenses
                .Where(e => e.DueDate >= start && e.DueDate <= end)
                .Select(e => new { Date = e.DueDate, e.Amount })
                .ToListAsync();

        var salesByBucket = events
            .GroupBy(e => BucketKey(e.Date, gb))
            .ToDictionary(g => g.Key, g => (
                Revenue: g.Sum(e => e.Parts.Revenue),
                Cost: g.Sum(e => e.Parts.Cost),
                Fees: g.Sum(e => e.Parts.Fees),
                GrossProfit: g.Sum(e => e.Parts.GrossProfit)));

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

        // Recebido/a receber DAS VENDAS DO PERÍODO (não "dinheiro que entrou no período"): a
        // pergunta aqui é quanto do que foi vendido já virou caixa. Uma parcela baixada depois do
        // período conta como recebida — a venda é a mesma.
        var creditSales = await context.CreditAccounts
            .Where(a => a.Sale!.Status == SaleStatus.Active
                     && a.Sale.CreatedAt >= start
                     && a.Sale.CreatedAt <= end)
            .Select(a => new
            {
                SaleTotal = a.Sale!.Total,
                a.DownPayment,
                a.PaidAmount,
                // Saldo cobrável: parcela cancelada virou perda, não é mais "a receber".
                Outstanding = a.Installments
                    .Where(i => i.Status == CreditInstallmentStatus.Open)
                    .Sum(i => i.Amount - i.PaidAmount),
            })
            .ToListAsync();

        // O que ainda não entrou inclui o que nunca vai entrar (saldo de conta cancelada) — por isso
        // não é simplesmente o Outstanding.
        var notReceived = creditSales.Sum(c => c.SaleTotal - c.DownPayment - c.PaidAmount);

        return new SalesMetricsResponse(
            totalSales, totalRevenue, averageTicket, label,
            ReceivedRevenue: totalRevenue - notReceived,
            OutstandingRevenue: creditSales.Sum(c => c.Outstanding));
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

    // Rótulo da fatia de crediário. Não é um PaymentMethod do enum de propósito: o fiado não é uma
    // forma de pagamento, é a AUSÊNCIA de pagamento no ato — quem paga escolhe o método na baixa.
    private const string CreditSliceKey = "Credit";

    public async Task<List<SalesByPaymentMethodResponse>> GetSalesByPaymentMethodAsync(
        DateTime startDate, DateTime endDate, string basis)
    {
        var cash = ParseBasis(basis);

        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);

        // Sale.PaymentMethod é o método escolhido no PDV. Numa venda fiado ele descreve só a
        // ENTRADA — o restante não passou por método nenhum ainda. Somar Sale.Total inteiro nele
        // (comportamento antigo) fazia uma venda a prazo aparecer como dinheiro em caixa.
        var sales = await context.Sales
            .Where(s => s.Status == SaleStatus.Active
                     && s.CreatedAt >= start
                     && s.CreatedAt <= end)
            .Select(s => new
            {
                s.PaymentMethod,
                s.Total,
                DownPayment = context.CreditAccounts
                    .Where(a => a.SaleId == s.Id)
                    .Select(a => (decimal?)a.DownPayment)
                    .FirstOrDefault(),
            })
            .ToListAsync();

        // (chave, valor, conta como venda?) — só a linha principal da venda conta no COUNT, para o
        // total do gráfico bater com o KPI "Total de vendas".
        //
        // A igualdade vale em COMPETÊNCIA, onde toda venda do período gera exatamente uma linha
        // contável (o método da entrada, ou a fatia Crediário quando não houve entrada). Em CAIXA
        // ela não vale nem deveria: uma venda fiado sem entrada não movimentou caixa nenhum no
        // período e por isso não aparece, e as baixas de parcela entram como dinheiro sem serem
        // vendas novas.
        var slices = new List<(string Key, decimal Amount, bool CountsAsSale)>();

        foreach (var sale in sales)
        {
            if (sale.DownPayment is null)
            {
                slices.Add((sale.PaymentMethod.ToString(), sale.Total, true));
                continue;
            }

            if (sale.DownPayment.Value > 0)
                slices.Add((sale.PaymentMethod.ToString(), sale.DownPayment.Value, true));

            // Em competência a parte financiada aparece como "Crediário" (foi faturada, ainda não
            // capturada). Em caixa ela simplesmente não existe até a baixa acontecer.
            var financed = sale.Total - sale.DownPayment.Value;
            if (!cash && financed > 0)
                slices.Add((CreditSliceKey, financed, sale.DownPayment.Value == 0));
        }

        // Baixas de parcela: cada uma pelo método com que o dinheiro entrou de fato. Só existem no
        // regime de caixa — em competência a receita delas já foi contada na data da venda.
        if (cash)
        {
            var receipts = await ActiveSaleCreditPayments()
                .Where(p => p.ReceivedAt >= start && p.ReceivedAt <= end)
                .Select(p => new { p.Method, p.Amount })
                .ToListAsync();

            slices.AddRange(receipts.Select(r => (r.Method.ToString(), r.Amount, false)));
        }

        return [.. slices
            .GroupBy(s => s.Key)
            .Select(g => new SalesByPaymentMethodResponse(
                g.Key,
                g.Sum(s => s.Amount),
                g.Count(s => s.CountsAsSale)))
            .OrderByDescending(r => r.Total)];
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

        // Saldo devedor vivo por cliente. É a posição de HOJE, não do período: dívida não é um fato
        // do intervalo consultado, e sem ela o ranking premia quem só levou fiado.
        var outstandingByCustomer = await context.CreditInstallments
            .Where(i => i.Status == CreditInstallmentStatus.Open)
            .GroupBy(i => i.Account!.CustomerId)
            .Select(g => new { CustomerId = g.Key, Balance = g.Sum(i => i.Amount - i.PaidAmount) })
            .ToDictionaryAsync(x => x.CustomerId, x => x.Balance);

        // Agrupa por CustomerId (não por nome) — nome vem do Customer vivo, não do snapshot
        // Sale.CustomerName, então clientes homônimos com Ids diferentes não se fundem.
        return rows
            .GroupBy(s => new { s.CustomerId, s.CustomerName })
            .Select(g => new TopCustomerResponse(
                g.Key.CustomerId!.Value,
                g.Key.CustomerName,
                g.Count(),
                g.Sum(s => s.Total),
                outstandingByCustomer.GetValueOrDefault(g.Key.CustomerId!.Value)))
            .OrderByDescending(r => r.TotalRevenue)
            .Take(limit)
            .ToList();
    }

    // ─── Crediário na página de Relatórios ──────────────────────────────────
    // Mesmos números do painel da tela de Crediário (CreditAnalytics é a fonte única), servidos sob
    // o gate de Relatórios para a página não depender do módulo Crediário — mesmo padrão de
    // GetEmployeesListAsync/GetCustomersListAsync.

    public async Task<CreditReportSummaryResponse> GetCreditSummaryAsync(DateTime startDate, DateTime endDate)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);
        var today = DateTime.UtcNow.Date;

        var openInstallments = await context.CreditInstallments
            .Include(i => i.Account)
            .Where(i => i.Status == CreditInstallmentStatus.Open)
            .ToListAsync();

        // Faturado a prazo no período = parte financiada das vendas fiado do período (a entrada é
        // pagamento à vista, não crediário).
        var invoiced = await context.CreditAccounts
            .Where(a => a.Sale!.Status == SaleStatus.Active
                     && a.Sale.CreatedAt >= start
                     && a.Sale.CreatedAt <= end)
            .SumAsync(a => (decimal?)a.TotalAmount) ?? 0m;

        var received = await ActiveSaleCreditPayments()
            .Where(p => p.ReceivedAt >= start && p.ReceivedAt <= end)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var downPayments = await context.CreditAccounts
            .Where(a => a.Sale!.Status == SaleStatus.Active
                     && a.Sale.CreatedAt >= start
                     && a.Sale.CreatedAt <= end)
            .SumAsync(a => (decimal?)a.DownPayment) ?? 0m;

        // Perda: o que ficou de pé quando a cobrança foi encerrada. Datada por CancelledAt.
        var writtenOff = await context.CreditAccounts
            .Where(a => a.Status == CreditAccountStatus.Cancelled
                     && a.CancelledAt != null
                     && a.CancelledAt >= start
                     && a.CancelledAt <= end)
            .SumAsync(a => (decimal?)(a.TotalAmount - a.PaidAmount)) ?? 0m;

        var totalReceivable = CreditAnalytics.TotalReceivable(openInstallments);
        var overdue = CreditAnalytics.OverdueAmount(openInstallments, today);

        return new CreditReportSummaryResponse(
            Invoiced: invoiced,
            Received: received + downPayments,
            Outstanding: totalReceivable,
            Overdue: overdue,
            WrittenOff: writtenOff,
            DefaultRate: CreditAnalytics.DefaultRate(totalReceivable, overdue),
            OpenAccounts: openInstallments.Select(i => i.CreditAccountId).Distinct().Count(),
            OverdueInstallments: openInstallments.Count(i => i.DueDate.Date < today));
    }

    public async Task<CreditAgingResponse> GetCreditAgingAsync()
    {
        var openInstallments = await context.CreditInstallments
            .Include(i => i.Account)
            .Where(i => i.Status == CreditInstallmentStatus.Open)
            .ToListAsync();

        return CreditAnalytics.BuildAging(openInstallments, DateTime.UtcNow.Date);
    }

    public async Task<List<ReceivableSchedulePoint>> GetReceivableScheduleAsync(
        DateTime startDate, DateTime endDate, string groupBy)
    {
        var gb = groupBy.ToLower();
        if (gb is not ("day" or "week" or "month" or "year"))
            throw new BusinessException("Parâmetro groupBy inválido. Use: day, week, month ou year.");

        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);
        var today = DateTime.UtcNow.Date;

        // Único gráfico do módulo que olha para o FUTURO: a data é o VENCIMENTO da parcela, não a
        // da venda nem a do recebimento.
        var installments = await context.CreditInstallments
            .Where(i => i.Status == CreditInstallmentStatus.Open
                     && i.DueDate >= start
                     && i.DueDate <= end)
            .Select(i => new { i.DueDate, Balance = i.Amount - i.PaidAmount })
            .ToListAsync();

        var byBucket = installments
            .GroupBy(i => BucketKey(i.DueDate, gb))
            .ToDictionary(g => g.Key, g => new
            {
                Due = g.Sum(i => i.Balance),
                Overdue = g.Where(i => i.DueDate.Date < today).Sum(i => i.Balance),
                Count = g.Count(),
            });

        var result = new List<ReceivableSchedulePoint>();
        foreach (var (key, label) in EnumerateBuckets(startDate, endDate, gb))
        {
            var bucket = byBucket.GetValueOrDefault(key);
            result.Add(new ReceivableSchedulePoint(
                label, bucket?.Due ?? 0m, bucket?.Overdue ?? 0m, bucket?.Count ?? 0));
        }

        return result;
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

        var sales = await ProjectSalesForCsv(
                context.Sales.Where(s => s.CreatedAt >= start && s.CreatedAt <= end))
            .ToListAsync();

        return BuildSalesCsv(sales);
    }

    public async Task<byte[]> ExportAllSalesCsvAsync()
    {
        var sales = await ProjectSalesForCsv(context.Sales).ToListAsync();
        return BuildSalesCsv(sales);
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

    // Uma linha por PARCELA — é o grão que o lojista precisa para conferir a carteira de fiado
    // fora do sistema (e o que sobra utilizável depois de um cancelamento de plano).
    public async Task<byte[]> ExportCreditCsvAsync()
    {
        var installments = await context.CreditInstallments
            .Include(i => i.Account)
            .OrderBy(i => i.DueDate)
            .ThenBy(i => i.Number)
            .ToListAsync();

        return BuildCreditCsv(installments);
    }

    // IgnoreQueryFilters: o tenant está com IsActive = false e os registros ficam ocultos. Sem
    // esta categoria o lojista que cancela sai sem a carteira de fiado — justamente o dado que a
    // retenção transacional de 5 anos existe para preservar (ver DataDeletionService).
    private async Task<byte[]> ExportCreditForTenantAsync(Guid tenantId)
    {
        var installments = await context.CreditInstallments
            .IgnoreQueryFilters()
            .Where(i => i.TenantId == tenantId)
            .Include(i => i.Account)
            .OrderBy(i => i.DueDate)
            .ThenBy(i => i.Number)
            .ToListAsync();

        return BuildCreditCsv(installments);
    }

    private static byte[] BuildCreditCsv(List<CreditInstallment> installments)
    {
        var today = DateTime.UtcNow.Date;

        var sb = new StringBuilder();
        sb.AppendLine("Cliente,Venda,Entrada,Situação da Conta,Parcela,Vencimento,Valor,Pago,Saldo,Status,Dias em Atraso");

        foreach (var i in installments)
        {
            var isOverdue = i.Status == CreditInstallmentStatus.Open && i.DueDate.Date < today;
            var daysOverdue = isOverdue ? (today - i.DueDate.Date).Days : 0;
            var status = isOverdue ? "Vencida" : i.Status switch
            {
                CreditInstallmentStatus.Paid => "Paga",
                CreditInstallmentStatus.Cancelled => "Cancelada",
                _ => "Em aberto",
            };

            // Parcela cancelada não é cobrável: sai com saldo ZERO para que somar a coluna "Saldo"
            // dê o recebível de verdade. Com o saldo bruto, a planilha inflava a carteira.
            var balance = i.Status == CreditInstallmentStatus.Cancelled ? 0m : i.Amount - i.PaidAmount;

            var accountStatus = i.Account?.Status switch
            {
                CreditAccountStatus.Paid => "Quitada",
                CreditAccountStatus.Cancelled => "Cancelada",
                CreditAccountStatus.Open => "Em aberto",
                _ => "",
            };

            sb.AppendLine(
                $"{CsvField(i.Account?.CustomerName ?? "")}," +
                $"{i.Account?.SaleId}," +
                $"{i.Account?.DownPayment ?? 0m:F2}," +
                $"{accountStatus}," +
                $"{i.Number}/{i.Account?.InstallmentCount ?? 0}," +
                $"{i.DueDate:dd/MM/yyyy}," +
                $"{i.Amount:F2}," +
                $"{i.PaidAmount:F2}," +
                $"{balance:F2}," +
                $"{status}," +
                $"{daysOverdue}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportBillingCsvAsync()
    {
        // Serviços + produtos com custo entram no lucro; produtos sem custo ficam de fora e o desconto
        // é rateado — tudo centralizado em SaleFinancials (mesma matemática do GetFinancialSummaryAsync).
        var accrualEvents = await BuildSaleEventsAsync(null, null, cash: false);

        // Em caixa, Revenue reconhecida == dinheiro que entrou (ratio × Total = valor recebido),
        // então a coluna "Recebido no mês" sai direto dos eventos de caixa.
        var cashEvents = await BuildSaleEventsAsync(null, null, cash: true);

        var expenses = await context.Expenses
            .Select(e => new { e.DueDate, e.Amount })
            .ToListAsync();

        // Saldo em aberto atribuído ao mês da VENDA — responde "quanto do que vendi naquele mês
        // ainda não recebi", que é outra pergunta (e outro eixo) do "recebido no mês".
        var openBalances = await context.CreditInstallments
            .Where(i => i.Status == CreditInstallmentStatus.Open
                     && i.Account!.Sale!.Status == SaleStatus.Active)
            .Select(i => new { SaleDate = i.Account!.Sale!.CreatedAt, Balance = i.Amount - i.PaidAmount })
            .ToListAsync();

        var salesByMonth = accrualEvents
            .GroupBy(e => FirstOfMonth(e.Date))
            .ToDictionary(g => g.Key, g => (
                Revenue: g.Sum(e => e.Parts.Revenue),
                Cost: g.Sum(e => e.Parts.Cost),
                Fees: g.Sum(e => e.Parts.Fees),
                GrossProfit: g.Sum(e => e.Parts.GrossProfit)));

        var receivedByMonth = cashEvents
            .GroupBy(e => FirstOfMonth(e.Date))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Parts.Revenue));

        var receivableByMonth = openBalances
            .GroupBy(b => FirstOfMonth(b.SaleDate))
            .ToDictionary(g => g.Key, g => g.Sum(b => b.Balance));

        var expensesByMonth = expenses
            .GroupBy(e => FirstOfMonth(e.DueDate))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        var allMonths = salesByMonth.Keys
            .Union(expensesByMonth.Keys)
            .Union(receivedByMonth.Keys)
            .Union(receivableByMonth.Keys)
            .OrderBy(d => d)
            .ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Mês,Receita,Recebido no Mês,A Receber (vendas do mês),Custo,Taxas,Despesas,Lucro Bruto,Resultado Líquido");

        foreach (var month in allMonths)
        {
            var (revenue, cost, fees, grossProfit) = salesByMonth.GetValueOrDefault(month);
            var expTotal = expensesByMonth.GetValueOrDefault(month);
            var netResult = grossProfit - fees - expTotal;
            sb.AppendLine(
                $"{month:MM/yyyy}," +
                $"{revenue:F2}," +
                $"{receivedByMonth.GetValueOrDefault(month):F2}," +
                $"{receivableByMonth.GetValueOrDefault(month):F2}," +
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
            "credit"    => await ExportCreditForTenantAsync(tenantId),
            "team"      => await ExportTeamForTenantAsync(tenantId),
            _           => throw new BusinessException("Categoria de exportação inválida."),
        };
    }

    private async Task<byte[]> ExportAllSalesForTenantAsync(Guid tenantId)
    {
        // Mesmas colunas do export do tenant vivo (BuildSalesCsv), mas com IgnoreQueryFilters em
        // cada fonte — inclusive nas contas de crediário, que também estão ocultas.
        var sales = await context.Sales
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SaleCsvRow(
                s.Id, s.CreatedAt, s.OperatorName, s.CustomerName, s.PaymentMethod, s.Status, s.Total,
                context.CreditAccounts.IgnoreQueryFilters().Where(a => a.SaleId == s.Id)
                    .Select(a => (decimal?)a.DownPayment).FirstOrDefault(),
                context.CreditAccounts.IgnoreQueryFilters().Where(a => a.SaleId == s.Id)
                    .Select(a => a.PaidAmount).FirstOrDefault(),
                context.CreditAccounts.IgnoreQueryFilters().Where(a => a.SaleId == s.Id)
                    .SelectMany(a => a.Installments)
                    .Where(i => i.Status == CreditInstallmentStatus.Open)
                    .Sum(i => i.Amount - i.PaidAmount)))
            .ToListAsync();

        return BuildSalesCsv(sales);
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
        // Competência, como o irmão de tenant vivo. Não reconstrói o regime de caixa aqui: este
        // export existe para o tenant levar os dados embora, e o que falta receber vai na coluna
        // "A Receber" — mais útil, num CSV, do que uma segunda visão da mesma receita.
        var sales = await context.Sales
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId && s.Status == SaleStatus.Active)
            .Select(s => new SaleFinancialProjection(
                s.Id,
                s.CreatedAt,
                s.Total,
                s.Discount,
                s.FeeAmount,
                s.Items.Sum(i => i.Subtotal),
                s.Items.Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue).Sum(i => i.Subtotal),
                s.Items.Where(i => i.ServiceId != null || i.PurchasePriceSnapshot.HasValue).Sum(i => (i.PurchasePriceSnapshot ?? 0m) * i.Quantity),
                context.CreditAccounts.IgnoreQueryFilters()
                    .Where(a => a.SaleId == s.Id)
                    .Select(a => (decimal?)a.DownPayment)
                    .FirstOrDefault()))
            .ToListAsync();

        var expenses = await context.Expenses
            .IgnoreQueryFilters()
            .Where(e => e.TenantId == tenantId)
            .Select(e => new { e.DueDate, e.Amount })
            .ToListAsync();

        // IgnoreQueryFilters: o tenant está com IsActive = false, os registros ficam ocultos.
        var openBalances = await context.CreditInstallments
            .IgnoreQueryFilters()
            .Where(i => i.TenantId == tenantId
                     && i.Status == CreditInstallmentStatus.Open
                     && i.Account!.Sale!.Status == SaleStatus.Active)
            .Select(i => new { SaleDate = i.Account!.Sale!.CreatedAt, Balance = i.Amount - i.PaidAmount })
            .ToListAsync();

        var salesByMonth = sales.GroupBy(s => FirstOfMonth(s.CreatedAt))
            .ToDictionary(g => g.Key, g =>
            {
                var parts = g.Select(ToProfitParts).ToList();
                return (Revenue: parts.Sum(p => p.Revenue), Cost: parts.Sum(p => p.Cost), Fees: parts.Sum(p => p.Fees), GrossProfit: parts.Sum(p => p.GrossProfit));
            });
        var expensesByMonth = expenses.GroupBy(e => FirstOfMonth(e.DueDate))
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));
        var receivableByMonth = openBalances.GroupBy(b => FirstOfMonth(b.SaleDate))
            .ToDictionary(g => g.Key, g => g.Sum(b => b.Balance));

        var allMonths = salesByMonth.Keys
            .Union(expensesByMonth.Keys)
            .Union(receivableByMonth.Keys)
            .OrderBy(d => d)
            .ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Mês,Receita,A Receber (vendas do mês),Custo,Taxas,Despesas,Lucro Bruto,Resultado Líquido");
        foreach (var month in allMonths)
        {
            var (revenue, cost, fees, grossProfit) = salesByMonth.GetValueOrDefault(month);
            var expTotal = expensesByMonth.GetValueOrDefault(month);
            sb.AppendLine($"{month:MM/yyyy},{revenue:F2},{receivableByMonth.GetValueOrDefault(month):F2}," +
                          $"{cost:F2},{fees:F2},{expTotal:F2},{grossProfit:F2},{grossProfit - fees - expTotal:F2}");
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
    // CreditDownPayment é null quando a venda NÃO é fiado — é assim que todo relatório distingue
    // uma coisa da outra (não existe flag na Sale; a fonte é a relação 1:1 com CreditAccount).
    private record SaleFinancialProjection(
        Guid SaleId,
        DateTime CreatedAt,
        decimal Total,
        decimal Discount,
        decimal FeeAmount,
        decimal ItemsTotal,
        decimal CountedSubtotal,
        decimal CountedCost,
        decimal? CreditDownPayment);

    private static SaleFinancials.SaleProfitParts ToProfitParts(SaleFinancialProjection s) =>
        SaleFinancials.Compute(s.Total, s.Discount, s.ItemsTotal, s.CountedSubtotal, s.CountedCost, s.FeeAmount);

    // Um reconhecimento de venda num instante: a venda inteira (competência) ou o pedaço
    // correspondente a uma entrada de dinheiro (caixa).
    private readonly record struct SaleEvent(DateTime Date, SaleFinancials.SaleProfitParts Parts);

    private static bool ParseBasis(string basis) => basis.ToLower() switch
    {
        "cash"    => true,
        "accrual" => false,
        _ => throw new BusinessException("Parâmetro basis inválido. Use: accrual ou cash."),
    };

    // Recebimentos de crediário cuja venda de origem continua ATIVA. CreditPayment não tem
    // navegação para a venda — o vínculo é CreditPayment → CreditAccount → Sale.
    //
    // Todo lugar que soma recebimento precisa passar por aqui: enquanto cada superfície decidia
    // sozinha se olhava o status da venda, o mesmo recebimento entrava no KPI de crediário e
    // sumia do resumo financeiro em Caixa. SaleService.CancelAsync já impede que uma venda com
    // dinheiro recebido seja cancelada, então na prática este filtro não descarta nada — é a
    // rede que garante que as superfícies não voltem a divergir.
    private IQueryable<CreditPayment> ActiveSaleCreditPayments() =>
        context.CreditPayments.Where(p => context.CreditAccounts
            .Any(a => a.Id == p.CreditAccountId && a.Sale!.Status == SaleStatus.Active));

    // Subquery correlacionada em CreditAccounts (respeita o filtro global de tenant) para saber, em
    // uma query só, se a venda virou crediário e qual foi a entrada.
    private IQueryable<SaleFinancialProjection> ProjectSales(IQueryable<Sale> sales) =>
        sales.Select(s => new SaleFinancialProjection(
            s.Id,
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
                .Sum(i => (i.PurchasePriceSnapshot ?? 0m) * i.Quantity),
            context.CreditAccounts
                .Where(a => a.SaleId == s.Id)
                .Select(a => (decimal?)a.DownPayment)
                .FirstOrDefault()));

    /// <summary>
    /// Traduz o período em eventos de reconhecimento, que é o que os buckets somam.
    ///
    /// <para><b>Competência</b> — um evento por venda ativa do período, valendo a venda inteira.
    /// É o comportamento histórico do módulo.</para>
    ///
    /// <para><b>Caixa</b> — um evento por entrada de dinheiro: venda à vista reconhece 100% na data
    /// da venda; venda fiado reconhece a ENTRADA na data da venda e cada baixa de parcela na data do
    /// recebimento (inclusive de vendas de períodos anteriores — é aí que o crediário aparece).
    /// A proporção sai de <c>SaleFinancials.Recognize</c>; taxa nunca é rateada, cada uma entra na
    /// data do seu fato gerador.</para>
    /// </summary>
    /// <param name="start">Início do período; null = sem piso (usado pela exportação de faturamento).</param>
    /// <param name="end">Fim do período; null = sem teto.</param>
    private async Task<List<SaleEvent>> BuildSaleEventsAsync(DateTime? start, DateTime? end, bool cash)
    {
        var activeSales = context.Sales.Where(s => s.Status == SaleStatus.Active);

        var salesInPeriod = activeSales;
        if (start.HasValue) salesInPeriod = salesInPeriod.Where(s => s.CreatedAt >= start.Value);
        if (end.HasValue) salesInPeriod = salesInPeriod.Where(s => s.CreatedAt <= end.Value);

        var inPeriod = await ProjectSales(salesInPeriod).ToListAsync();

        var events = new List<SaleEvent>(inPeriod.Count);

        foreach (var sale in inPeriod)
        {
            var parts = ToProfitParts(sale);

            if (!cash || sale.CreditDownPayment is null)
            {
                // Competência (qualquer venda) ou caixa de venda à vista: reconhece tudo na data da venda.
                events.Add(new SaleEvent(sale.CreatedAt, parts));
                continue;
            }

            // Caixa de venda fiado: só a entrada entrou no ato. A taxa da venda também incide só
            // sobre a entrada (recalculada em CreditService.CreateForSaleAsync), então entra inteira.
            var recognized = SaleFinancials.Recognize(parts, sale.CreditDownPayment.Value, sale.Total);
            events.Add(new SaleEvent(sale.CreatedAt, recognized with { Fees = sale.FeeAmount }));
        }

        // Baixas de parcela recebidas no período. A venda de origem pode ser de qualquer época,
        // mas precisa estar ATIVA: o join com activeSales descarta recebimento de venda cancelada
        // nos DOIS regimes. Antes o descarte só existia no ramo de caixa, e em competência a taxa
        // de um recebimento órfão continuava entrando no resultado.
        var paymentsInPeriod = ActiveSaleCreditPayments();
        if (start.HasValue) paymentsInPeriod = paymentsInPeriod.Where(p => p.ReceivedAt >= start.Value);
        if (end.HasValue) paymentsInPeriod = paymentsInPeriod.Where(p => p.ReceivedAt <= end.Value);

        var receipts = await (
            from payment in paymentsInPeriod
            join account in context.CreditAccounts on payment.CreditAccountId equals account.Id
            join sale in activeSales on account.SaleId equals sale.Id
            select new { payment.Amount, payment.FeeAmount, payment.ReceivedAt, account.SaleId })
            .ToListAsync();

        if (receipts.Count == 0)
            return events;

        if (!cash)
        {
            // Em competência a receita da venda já foi reconhecida lá atrás — o que a baixa
            // acrescenta é só a TAXA do método usado no recebimento, que nasce aqui.
            events.AddRange(receipts
                .Where(r => r.FeeAmount != 0)
                .Select(r => new SaleEvent(
                    r.ReceivedAt,
                    new SaleFinancials.SaleProfitParts(0m, 0m, r.FeeAmount, 0m))));
            return events;
        }

        var saleIds = receipts.Select(r => r.SaleId).Distinct().ToList();
        var receiptSales = await ProjectSales(activeSales.Where(s => saleIds.Contains(s.Id)))
            .ToDictionaryAsync(s => s.SaleId);

        foreach (var receipt in receipts)
        {
            // O join já garantiu venda ativa; a guarda cobre só a corrida de a venda ser cancelada
            // entre as duas queries.
            if (!receiptSales.TryGetValue(receipt.SaleId, out var sale))
                continue;

            var recognized = SaleFinancials.Recognize(ToProfitParts(sale), receipt.Amount, sale.Total);
            events.Add(new SaleEvent(receipt.ReceivedAt, recognized with { Fees = receipt.FeeAmount }));
        }

        return events;
    }

    private static DateTime FirstOfMonth(DateTime date) => new(date.Year, date.Month, 1);

    // Linha do CSV de vendas. Recebido/saldo saem da conta de crediário quando houver — sem isso a
    // planilha não distingue uma venda paga de um fiado em aberto.
    private record SaleCsvRow(
        Guid Id,
        DateTime CreatedAt,
        string OperatorName,
        string? CustomerName,
        PaymentMethod PaymentMethod,
        SaleStatus Status,
        decimal Total,
        decimal? DownPayment,
        decimal CreditPaid,
        decimal CreditOutstanding);

    private IQueryable<SaleCsvRow> ProjectSalesForCsv(IQueryable<Sale> sales) =>
        sales
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SaleCsvRow(
                s.Id,
                s.CreatedAt,
                s.OperatorName,
                s.CustomerName,
                s.PaymentMethod,
                s.Status,
                s.Total,
                context.CreditAccounts.Where(a => a.SaleId == s.Id)
                    .Select(a => (decimal?)a.DownPayment).FirstOrDefault(),
                context.CreditAccounts.Where(a => a.SaleId == s.Id)
                    .Select(a => a.PaidAmount).FirstOrDefault(),
                context.CreditAccounts.Where(a => a.SaleId == s.Id)
                    .SelectMany(a => a.Installments)
                    .Where(i => i.Status == CreditInstallmentStatus.Open)
                    .Sum(i => i.Amount - i.PaidAmount)));

    private static byte[] BuildSalesCsv(List<SaleCsvRow> sales)
    {
        var sb = new StringBuilder();
        sb.AppendLine("ID,Data,Operador,Cliente,Forma de Pagamento,Crediário,Status,Total,Recebido,A Receber");

        foreach (var s in sales)
        {
            var status = s.Status == SaleStatus.Active ? "Ativa" : "Cancelada";
            var isCredit = s.DownPayment.HasValue;
            // Venda à vista: recebido = total. Fiado: entrada + baixas de parcela.
            // Venda cancelada não reteve dinheiro (o cancelamento exige estorno antes).
            var received = s.Status == SaleStatus.Cancelled
                ? 0m
                : isCredit ? s.DownPayment!.Value + s.CreditPaid : s.Total;

            sb.AppendLine(
                $"{s.Id}," +
                $"{s.CreatedAt:dd/MM/yyyy HH:mm}," +
                $"{CsvField(s.OperatorName)}," +
                $"{CsvField(s.CustomerName)}," +
                $"{s.PaymentMethod}," +
                $"{(isCredit ? "Sim" : "Não")}," +
                $"{status}," +
                $"{s.Total:F2}," +
                $"{received:F2}," +
                $"{s.CreditOutstanding:F2}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

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
