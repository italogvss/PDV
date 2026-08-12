using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Credit;
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
    ITenantRepository tenantRepository,
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

        // Vencimento anterior à venda não existe: o carnê nasceria vencido, indo direto para o
        // aging, a inadimplência e os lembretes de cobrança. O DatePicker do PDV já barra, mas
        // POST /credit/accounts não passa por ele. A folga de um dia é o mesmo desencontro
        // UTC × data local do recebimento — a data vem do cliente como data pura.
        if (request.FirstDueDate.Date < sale.CreatedAt.Date.AddDays(-1))
            throw new BusinessException(
                $"O primeiro vencimento não pode ser anterior à data da venda ({sale.CreatedAt:dd/MM/yyyy}).");

        // Política da loja (TenantSettings). Fica aqui, e não no SaleService, para valer nos DOIS
        // pontos de entrada: a venda fiado do PDV e a abertura avulsa por POST /credit/accounts.
        var settings = await tenantRepository.GetSettingsAsync(tenantContext.TenantId);
        if (settings is not null)
        {
            if (request.InstallmentCount > settings.CreditMaxInstallments)
                throw new BusinessException(
                    $"O crediário desta loja aceita no máximo {settings.CreditMaxInstallments} parcelas.");

            var minDownPayment = PaymentFees.AmountFor(sale.Total, settings.CreditMinDownPaymentPercent);
            if (request.DownPayment < minDownPayment)
                throw new BusinessException(
                    $"A entrada mínima é de {settings.CreditMinDownPaymentPercent:0.##}% " +
                    $"(R$ {minDownPayment:0.00}) para esta venda.");
        }

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

        // A venda foi fechada como se tivesse sido paga à vista, então a taxa do método incidiu
        // sobre o total. Virando fiado, só a ENTRADA é capturada por aquele método — o resto vem nas
        // baixas das parcelas, cada uma com a taxa do método escolhido na hora. Sem este recálculo,
        // uma venda no crédito lança taxa de cartão sobre dinheiro que ninguém passou na maquininha.
        sale.FeeAmount = PaymentFees.AmountFor(request.DownPayment, sale.FeeRate);
        sale.NetAmount = sale.Total - sale.FeeAmount;
        sale.UpdatedAt = DateTime.UtcNow;

        await auditLogger.LogCreditAccountCreatedAsync(
            account.Id, account.CustomerName, financed, request.InstallmentCount, account.FirstDueDate);

        await repository.AddAccountAsync(account, sale);

        // Monta a resposta do que acabou de ser criado em vez de reler do banco: quando o
        // SaleService chamar este método dentro da transação da venda, uma releitura veria
        // (ou não) dados ainda não commitados. Não há recebimento numa conta recém-aberta.
        return new CreditAccountDetailResponse(
            MapAccount(account),
            CreditMapper.MapSaleRef(sale),
            CreditMapper.MapInstallments(account),
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
            sale is null ? null : CreditMapper.MapSaleRef(sale),
            CreditMapper.MapInstallments(account),
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

        // As duas guardas comparam uma data LOCAL (escolhida pelo operador, vem do cliente como
        // data pura) com uma data UTC (CreatedAt/UtcNow). Não há fuso do tenant no sistema para
        // reconciliar as duas, e a diferença é de no máximo um dia de calendário — daí a folga.
        //
        // Sem ela, a loja que fecha à noite não conseguia receber: em BRT (UTC−3) uma venda das
        // 21h nasce com CreatedAt já no dia seguinte em UTC, e a baixa feita na mesma noite batia
        // em "data anterior à abertura do crediário" citando uma data FUTURA na mensagem.
        const int TimezoneSkewDays = 1;

        if (receivedAt.Date > DateTime.UtcNow.Date.AddDays(TimezoneSkewDays))
            throw new BusinessException("A data do recebimento não pode estar no futuro.");

        // Piso: sem ele dá para datar uma baixa antes da própria venda e jogar caixa para um
        // período já fechado — o relatório do mês passado mudaria depois de fechado.
        var openedOn = account.CreatedAt.Date.AddDays(-TimezoneSkewDays);
        if (receivedAt.Date < openedOn)
            throw new BusinessException(
                $"A data do recebimento não pode ser anterior à abertura do crediário ({openedOn:dd/MM/yyyy}).");

        var method = Enum.Parse<PaymentMethod>(request.Method);

        // Taxa congelada por baixa: quem paga a parcela escolhe o método na hora, então a taxa real
        // do crediário só é conhecida aqui (a da venda cobre apenas a entrada).
        var settings = await tenantRepository.GetSettingsAsync(tenantContext.TenantId);
        var feeRate = PaymentFees.RateFor(settings, method);

        var payment = new CreditPayment
        {
            TenantId = tenantContext.TenantId,
            CreditAccountId = account.Id,
            CreditInstallmentId = installment.Id,
            Amount = request.Amount,
            Method = method,
            FeeRate = feeRate,
            FeeAmount = PaymentFees.AmountFor(request.Amount, feeRate),
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

        // Conta cancelada não tem cobrança viva: estornar aqui mexeria no saldo de algo que já foi
        // baixado como perda, sem reabrir parcela nenhuma.
        if (account.Status == CreditAccountStatus.Cancelled)
            throw new BusinessException(
                "Este crediário está cancelado. Não é possível estornar recebimentos de uma conta cancelada.");

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
        // Data da baixa: é ela que posiciona a PERDA no bucket certo do relatório (UpdatedAt não
        // serve — muda a cada alteração da conta).
        account.CancelledAt = DateTime.UtcNow;
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
            TotalReceivable: CreditAnalytics.TotalReceivable(openInstallments),
            OverdueAmount: overdue.Sum(CreditAnalytics.Balance),
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

        // Buckets, top devedores e inadimplência vivem em CreditAnalytics — a seção Crediário dos
        // Relatórios serve exatamente os mesmos números, com outro gate de plano.
        return CreditAnalytics.BuildAging(openInstallments, DateTime.UtcNow.Date);
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
    // Delegado a CreditMapper (PDV.Application/Helpers): o SaleService usa os mesmos mapas
    // para expor o crediário dentro da venda, e a regra de "vencida" precisa ser única.

    private static CreditAccountResponse MapAccount(CreditAccount a) => CreditMapper.MapAccount(a);

    private static CreditInstallmentResponse MapInstallment(CreditInstallment i, CreditAccount? account) =>
        CreditMapper.MapInstallment(i, account);

    private static CreditPaymentResponse MapPayment(CreditPayment p) => CreditMapper.MapPayment(p);
}
