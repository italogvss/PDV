using PDV.Domain.Constants;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.AccessControl;

// Fluxo: o plano contratado libera este recurso? (docs/subscriptions.md §6).
// Eixo de BILLING: falha aqui é sempre 402, nunca esconde UI. Não confundir com permissão de cargo.
[TestFixture]
public class EntitlementTests
{
    // ── Invariante 5: não existe plano gratuito ─────────────────────────────────────────────

    // D7 / cenário 12 (auth.md): sem assinatura o app fica bloqueado. "Sem assinatura" é acesso
    // negado, não um tier free — se isto regredir, o produto inteiro vira gratuito silenciosamente.
    [Test]
    public async Task D7_NoSubscription_ResolvesToNoPlanAndNoEntitlements()
    {
        var harness = new EntitlementHarness().WithoutSubscription();

        var resolved = await harness.Build().ResolveForCurrentTenantAsync();

        Assert.Multiple(() =>
        {
            Assert.That(resolved.Plan, Is.Null);
            Assert.That(resolved.Entitlements, Is.Empty);
            Assert.That(resolved.Limits, Is.Empty);
        });
    }

    [Test]
    public void D7_NoSubscription_EveryGatedModuleReturns402()
    {
        var harness = new EntitlementHarness().WithoutSubscription();

        var ex = Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireModuleAsync(OperationModule.Inventory));

