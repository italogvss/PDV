using FluentValidation;
using Moq;
using PDV.Application.DTOs.Credit;
using PDV.Application.Interfaces;
using PDV.Application.Validators;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Services;

namespace PDV.UnitTests.Support.Harness;

// Monta o CreditService. Os validators são REAIS (mockar faria os testes de regra de entrada
// passarem sem exercitar regra nenhuma); o repositório é mock porque o valor dos testes está na
// aritmética de saldo e nas transições de status, não no SQL.
public sealed class CreditHarness
{
    public Mock<ICreditRepository> Repository { get; } = new();
    public Mock<ICustomerRepository> Customers { get; } = new();
    public Mock<ITenantRepository> Tenants { get; } = new();
    public Mock<IAuditLogger> Audit { get; } = new();
    public Mock<IEntitlementService> Entitlements { get; } = new();

    private readonly Mock<ITenantContext> _tenantContext = new();
    private readonly Mock<IUserContext> _userContext = new();

    public Guid TenantId { get; } = Guid.NewGuid();
    public Guid OperatorId { get; } = Guid.NewGuid();

    // Estado capturado no SaveReceipt/SaveReversal — é onde as asserções olham.
    public CreditPayment? SavedPayment { get; private set; }
    public CreditInstallment? SavedInstallment { get; private set; }
    public CreditAccount? SavedAccount { get; private set; }
    public CreditAccount? AddedAccount { get; private set; }
    // A venda salva junto com a conta — é nela que a taxa recalculada (só sobre a entrada) aparece.
    public Sale? AddedAccountSale { get; private set; }
    public bool ReversalSaved { get; private set; }

    public CreditHarness()
    {
        _tenantContext.SetupGet(c => c.TenantId).Returns(TenantId);
        _userContext.SetupGet(c => c.UserId).Returns(OperatorId);
        _userContext.SetupGet(c => c.UserName).Returns("Operador de Teste");

        Repository
            .Setup(r => r.SaveReceiptAsync(It.IsAny<CreditPayment>(), It.IsAny<CreditInstallment>(), It.IsAny<CreditAccount>()))
            .Callback<CreditPayment, CreditInstallment, CreditAccount>((p, i, a) =>
            {
                SavedPayment = p;
                SavedInstallment = i;
                SavedAccount = a;
            })
            .Returns(Task.CompletedTask);

        Repository
            .Setup(r => r.SaveReversalAsync(It.IsAny<CreditPayment>(), It.IsAny<CreditInstallment>(), It.IsAny<CreditAccount>()))
            .Callback<CreditPayment, CreditInstallment, CreditAccount>((p, i, a) =>
            {
                ReversalSaved = true;
                SavedPayment = p;
                SavedInstallment = i;
                SavedAccount = a;
            })
            .Returns(Task.CompletedTask);

        Repository
            .Setup(r => r.AddAccountAsync(It.IsAny<CreditAccount>(), It.IsAny<Sale>()))
            .Callback<CreditAccount, Sale>((a, s) =>
            {
                AddedAccount = a;
                AddedAccountSale = s;
            })
            .Returns(Task.CompletedTask);

        Repository.Setup(r => r.GetPaymentsByAccountAsync(It.IsAny<Guid>()))
            .ReturnsAsync([]);

        // Sem taxa e sem política própria por padrão — os testes que exercitam uma das duas
        // chamam GivenPaymentFees / GivenCreditPolicy, que compartilham o MESMO TenantSettings
        // (chamar as duas não pode fazer uma apagar a outra).
        Tenants.Setup(t => t.GetSettingsAsync(It.IsAny<Guid>()))
            .ReturnsAsync((TenantSettings?)null);
    }

    private TenantSettings? _settings;

    private TenantSettings Settings()
    {
        if (_settings is null)
        {
            _settings = new TenantSettings { TenantId = TenantId };
            Tenants.Setup(t => t.GetSettingsAsync(It.IsAny<Guid>())).ReturnsAsync(_settings);
        }
        return _settings;
    }

