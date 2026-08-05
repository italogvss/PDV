using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Credit;
using PDV.Application.DTOs.Sales;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class CreditService(
    ICreditRepository repository,
    ICustomerRepository customerRepository,
    ITenantContext tenantContext,
    IUserContext userContext,
    IAuditLogger auditLogger,
    IEntitlementService entitlementService,
    IValidator<CreateCreditAccountRequest> createValidator,
    IValidator<ReceiveInstallmentRequest> receiveValidator) : ICreditService
{
    public async Task<CreditAccountDetailResponse> CreateForSaleAsync(CreateCreditAccountRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var sale = await repository.GetSaleForCreditAsync(request.SaleId)
            ?? throw new NotFoundException("Venda não encontrada.");

        if (sale.Status != SaleStatus.Active)
            throw new BusinessException("Não é possível abrir crediário para uma venda cancelada.");

        if (sale.CustomerId is null)
            throw new BusinessException("A venda precisa estar vinculada a um cliente para virar crediário.");

        if (await repository.GetAccountBySaleIdAsync(request.SaleId) is not null)
            throw new BusinessException("Esta venda já possui um crediário.");

        if (request.DownPayment >= sale.Total)
            throw new BusinessException("A entrada não pode ser igual ou maior que o total da venda.");

        var customer = await customerRepository.GetByIdAsync(sale.CustomerId.Value)
            ?? throw new NotFoundException("Cliente não encontrado.");

        var financed = sale.Total - request.DownPayment;
        var accountId = Guid.NewGuid();

        var account = new CreditAccount
        {
            Id = accountId,
            TenantId = tenantContext.TenantId,
            SaleId = sale.Id,
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            TotalAmount = financed,
            DownPayment = request.DownPayment,
            PaidAmount = 0,
            InstallmentCount = request.InstallmentCount,
            FirstDueDate = request.FirstDueDate.Date,
            Status = CreditAccountStatus.Open,
            Note = request.Note,
            Installments = [.. CreditInstallmentPlanner
                .Build(financed, request.InstallmentCount, request.FirstDueDate)
                .Select(p => new CreditInstallment
                {
                    TenantId = tenantContext.TenantId,
                    CreditAccountId = accountId,
                    Number = p.Number,
                    DueDate = p.DueDate,
                    Amount = p.Amount,
                    PaidAmount = 0,
                    Status = CreditInstallmentStatus.Open,
                })],
        };

        await auditLogger.LogCreditAccountCreatedAsync(
            account.Id, account.CustomerName, financed, request.InstallmentCount, account.FirstDueDate);

        await repository.AddAccountAsync(account);

        // Monta a resposta do que acabou de ser criado em vez de reler do banco: quando o
        // SaleService chamar este método dentro da transação da venda, uma releitura veria
        // (ou não) dados ainda não commitados. Não há recebimento numa conta recém-aberta.
        return new CreditAccountDetailResponse(
            MapAccount(account),
            MapSaleDetail(sale),
            [.. account.Installments.OrderBy(i => i.Number).Select(i => MapInstallment(i, account))],
            []);
    }

    public async Task<PaginatedResponse<CreditAccountResponse>> GetAccountsAsync(
        CreditFilter filter, int page, int pageSize)
    {
        var (data, totalCount) = await repository.GetAccountsAsync(filter, page, pageSize);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        return new PaginatedResponse<CreditAccountResponse>(
            data.Select(MapAccount), page, pageSize, totalCount, totalPages);
    }

    public async Task<CreditAccountDetailResponse> GetAccountAsync(Guid id)
    {
        var account = await repository.GetAccountByIdAsync(id)
            ?? throw new NotFoundException("Crediário não encontrado.");

        var sale = await repository.GetSaleForCreditAsync(account.SaleId);
        var payments = await repository.GetPaymentsByAccountAsync(account.Id);

        return new CreditAccountDetailResponse(
            MapAccount(account),
            sale is null ? null : MapSaleDetail(sale),
            [.. account.Installments.OrderBy(i => i.Number).Select(i => MapInstallment(i, account))],
            [.. payments.Select(MapPayment)]);
    }

    public async Task<PaginatedResponse<CreditInstallmentResponse>> GetInstallmentsAsync(
        CreditFilter filter, int page, int pageSize)
    {
        var (data, totalCount) = await repository.GetInstallmentsAsync(filter, page, pageSize);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        return new PaginatedResponse<CreditInstallmentResponse>(
            data.Select(i => MapInstallment(i, i.Account)), page, pageSize, totalCount, totalPages);
    }

    public async Task<CreditPaymentResponse> ReceiveAsync(Guid installmentId, ReceiveInstallmentRequest request)
    {
        await receiveValidator.ValidateAndThrowAsync(request);

        var installment = await repository.GetInstallmentByIdAsync(installmentId)
            ?? throw new NotFoundException("Parcela não encontrada.");

        var account = installment.Account
            ?? throw new NotFoundException("Crediário não encontrado.");

        if (installment.Status == CreditInstallmentStatus.Cancelled || account.Status == CreditAccountStatus.Cancelled)
            throw new BusinessException("Esta parcela pertence a um crediário cancelado.");

        if (installment.Status == CreditInstallmentStatus.Paid)
            throw new BusinessException("Esta parcela já está quitada.");

        var balance = installment.Amount - installment.PaidAmount;
        if (request.Amount > balance)
            throw new BusinessException($"O valor recebido não pode ultrapassar o saldo da parcela ({balance:C}).");

        var receivedAt = request.ReceivedAt;
        if (receivedAt.Date > DateTime.UtcNow.Date)
            throw new BusinessException("A data do recebimento não pode estar no futuro.");

        var method = Enum.Parse<PaymentMethod>(request.Method);

        var payment = new CreditPayment
        {
            TenantId = tenantContext.TenantId,
            CreditAccountId = account.Id,
            CreditInstallmentId = installment.Id,
            Amount = request.Amount,
            Method = method,
            ReceivedAt = receivedAt,
            OperatorId = userContext.UserId,
            OperatorName = userContext.UserName,
            Note = request.Note,
        };

        installment.PaidAmount += request.Amount;
        installment.UpdatedAt = DateTime.UtcNow;
        if (installment.PaidAmount >= installment.Amount)
        {
            installment.Status = CreditInstallmentStatus.Paid;
            installment.PaidAt = receivedAt;
        }

        account.PaidAmount += request.Amount;
        account.UpdatedAt = DateTime.UtcNow;
        if (account.PaidAmount >= account.TotalAmount)
        {
            account.Status = CreditAccountStatus.Paid;
            account.SettledAt = receivedAt;
        }

        await auditLogger.LogCreditPaymentReceivedAsync(
            account.Id, account.CustomerName, installment.Number, request.Amount, method);

        await repository.SaveReceiptAsync(payment, installment, account);

        return MapPayment(payment);
    }

    public async Task ReverseAsync(Guid paymentId)
    {
        var payment = await repository.GetPaymentByIdAsync(paymentId)
            ?? throw new NotFoundException("Recebimento não encontrado.");

        var installment = payment.Installment
            ?? throw new NotFoundException("Parcela não encontrada.");

        var account = await repository.GetAccountByIdAsync(payment.CreditAccountId)
            ?? throw new NotFoundException("Crediário não encontrado.");

        installment.PaidAmount -= payment.Amount;
        installment.UpdatedAt = DateTime.UtcNow;
        if (installment.Status == CreditInstallmentStatus.Paid)
        {
            installment.Status = CreditInstallmentStatus.Open;
            installment.PaidAt = null;
        }

        account.PaidAmount -= payment.Amount;
        account.UpdatedAt = DateTime.UtcNow;
        if (account.Status == CreditAccountStatus.Paid)
        {
            account.Status = CreditAccountStatus.Open;
            account.SettledAt = null;
        }

        await auditLogger.LogCreditPaymentReversedAsync(
            account.Id, account.CustomerName, installment.Number, payment.Amount);

        await repository.SaveReversalAsync(payment, installment, account);
    }

    public async Task<CreditAccountResponse> CancelAccountAsync(Guid id)
    {
        var account = await repository.GetAccountByIdAsync(id)
            ?? throw new NotFoundException("Crediário não encontrado.");

        if (account.Status == CreditAccountStatus.Cancelled)
            throw new BusinessException("Este crediário já está cancelado.");

        account.Status = CreditAccountStatus.Cancelled;
        account.UpdatedAt = DateTime.UtcNow;

        // Recebimentos já feitos são preservados — cancelar não devolve dinheiro,
        // apenas encerra a cobrança do saldo restante.
        foreach (var installment in account.Installments.Where(i => i.Status == CreditInstallmentStatus.Open))
        {
            installment.Status = CreditInstallmentStatus.Cancelled;
            installment.UpdatedAt = DateTime.UtcNow;
        }

        await auditLogger.LogCreditAccountCancelledAsync(account.Id, account.CustomerName, account.Balance);

        await repository.UpdateAccountAsync(account);

        return MapAccount(account);
    }

    public async Task<CreditSummaryResponse> GetSummaryAsync()
    {
        var openInstallments = (await repository.GetOpenInstallmentsAsync()).ToList();
        var today = DateTime.UtcNow.Date;

        var monthStart = new DateTime(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
        var receivedThisMonth = await repository.GetReceivedBetweenAsync(monthStart, monthEnd);

        var overdue = openInstallments.Where(i => i.DueDate < today).ToList();

        return new CreditSummaryResponse(
            TotalReceivable: openInstallments.Sum(i => i.Amount - i.PaidAmount),
            OverdueAmount: overdue.Sum(i => i.Amount - i.PaidAmount),
            ReceivedThisMonth: receivedThisMonth,
            CustomersWithBalance: openInstallments
                .Where(i => i.Account is not null)
                .Select(i => i.Account!.CustomerId)
                .Distinct()
                .Count(),
            OpenAccounts: openInstallments.Select(i => i.CreditAccountId).Distinct().Count(),
            OverdueInstallments: overdue.Count);
    }

    public async Task<CreditAgingResponse> GetAgingAsync()
    {
        await entitlementService.RequireEntitlementAsync(EntitlementCatalog.CreditDashboard);

        var openInstallments = (await repository.GetOpenInstallmentsAsync()).ToList();
        var today = DateTime.UtcNow.Date;

        decimal BucketAmount(Func<int, bool> daysPredicate) =>
            openInstallments
                .Where(i => daysPredicate((today - i.DueDate.Date).Days))
                .Sum(i => i.Amount - i.PaidAmount);

        int BucketCount(Func<int, bool> daysPredicate) =>
            openInstallments.Count(i => daysPredicate((today - i.DueDate.Date).Days));

        var buckets = new List<CreditAgingBucket>
        {
            new("A vencer", BucketAmount(d => d <= 0), BucketCount(d => d <= 0)),
            new("1 a 30 dias", BucketAmount(d => d is >= 1 and <= 30), BucketCount(d => d is >= 1 and <= 30)),
            new("31 a 60 dias", BucketAmount(d => d is >= 31 and <= 60), BucketCount(d => d is >= 31 and <= 60)),
            new("61 a 90 dias", BucketAmount(d => d is >= 61 and <= 90), BucketCount(d => d is >= 61 and <= 90)),
            new("Mais de 90 dias", BucketAmount(d => d > 90), BucketCount(d => d > 90)),
        };

        var topDebtors = openInstallments
            .Where(i => i.Account is not null)
            .GroupBy(i => new { i.Account!.CustomerId, i.Account!.CustomerName })
            .Select(g => new CreditTopDebtor(
                g.Key.CustomerId,
                g.Key.CustomerName,
                g.Sum(i => i.Amount - i.PaidAmount),
                g.Where(i => i.DueDate < today).Sum(i => i.Amount - i.PaidAmount),
                g.Select(i => i.CreditAccountId).Distinct().Count()))
            .OrderByDescending(d => d.Balance)
            .Take(10)
            .ToList();

        var totalReceivable = openInstallments.Sum(i => i.Amount - i.PaidAmount);
        var overdueAmount = openInstallments
            .Where(i => i.DueDate < today)
            .Sum(i => i.Amount - i.PaidAmount);

        var defaultRate = totalReceivable > 0
            ? Math.Round(overdueAmount / totalReceivable * 100m, 2)
            : 0m;

        return new CreditAgingResponse(buckets, topDebtors, totalReceivable, overdueAmount, defaultRate);
    }

    public async Task<CreditReminderResponse> GetReminderAsync(Guid installmentId)
    {
        await entitlementService.RequireEntitlementAsync(EntitlementCatalog.CreditReminders);

        var installment = await repository.GetInstallmentByIdAsync(installmentId)
            ?? throw new NotFoundException("Parcela não encontrada.");

        var account = installment.Account
            ?? throw new NotFoundException("Crediário não encontrado.");

        var customer = await customerRepository.GetByIdAsync(account.CustomerId);
        var balance = installment.Amount - installment.PaidAmount;
        var daysOverdue = Math.Max(0, (DateTime.UtcNow.Date - installment.DueDate.Date).Days);

        var message = daysOverdue > 0
            ? $"Olá, {account.CustomerName}! Passando para lembrar da parcela {installment.Number}/{account.InstallmentCount} " +
              $"no valor de {balance:C}, que venceu em {installment.DueDate:dd/MM/yyyy} " +
              $"({daysOverdue} {(daysOverdue == 1 ? "dia" : "dias")} em atraso). Podemos combinar o pagamento?"
            : $"Olá, {account.CustomerName}! Passando para lembrar da parcela {installment.Number}/{account.InstallmentCount} " +
              $"no valor de {balance:C}, com vencimento em {installment.DueDate:dd/MM/yyyy}. Obrigado!";

        return new CreditReminderResponse(
            installment.Id, account.CustomerName, customer?.Phone, balance,
            installment.DueDate, daysOverdue, message);
    }

    // ── Mapeamento ──────────────────────────────────────────────────────────────────────

    private static CreditAccountResponse MapAccount(CreditAccount a)
    {
        var today = DateTime.UtcNow.Date;
        var installments = a.Installments ?? [];
        var open = installments.Where(i => i.Status == CreditInstallmentStatus.Open).ToList();
        var overdue = open.Where(i => i.DueDate < today).ToList();

        return new CreditAccountResponse(
            a.Id, a.SaleId, a.CustomerId, a.CustomerName,
            a.TotalAmount, a.DownPayment, a.PaidAmount, a.TotalAmount - a.PaidAmount,
            a.InstallmentCount,
            installments.Count(i => i.Status == CreditInstallmentStatus.Paid),
            a.FirstDueDate,
            open.OrderBy(i => i.DueDate).Select(i => (DateTime?)i.DueDate).FirstOrDefault(),
            overdue.Count > 0,
            overdue.Count,
            overdue.Sum(i => i.Amount - i.PaidAmount),
            a.Status.ToString(),
            a.SettledAt, a.Note, a.CreatedAt);
    }

    private static CreditInstallmentResponse MapInstallment(CreditInstallment i, CreditAccount? account)
    {
        var today = DateTime.UtcNow.Date;
        var isOverdue = i.Status == CreditInstallmentStatus.Open && i.DueDate.Date < today;

        return new CreditInstallmentResponse(
            i.Id, i.CreditAccountId,
            account?.CustomerId ?? Guid.Empty,
            account?.CustomerName ?? string.Empty,
            i.Number,
            account?.InstallmentCount ?? 0,
            i.DueDate, i.Amount, i.PaidAmount, i.Amount - i.PaidAmount,
            i.PaidAt, i.Status.ToString(),
            isOverdue,
            isOverdue ? (today - i.DueDate.Date).Days : 0);
    }

    private static CreditPaymentResponse MapPayment(CreditPayment p) =>
        new(p.Id, p.CreditAccountId, p.CreditInstallmentId,
            p.Installment?.Number ?? 0,
            p.Amount, p.Method.ToString(), p.ReceivedAt, p.OperatorName, p.Note);

    // Espelha SaleService.MapToDetail — o modal de crediário mostra a venda que originou a conta.
    private static SaleDetailResponse MapSaleDetail(Sale s) =>
        new(s.Id, s.OperatorId, s.OperatorName,
            s.CustomerName, s.CustomerDocument, s.PaymentMethod.ToString(), s.IsInstallment,
            s.InstallmentCount, s.InstallmentValue,
            s.Total, s.Discount, s.Status.ToString(), s.CancelledById, s.CancelledByName, s.CancelledAt, s.CreatedAt,
            [.. s.Items.Select(i => new SaleItemResponse(
                i.Id, i.SaleId, i.ProductId, i.ServiceId,
                i.ProductName, i.UnitPrice, i.PurchasePriceSnapshot, i.Quantity, i.Subtotal))],
            s.AmountPaid, s.AmountPaid - s.Total, s.FeeRate, s.FeeAmount, s.NetAmount);
}
