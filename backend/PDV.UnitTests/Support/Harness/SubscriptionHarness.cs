using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces;
using PDV.Application.Interfaces.Payments;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Services;

namespace PDV.UnitTests.Support.Harness;

// Monta o SubscriptionService. Nove dependências, mas a que importa é o IPaymentGateway: o Stripe
// inteiro está atrás dessa interface, então upgrade, agendamento, cancelamento e estorno são
// testáveis sem tocar a rede.
//
// Por padrão o gateway aceita tudo (preço existe, checkout devolve URL). Os testes sobrescrevem só
// o que estão exercitando — e verificam o que foi CHAMADO nele, porque "cancelou no gateway" é
// metade da regra de negócio.
public sealed class SubscriptionHarness
{
    public Mock<IPlanRepository> Plans { get; } = new();
    public Mock<ISubscriptionRepository> Subscriptions { get; } = new();
    public Mock<IGatewayCustomerRepository> Customers { get; } = new();
    public Mock<IPaymentRepository> Payments { get; } = new();
    public Mock<IUserRepository> Users { get; } = new();
    public Mock<IPaymentGateway> Gateway { get; } = new();
    public Mock<IEntitlementService> Entitlements { get; } = new();

    private readonly Mock<IUserContext> _userContext = new();

    public User User { get; private set; } = Builders.UserBuilder.AnOwner().InTenant(Guid.NewGuid()).Build();
    public Subscription? Subscription { get; private set; }

    public const string CheckoutUrl = "https://checkout.stripe.com/c/pay/cs_test_123";
    public const string GatewayCustomerId = "cus_test_123";

    public SubscriptionHarness()
    {
        _userContext.SetupGet(c => c.UserId).Returns(() => User.Id);
        Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(() => User);
        Subscriptions.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>())).ReturnsAsync(() => Subscription);

        Gateway.SetupGet(g => g.Provider).Returns("Stripe");
        Gateway.Setup(g => g.PriceExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        Gateway.Setup(g => g.CreateSubscriptionCheckoutAsync(
                It.IsAny<SubscriptionCheckoutRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HostedCheckoutResult("cs_test_123", CheckoutUrl))
            .Callback<SubscriptionCheckoutRequest, CancellationToken>((r, _) => CheckoutRequest = r);
        Gateway.Setup(g => g.EnsureCustomerAsync(It.IsAny<CustomerInfo>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GatewayCustomerResult(GatewayCustomerId, "dono@exemplo.com", "Fulano", null, null));

        // O cliente já existe no gateway — o caminho comum. Testes de 1º checkout sobrescrevem.
        Customers.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), "Stripe"))
            .ReturnsAsync(() => new GatewayCustomer
            {
                UserId = User.Id,
                Provider = "Stripe",
                GatewayCustomerId = GatewayCustomerId,
                Email = User.Email,
            });

        // O IsEntitled do service delega para a entidade — usar a regra real evita um mock que
        // "concorda" com o teste em vez de reproduzir o domínio.
        Entitlements.Setup(e => e.IsEntitled(It.IsAny<Subscription>()))
                    .Returns((Subscription s) => s.IsEntitledAt(DateTime.UtcNow));

        Subscriptions.Setup(r => r.AddAsync(It.IsAny<Subscription>()))
            .Callback<Subscription>(s => { Subscription = s; Added = true; })
            .Returns(Task.CompletedTask);
    }

    // O que foi enviado ao gateway na criação do checkout — a metadata daqui é o que amarra o
    // webhook, meses depois, ao usuário certo.
    public SubscriptionCheckoutRequest? CheckoutRequest { get; private set; }

    public bool Added { get; private set; }

    public SubscriptionHarness ForUser(User user) { User = user; return this; }

    public SubscriptionHarness WithSubscription(Subscription? sub)
    {
        Subscription = sub;
        if (sub is not null) sub.UserId = User.Id;
        return this;
    }

    public SubscriptionHarness WithPlan(Plan plan)
    {
        Plans.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        Plans.Setup(r => r.GetByExternalProductIdAsync(plan.ExternalProductId)).ReturnsAsync(plan);
        return this;
    }

    public SubscriptionHarness WithUnknownPlan(Guid planId)
    {
        Plans.Setup(r => r.GetByIdAsync(planId)).ReturnsAsync((Plan?)null);
        return this;
    }

    // O preço não existe (ou não é recorrente) no gateway — catálogo local dessincronizado.
    public SubscriptionHarness WithPriceMissingAtGateway(string externalProductId)
    {
        Gateway.Setup(g => g.PriceExistsAsync(externalProductId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        return this;
    }

    public SubscriptionHarness WithoutGatewayCustomer()
    {
        Customers.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), "Stripe")).ReturnsAsync((GatewayCustomer?)null);
        return this;
    }

    public SubscriptionHarness WhenUpgraded(DateTime periodEnd, int amountDueNowCents)
    {
        Gateway.Setup(g => g.UpgradeSubscriptionAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlanUpgradeResult(periodEnd, amountDueNowCents));
        return this;
    }

    public SubscriptionHarness WhenUpgradePreviewed(DateTime? nextChargeAt, int? amountDueNowCents)
    {
        Gateway.Setup(g => g.PreviewUpgradeAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlanUpgradePreview(amountDueNowCents, nextChargeAt));
        return this;
    }

    public SubscriptionHarness WhenDowngradeScheduled(string scheduleId, DateTime effectiveAt)
    {
        Gateway.Setup(g => g.ScheduleDowngradeAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlanDowngradeResult(scheduleId, effectiveAt));
        return this;
    }

    // Cobranças pagas elegíveis a estorno no cancelamento dentro da janela.
    public SubscriptionHarness WithPaidCharges(params Payment[] charges)
    {
        Payments.Setup(r => r.GetPaidBySubscriptionSinceAsync(It.IsAny<Guid>(), It.IsAny<DateTime>()))
                .ReturnsAsync(charges);
        Gateway.Setup(g => g.RefundAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync((string chargeId, CancellationToken _) => new RefundResult("re_test", "pending", 2999));
        return this;
    }

    // O gateway recusa a operação (rede fora, estado inválido lá).
    public SubscriptionHarness WhenGatewayFails<TException>(Action<Mock<IPaymentGateway>> setup)
        where TException : Exception
    {
        setup(Gateway);
        return this;
    }

    public SubscriptionService Build() => new(
        _userContext.Object,
        Entitlements.Object,
        Plans.Object,
        Subscriptions.Object,
        Customers.Object,
        Payments.Object,
        Users.Object,
        Gateway.Object,
        NullLogger<SubscriptionService>.Instance);
}
