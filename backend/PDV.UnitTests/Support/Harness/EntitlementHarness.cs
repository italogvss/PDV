using Moq;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Services;

namespace PDV.UnitTests.Support.Harness;

// Monta o EntitlementService. A cadeia real é: tenant ativo → Owner da loja → assinatura DELE.
// A assinatura pertence ao Owner e cobre todas as lojas dele — por isso o caminho passa pelo
// UserTenantRepository em vez de ler a assinatura pelo usuário logado.
public sealed class EntitlementHarness
{
    public Mock<IUserTenantRepository> UserTenants { get; } = new();
    public Mock<ISubscriptionRepository> Subscriptions { get; } = new();

    private readonly Mock<ITenantContext> _tenantContext = new();
    private readonly Mock<IUserContext> _userContext = new();

    public Guid TenantId { get; private set; } = Guid.NewGuid();
    public Guid OwnerId { get; private set; } = Guid.NewGuid();

    public EntitlementHarness()
    {
        _tenantContext.SetupGet(c => c.TenantId).Returns(() => TenantId);
        _userContext.SetupGet(c => c.UserId).Returns(() => OwnerId);
        UserTenants.Setup(r => r.GetOwnerUserIdAsync(It.IsAny<Guid>())).ReturnsAsync(() => OwnerId);
    }

    // A loja tem uma assinatura (a do seu Owner).
    public EntitlementHarness WithSubscription(Subscription subscription)
    {
        OwnerId = subscription.UserId;
        UserTenants.Setup(r => r.GetOwnerUserIdAsync(TenantId)).ReturnsAsync(OwnerId);
        Subscriptions.Setup(r => r.GetByUserIdAsync(OwnerId)).ReturnsAsync(subscription);
        return this;
    }

    // Nunca assinou nada.
    public EntitlementHarness WithoutSubscription()
    {
        Subscriptions.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>())).ReturnsAsync((Subscription?)null);
        return this;
    }

    // Onboarding: o usuário ainda não tem loja, então o tenant do contexto é Guid.Empty e a
    // assinatura relevante é a do próprio usuário logado.
    public EntitlementHarness DuringOnboarding(Subscription? subscription = null)
    {
        TenantId = Guid.Empty;
        Subscriptions.Setup(r => r.GetByUserIdAsync(OwnerId)).ReturnsAsync(subscription);
        return this;
    }

    // Loja órfã (sem Owner resolvível) — não pode virar acesso liberado.
    public EntitlementHarness WithoutResolvableOwner()
    {
        UserTenants.Setup(r => r.GetOwnerUserIdAsync(It.IsAny<Guid>())).ReturnsAsync((Guid?)null);
        return this;
    }

    public EntitlementService Build() =>
        new(_tenantContext.Object, _userContext.Object, UserTenants.Object, Subscriptions.Object);
}
