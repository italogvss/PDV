using Moq;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Onboarding;

// Fluxo: o usuário cria a primeira loja e ganha (ou não) o trial — docs/subscriptions.md §8.1,
// cenários T1–T3, e docs/auth.md §4.
// O trial é PDV-side: 30 dias, sem cartão, **uma vez por usuário** e sem tocar o gateway. Conceder
// duas vezes é serviço de graça; falhar o onboarding por causa dele é pior ainda.
[TestFixture]
public class TrialTests
{
    private const string PlanSlug = "profissional-mensal";

    // ── T1: primeira loja com plano escolhido na landing ────────────────────────────────────

    [Test]
    public async Task T1_CreateStoreWithPlanSlug_GrantsThirtyDayTrial()
    {
        var plan = PlanBuilder.Professional().Build();
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness().ForUser(user).WithPlanForSlug(PlanSlug, plan);

        await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal(PlanSlug));

        var sub = harness.CreatedSubscription;
        Assert.Multiple(() =>
        {
            Assert.That(sub, Is.Not.Null);
            Assert.That(sub!.Status, Is.EqualTo(SubscriptionStatus.Trialing));
            Assert.That(sub.PlanId, Is.EqualTo(plan.Id));
            Assert.That(sub.UserId, Is.EqualTo(user.Id), "A assinatura pertence ao Owner, não à loja.");
            Assert.That(sub.TrialEndsAt,
                Is.EqualTo(DateTime.UtcNow.AddDays(TrialDefaults.DurationDays)).Within(TimeSpan.FromMinutes(1)));
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(sub.TrialEndsAt),
                "É CurrentPeriodEnd que o IsEntitledAt olha — os dois têm de andar juntos.");
        });
    }

    // O gateway nunca é acionado no trial: sem cliente, sem assinatura, sem cobrança lá.
    [Test]
    public async Task T1_Trial_NeverTouchesTheGateway()
    {
        var plan = PlanBuilder.Professional().Build();
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness().ForUser(user).WithPlanForSlug(PlanSlug, plan);

        await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal(PlanSlug));

        var sub = harness.CreatedSubscription!;
        Assert.Multiple(() =>
        {
            Assert.That(sub.Provider, Is.Empty, "String vazia sinaliza 'o gateway não conhece esta assinatura'.");
            Assert.That(sub.GatewaySubscriptionId, Is.Null);
            Assert.That(sub.GatewayCustomerId, Is.Null);
            Assert.That(sub.IsRenewable, Is.False, "Trial não renova sozinho — vira Expired.");
            Assert.That(sub.StartedAt, Is.Null, "Nunca foi paga → fora de qualquer janela de reembolso.");
        });
    }

    // HasUsedTrial é irreversível: cancelar, expirar ou assinar não o devolve.
    [Test]
    public async Task T1_Trial_MarksHasUsedTrialOnTheUser()
    {
        var plan = PlanBuilder.Professional().Build();
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness().ForUser(user).WithPlanForSlug(PlanSlug, plan);

        await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal(PlanSlug));

        Assert.That(user.HasUsedTrial, Is.True);
        harness.Users.Verify(r => r.UpdateAsync(user), Times.Once);
    }

    // ── T2: segunda loja não ganha trial de novo ────────────────────────────────────────────

    [Test]
    public async Task T2_UserAlreadyUsedTrial_DoesNotGrantASecondOne()
    {
        var plan = PlanBuilder.Professional().Build();
        var user = UserBuilder.AnOwner().Build();
        user.HasUsedTrial = true;
        var harness = new TenantHarness().ForUser(user).WithPlanForSlug(PlanSlug, plan);

        await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal(PlanSlug));

        Assert.That(harness.CreatedSubscription, Is.Null, "Trial é uma vez por usuário.");
    }

    // O acesso da 2ª loja vem da assinatura que o Owner já tem (RF-1) — uma assinatura cobre todas
    // as lojas dele.
    [Test]
    public async Task T2_UserWithLiveSubscription_DoesNotGrantTrialOnTop()
    {
        var plan = PlanBuilder.Professional().Build();
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness()
            .ForUser(user)
            .WithPlanForSlug(PlanSlug, plan)
            .WithExistingSubscription(SubscriptionBuilder.Active().OwnedBy(user.Id).Build());

        await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal(PlanSlug));

        Assert.Multiple(() =>
        {
            Assert.That(harness.CreatedSubscription, Is.Null, "Já há assinatura viva — nada a conceder.");
            Assert.That(user.HasUsedTrial, Is.False, "E o flag não é gasto à toa.");
        });
    }

    // ── T3: sem slug, sem trial — mas o onboarding não pode falhar ──────────────────────────

    [Test]
    public async Task T3_CreateStoreWithoutPlanSlug_CreatesNoSubscription()
    {
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness().ForUser(user);

        var (response, _) = await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal(planSlug: null));

        Assert.Multiple(() =>
        {
            Assert.That(harness.CreatedSubscription, Is.Null);
            Assert.That(user.HasUsedTrial, Is.False);
            Assert.That(response.TenantId, Is.Not.EqualTo(Guid.Empty), "A loja é criada mesmo assim.");
        });
    }

    // Um link antigo da landing (plano que saiu do catálogo) não pode quebrar a criação da loja —
    // o usuário simplesmente segue sem trial e escolhe um plano depois.
    [Test]
    public async Task T3_UnknownPlanSlug_SkipsTrialWithoutFailingOnboarding()
    {
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness().ForUser(user).WithUnknownSlug("plano-que-nao-existe");

        var (response, accessToken) = await harness.Build()
            .CreateAsync(user.Id, CreateTenantRequests.Minimal("plano-que-nao-existe"));

        Assert.Multiple(() =>
        {
            Assert.That(harness.CreatedSubscription, Is.Null);
            Assert.That(response.TenantId, Is.Not.EqualTo(Guid.Empty));
            Assert.That(accessToken, Is.Not.Empty);
        });
    }

    [TestCase("")]
    [TestCase("   ")]
    public async Task BlankPlanSlug_SkipsTrial(string slug)
    {
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness().ForUser(user);

        await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal(slug));

        Assert.That(harness.CreatedSubscription, Is.Null);
        harness.Plans.Verify(r => r.GetBySlugAsync(It.IsAny<string>()), Times.Never);
    }

    // ── Onboarding: o token reemitido já carrega a loja nova ────────────────────────────────

    // Sem isto o usuário ficaria com o token antigo (tenantId vazio) e o RouterGuard o mandaria de
    // volta para /criar-negocio — um loop.
    [Test]
    public async Task CreateStore_ReissuesTokenWithTheNewTenantAndOwnerRole()
    {
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness().ForUser(user);

        var (response, accessToken) = await harness.Build()
            .CreateAsync(user.Id, CreateTenantRequests.Minimal());

        Assert.Multiple(() =>
        {
            Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(response.TenantId.ToString()));
            Assert.That(JwtProbe.Role(accessToken), Is.EqualTo("Owner"));
            Assert.That(JwtProbe.Subject(accessToken), Is.EqualTo(user.Id.ToString()));
        });
    }

    [Test]
    public async Task CreateStore_LinksOwnerAndSetsItAsTheActiveTenant()
    {
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness().ForUser(user);

        var (response, _) = await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal());

        Assert.That(user.LastTenantId, Is.EqualTo(response.TenantId));
    }

    // Cada loja nasce com os cargos default — sem eles o Owner não teria como cadastrar funcionário.
    [Test]
    public async Task CreateStore_SeedsDefaultRoles()
    {
        var user = UserBuilder.AnOwner().Build();
        var harness = new TenantHarness().ForUser(user);

        await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal());

        harness.Roles.Verify(r => r.AddRangeAsync(It.Is<IEnumerable<TenantRole>>(roles => roles.Any())), Times.Once);
    }

    [Test]
    public void CreateStore_UnknownUser_ThrowsNotFound()
    {
        var harness = new TenantHarness();
        harness.Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((User?)null);

        Assert.ThrowsAsync<NotFoundException>(() => harness.Build()
            .CreateAsync(Guid.NewGuid(), CreateTenantRequests.Minimal()));
    }

    // ── Limite de lojas do plano ────────────────────────────────────────────────────────────

    // A 1ª loja nunca é barrada: com 0 lojas não há assinatura viva, os limites resolvem vazios e o
    // gate nem é consultado. Sem isso, o onboarding seria impossível — ninguém assina antes de ter loja.
    [Test]
    public async Task FirstStore_IsNeverBlockedByPlanLimit()
    {
        var user = UserBuilder.AnOwner().Build();   // nenhuma loja ainda
        var harness = new TenantHarness().ForUser(user).WithStoreLimitReached();

        var (response, _) = await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal());

        Assert.That(response.TenantId, Is.Not.EqualTo(Guid.Empty));
        harness.Entitlements.Verify(e => e.EnsureWithinLimitAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never,
            "Com 0 lojas o gate nem deve ser chamado.");
    }

    // A partir da 2ª, o limite do plano vale.
    [Test]
    public void AdditionalStore_BeyondPlanLimit_Returns402()
    {
        var user = UserBuilder.AnOwner().InTenant(Guid.NewGuid(), UserRole.Owner).Build();
        var harness = new TenantHarness().ForUser(user).WithStoreLimitReached();

        var ex = Assert.ThrowsAsync<PaymentRequiredException>(() => harness.Build()
            .CreateAsync(user.Id, CreateTenantRequests.Minimal()));

        Assert.That(ex.Code, Is.EqualTo("PLAN_LIMIT_EXCEEDED"));
    }

    [Test]
    public async Task AdditionalStore_ChecksLimitAgainstOwnedActiveStoreCount()
    {
        var user = UserBuilder.AnOwner()
            .InTenant(Guid.NewGuid(), UserRole.Owner)
            .InTenant(Guid.NewGuid(), UserRole.Owner)
            .InTenant(Guid.NewGuid(), UserRole.Employee)   // não é dele: não conta
            .Build();
        var harness = new TenantHarness().ForUser(user);

        await harness.Build().CreateAsync(user.Id, CreateTenantRequests.Minimal());

        harness.Entitlements.Verify(e => e.EnsureWithinLimitAsync(PlanLimits.Stores, 2), Times.Once,
            "Só as lojas onde ele é Owner contam para o limite.");
    }
}
