using FluentValidation;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PDV.Application.DTOs.Tenants;
using PDV.Application.Interfaces;
using PDV.Application.Validators.Tenants;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Services;

namespace PDV.UnitTests.Support.Harness;

// Monta o TenantService — 13 dependências, o construtor mais pesado do backend.
// Como no AuthHarness, IConfiguration é real (o service emite JWT e precisa de JWT_SECRET).
// Como no AccountDeletionHarness, o ILogger vai como NullLogger: o service loga o desvio do trial
// por rastreabilidade (aparece em /admin → logs), mas o efeito observável testável é a Subscription.
public sealed class TenantHarness
{
    public Mock<ITenantRepository> Tenants { get; } = new();
    public Mock<IUserRepository> Users { get; } = new();
    public Mock<ITenantRoleRepository> Roles { get; } = new();
    public Mock<ISubscriptionRepository> Subscriptions { get; } = new();
    public Mock<IPlanRepository> Plans { get; } = new();
    public Mock<IEntitlementService> Entitlements { get; } = new();
    public Mock<IStorageService> Storage { get; } = new();

    private readonly Mock<ITenantContext> _tenantContext = new();

    public User User { get; private set; } = Builders.UserBuilder.AnOwner().Build();
    public Guid CurrentTenantId { get; private set; } = Guid.NewGuid();

    // A assinatura criada pelo trial — é a prova de que o trial foi concedido.
    public Subscription? CreatedSubscription { get; private set; }

    public TenantHarness()
    {
        _tenantContext.SetupGet(c => c.TenantId).Returns(() => CurrentTenantId);
        Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(() => User);
        Subscriptions.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>())).ReturnsAsync((Subscription?)null);
        Subscriptions.Setup(r => r.AddAsync(It.IsAny<Subscription>()))
                     .Callback<Subscription>(s => CreatedSubscription = s)
                     .Returns(Task.CompletedTask);
    }

    public TenantHarness ForUser(User user) { User = user; return this; }

    public TenantHarness WithCurrentTenant(Guid tenantId) { CurrentTenantId = tenantId; return this; }

    // O usuário já tem uma assinatura viva — o trial não deve ser concedido por cima.
    public TenantHarness WithExistingSubscription(Subscription sub)
    {
        Subscriptions.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>())).ReturnsAsync(sub);
        return this;
    }

    // O slug da landing resolve para este plano.
    public TenantHarness WithPlanForSlug(string slug, Plan plan)
    {
        Plans.Setup(r => r.GetBySlugAsync(slug)).ReturnsAsync(plan);
        return this;
    }

    // Slug que não existe no catálogo (link antigo, plano removido).
    public TenantHarness WithUnknownSlug(string slug)
    {
        Plans.Setup(r => r.GetBySlugAsync(slug)).ReturnsAsync((Plan?)null);
        return this;
    }

    // O plano padrão do trial existe no catálogo — é ele que segura o caso do slug ruim.
    public TenantHarness WithFallbackPlan(Plan plan)
    {
        Plans.Setup(r => r.GetBySlugAsync(TrialDefaults.FallbackPlanSlug)).ReturnsAsync(plan);
        return this;
    }

    // Catálogo vazio: nem o slug pedido nem o padrão resolvem (ex.: Stripe:Prices incompleto).
    public TenantHarness WithNoPlans()
    {
        Plans.Setup(r => r.GetBySlugAsync(It.IsAny<string?>())).ReturnsAsync((Plan?)null);
        return this;
    }

    // O limite de lojas do plano estourou (402).
    public TenantHarness WithStoreLimitReached()
    {
        Entitlements.Setup(e => e.EnsureWithinLimitAsync(It.IsAny<string>(), It.IsAny<int>()))
                    .ThrowsAsync(new PDV.Domain.Exceptions.PaymentRequiredException(
                        "Limite do plano atingido.", "Seu plano permite no máximo 1.", "PLAN_LIMIT_EXCEEDED"));
        return this;
    }

    public TenantService Build() => new(
        Tenants.Object,
        Users.Object,
        Roles.Object,
        Subscriptions.Object,
        Plans.Object,
        Entitlements.Object,
        _tenantContext.Object,
        Storage.Object,
        new BusinessSettingsDtoValidator(),
        new OperationSettingsDtoValidator(),
        new PaymentsSettingsDtoValidator(),
        TestConfig.Create(),
        NullLogger<TenantService>.Instance);
}

// Constrói o CreateTenantRequest — 20+ parâmetros posicionais, quase todos irrelevantes para os
// testes de trial. Os defaults pulam documentos/endereço/horário, que têm validação própria.
public static class CreateTenantRequests
{
    public static CreateTenantRequest Minimal(string? planSlug = null, string fantasyName = "Minha Loja") =>
        new(
            FantasyName: fantasyName,
            Phone: null,
            Segment: "Outro",
            CustomSegmentName: "Teste",
            LogoUrl: null,
            SkipDocuments: true,
            Cnpj: null,
            CompanyName: null,
            StateRegistration: null,
            TaxRegime: "simples",
            SkipAddress: true,
            Cep: null,
            Street: null,
            Number: null,
            Complement: null,
            Neighborhood: null,
            City: null,
            State: null,
            SkipHours: true,
            HoursPreset: null,
            BusinessHours: null,
            PlanSlug: planSlug);
}