        Assert.Multiple(() =>
        {
            Assert.That(ex.HttpStatus, Is.EqualTo(402));
            Assert.That(ex.Code, Is.EqualTo("NOT_IN_PLAN"));
        });
    }

    // Loja sem Owner resolvível tem de falhar fechada, não aberta.
    [Test]
    public void UnresolvableOwner_DoesNotGrantAccess()
    {
        var harness = new EntitlementHarness().WithoutResolvableOwner();

        Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireModuleAsync(OperationModule.Sales));
    }

    // ── Quem tem direito ao plano (Subscription.IsEntitledAt) ───────────────────────────────

    [Test]
    public async Task Trialing_WithinTrialPeriod_IsEntitled()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Trialing(daysLeft: 10).Build());

        await harness.Build().RequireModuleAsync(OperationModule.Inventory);
    }

    // T4: trial vencido bloqueia mesmo que o job horário ainda não tenha marcado Expired.
    [Test]
    public void T4_TrialingButExpired_IsBlocked()
    {
        var sub = SubscriptionBuilder.Trialing().WithTrialEnd(DateTime.UtcNow.AddDays(-1)).Build();
        var harness = new EntitlementHarness().WithSubscription(sub);

        Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireModuleAsync(OperationModule.Inventory));
    }

    [Test]
    public async Task Active_WithinPaidPeriod_IsEntitled()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Active().Build());

        await harness.Build().RequireModuleAsync(OperationModule.Inventory);
    }

    // RF-10: um Active com período vencido perde o acesso SEM depender do job horário. A renovação
    // falhou; se o acesso só caísse quando o job rodasse, haveria até 1h de serviço não pago.
    [Test]
    public void RF10_ActiveWithExpiredPeriod_LosesAccessWithoutWaitingForTheJob()
    {
        var sub = SubscriptionBuilder.Active().WithPeriodEnd(DateTime.UtcNow.AddDays(-1)).Build();
        var harness = new EntitlementHarness().WithSubscription(sub);

        Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireModuleAsync(OperationModule.Inventory));
    }

    // X3: cancelar só interrompe as próximas faturas — o que já foi pago continua valendo até o fim
    // do período. É contraintuitivo (status "Canceled" com acesso liberado) e por isso frágil.
    [Test]
    public async Task X3_CanceledButStillWithinPaidPeriod_KeepsAccess()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Canceled(periodDaysLeft: 10).Build());

        await harness.Build().RequireModuleAsync(OperationModule.Inventory);
    }

    [Test]
    public void CanceledAfterPeriodEnd_LosesAccess()
    {
        var sub = SubscriptionBuilder.Canceled().WithPeriodEnd(DateTime.UtcNow.AddDays(-1)).Build();
        var harness = new EntitlementHarness().WithSubscription(sub);

        Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireModuleAsync(OperationModule.Inventory));
    }

    // Pending (checkout iniciado, pagamento não confirmado) não pode liberar nada — senão bastaria
    // abrir o checkout e fechar para usar de graça.
    [Test]
    public void Pending_CheckoutNotConfirmed_GrantsNothing()
    {
        var harness = new EntitlementHarness().WithSubscription(SubscriptionBuilder.Pending().Build());

        Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireModuleAsync(OperationModule.Sales));
    }

    [Test]
    public void Expired_GrantsNothing()
    {
        var harness = new EntitlementHarness().WithSubscription(SubscriptionBuilder.Expired().Build());

        Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireModuleAsync(OperationModule.Sales));
    }

    // Estorno em trânsito: o acesso já caiu, o dinheiro está voltando.
    [Test]
    public void RefundRequested_GrantsNothing()
    {
        var harness = new EntitlementHarness().WithSubscription(SubscriptionBuilder.RefundRequested().Build());

        Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireModuleAsync(OperationModule.Sales));
    }

    // Mesmo sem direito ao plano a assinatura volta na resposta — é o que permite a UI mostrar
    // "expirado, renove" em vez de fingir que nunca existiu.
    [Test]
    public async Task ExpiredSubscription_IsStillReturnedForTheUiToShowStatus()
    {
        var sub = SubscriptionBuilder.Expired().Build();
        var harness = new EntitlementHarness().WithSubscription(sub);

        var resolved = await harness.Build().ResolveForCurrentTenantAsync();

        Assert.Multiple(() =>
        {
            Assert.That(resolved.Subscription, Is.SameAs(sub));
            Assert.That(resolved.Plan, Is.Null, "Sem direito → sem plano efetivo.");
            Assert.That(resolved.Entitlements, Is.Empty);
        });
    }

    // ── Features finas: o diferencial Essencial × Pro ───────────────────────────────────────

    [Test]
    public void EssentialPlan_ProOnlyFeature_Returns402()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Active(PlanBuilder.Essential().Build()).Build());

        var ex = Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireEntitlementAsync(EntitlementCatalog.AdvancedReports));

        Assert.That(ex.Code, Is.EqualTo("NOT_IN_PLAN"));
    }

    [Test]
    public async Task ProfessionalPlan_ProOnlyFeature_IsAllowed()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Active(PlanBuilder.Professional().Build()).Build());

        await harness.Build().RequireEntitlementAsync(EntitlementCatalog.AdvancedReports);
    }

    // Bug histórico (access-control-e-entitlements.md): o backend persiste as chaves em lowercase,
    // mas o catálogo canônico é camelCase. Comparar sensível ao caso bloqueava até quem era Pro.
    [Test]
    public async Task ProfessionalPlan_EntitlementComparisonIsCaseInsensitive()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Active(PlanBuilder.Professional().Build()).Build());
        var sut = harness.Build();

        var resolved = await sut.ResolveForCurrentTenantAsync();

        Assert.Multiple(() =>
        {
            Assert.That(resolved.Entitlements, Does.Contain("advancedreports"),
                "A persistência normaliza para lowercase.");
            Assert.That(resolved.Has(EntitlementCatalog.AdvancedReports), Is.True,
                "E a chave canônica camelCase tem de bater mesmo assim.");
        });
    }

    // Plano vazio = NENHUMA capability. É o oposto do eixo de tenant (onde vazio = todos os módulos);
    // trocar os helpers liberaria o produto inteiro de graça.
    [Test]
    public void EmptyPlan_GrantsNothing_NotEverything()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Active(PlanBuilder.Empty().Build()).Build());

        Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().RequireModuleAsync(OperationModule.Sales));
    }

    // ── Limites numéricos ───────────────────────────────────────────────────────────────────

    [Test]
    public async Task Limit_BelowCap_IsAllowed()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Active(PlanBuilder.Essential().Build()).Build());

        await harness.Build().EnsureWithinLimitAsync(PlanLimits.Employees, currentCount: 1);
    }

    // O limite é o total permitido: com 2 já cadastrados num plano de 2, criar o próximo estoura.
    [Test]
    public void Limit_AtCap_Returns402PlanLimitExceeded()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Active(PlanBuilder.Essential().Build()).Build());

        var ex = Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().EnsureWithinLimitAsync(PlanLimits.Employees, currentCount: 2));

        Assert.Multiple(() =>
        {
            Assert.That(ex.HttpStatus, Is.EqualTo(402));
            Assert.That(ex.Code, Is.EqualTo("PLAN_LIMIT_EXCEEDED"));
        });
    }

    [Test]
    public void Limit_AboveCap_Returns402()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Active(PlanBuilder.Essential().Build()).Build());

        Assert.ThrowsAsync<PaymentRequiredException>(
            () => harness.Build().EnsureWithinLimitAsync(PlanLimits.Employees, currentCount: 99));
    }

    [Test]
    public async Task Limit_Unlimited_NeverBlocks()
    {
        var harness = new EntitlementHarness()
            .WithSubscription(SubscriptionBuilder.Active(PlanBuilder.Professional().Build()).Build());

        await harness.Build().EnsureWithinLimitAsync(PlanLimits.Employees, currentCount: 10_000);
    }

    // Chave de limite ausente no plano resolve como ilimitado (PlanLimits.Unlimited é o default do
    // service). Vale fixar: é o comportamento que um plano novo herda ao esquecer um limite.
    [Test]
    public async Task Limit_KeyMissingFromPlan_ResolvesAsUnlimited()
    {
        var plan = PlanBuilder.Essential().Build();   // não define SaleHistoryDays
        var harness = new EntitlementHarness().WithSubscription(SubscriptionBuilder.Active(plan).Build());

        await harness.Build().EnsureWithinLimitAsync(PlanLimits.SaleHistoryDays, currentCount: 9_999);
    }

    // Sem assinatura os limites ficam vazios → resolvem como ilimitado. É o que evita travar o
    // onboarding da 1ª loja (com 0 lojas, o limite de lojas não pode barrar).
    [Test]
    public async Task Limit_WithoutSubscription_DoesNotBlockTheFirstStore()
    {
        var harness = new EntitlementHarness().WithoutSubscription();

        await harness.Build().EnsureWithinLimitAsync(PlanLimits.Stores, currentCount: 0);
    }

    // ── Onboarding: sem tenant, a assinatura é a do próprio usuário ─────────────────────────

    [Test]
    public async Task Onboarding_NoTenantYet_ResolvesTheLoggedUsersOwnSubscription()
    {
        var harness = new EntitlementHarness();
        var sub = SubscriptionBuilder.Active().OwnedBy(harness.OwnerId).Build();
        harness.DuringOnboarding(sub);

        var resolved = await harness.Build().ResolveForCurrentTenantAsync();

        Assert.That(resolved.Subscription, Is.SameAs(sub));
        harness.UserTenants.VerifyNoOtherCalls();
    }
}