    // Liga a cobrança de taxa no tenant. Percentuais em %, como em TenantSettings.
    public void GivenPaymentFees(decimal cash = 0, decimal pix = 0, decimal credit = 0, decimal debit = 0)
    {
        var settings = Settings();
        settings.PaymentFeesEnabled = true;
        settings.PaymentCashFee = cash;
        settings.PaymentPixFee = pix;
        settings.PaymentCardCreditFee = credit;
        settings.PaymentCardDebitFee = debit;
    }

    // Política de crediário da loja (máximo de parcelas e entrada mínima).
    public void GivenCreditPolicy(int maxInstallments = 12, decimal minDownPaymentPercent = 0)
    {
        var settings = Settings();
        settings.CreditMaxInstallments = maxInstallments;
        settings.CreditMinDownPaymentPercent = minDownPaymentPercent;
    }

    // Venda ativa, com cliente — o caminho feliz de origem de um crediário.
    // feeRate simula uma venda já fechada com taxa do método (a taxa incidiu sobre o total inteiro,
    // que é justamente o que abrir crediário tem que corrigir).
    public Sale GivenSale(
        decimal total, Guid? customerId = null, SaleStatus status = SaleStatus.Active, decimal feeRate = 0m)
    {
        var feeAmount = Math.Round(total * (feeRate / 100m), 2);

        var sale = new Sale
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            CustomerId = customerId ?? Guid.NewGuid(),
            CustomerName = "Cliente Teste",
            Total = total,
            FeeRate = feeRate,
            FeeAmount = feeAmount,
            NetAmount = total - feeAmount,
            Status = status,
            OperatorName = "Operador de Teste",
        };

        Repository.Setup(r => r.GetSaleForCreditAsync(sale.Id)).ReturnsAsync(sale);
        Repository.Setup(r => r.GetAccountBySaleIdAsync(sale.Id)).ReturnsAsync((CreditAccount?)null);
        Customers.Setup(c => c.GetByIdAsync(sale.CustomerId!.Value))
            .ReturnsAsync(new Customer { Id = sale.CustomerId!.Value, TenantId = TenantId, Name = "Cliente Teste" });

        return sale;
    }

    // Conta já existente com parcelas, para exercitar baixa/estorno/cancelamento.
    public CreditAccount GivenAccount(
        decimal total, int installmentCount, DateTime firstDueDate, decimal paidAmount = 0)
    {
        var accountId = Guid.NewGuid();
        var plan = PDV.Application.Helpers.CreditInstallmentPlanner.Build(total, installmentCount, firstDueDate);

        var account = new CreditAccount
        {
            Id = accountId,
            TenantId = TenantId,
            SaleId = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            CustomerName = "Cliente Teste",
            TotalAmount = total,
            PaidAmount = paidAmount,
            InstallmentCount = installmentCount,
            FirstDueDate = firstDueDate,
            Status = CreditAccountStatus.Open,
        };

        account.Installments = [.. plan.Select(p => new CreditInstallment
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            CreditAccountId = accountId,
            Account = account,
            Number = p.Number,
            DueDate = p.DueDate,
            Amount = p.Amount,
            Status = CreditInstallmentStatus.Open,
        })];

        Repository.Setup(r => r.GetAccountByIdAsync(accountId)).ReturnsAsync(account);
        foreach (var installment in account.Installments)
            Repository.Setup(r => r.GetInstallmentByIdAsync(installment.Id)).ReturnsAsync(installment);

        return account;
    }

    public CreditPayment GivenPayment(CreditAccount account, CreditInstallment installment, decimal amount)
    {
        var payment = new CreditPayment
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            CreditAccountId = account.Id,
            CreditInstallmentId = installment.Id,
            Installment = installment,
            Amount = amount,
            Method = PaymentMethod.Cash,
            ReceivedAt = DateTime.UtcNow,
            OperatorName = "Operador de Teste",
        };

        Repository.Setup(r => r.GetPaymentByIdAsync(payment.Id)).ReturnsAsync(payment);
        return payment;
    }

    public CreditService Build() =>
        new(Repository.Object,
            Customers.Object,
            Tenants.Object,
            _tenantContext.Object,
            _userContext.Object,
            Audit.Object,
            Entitlements.Object,
            new CreateCreditAccountRequestValidator() as IValidator<CreateCreditAccountRequest>,
            new ReceiveInstallmentRequestValidator() as IValidator<ReceiveInstallmentRequest>);
}
