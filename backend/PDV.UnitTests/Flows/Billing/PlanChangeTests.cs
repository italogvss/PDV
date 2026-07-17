using PDV.Application.Helpers;
using PDV.Domain.Constants;
using PDV.Domain.Enums;
using PDV.UnitTests.Support.Builders;

namespace PDV.UnitTests.Flows.Billing;

// Fluxo: o usuário troca de plano — a troca vale agora ou na virada do ciclo?
// (docs/subscriptions.md §5 e §8.6, cenários P1–P4).
//
// Uma regra só governa tudo: **o usuário nunca perde, no meio de um ciclo já pago, algo pelo qual
// pagou.** Errar para "imediato" confisca o que ele comprou; errar para "agendado" dá recurso Pro
// de graça até a virada. Esta classe é um helper PURO — sem mock, sem I/O.
[TestFixture]
public class PlanChangeTests
{
    // ── P1–P4: a matriz do catálogo (docs/subscriptions.md §5) ──────────────────────────────

    // Ganha features e limites: nada é retirado → vale agora, cobrando o proporcional.
    [Test]
    public void P1_EssentialToProfessional_SameCycle_IsImmediate()
    {
        var current = PlanBuilder.Essential().Build();
        var target = PlanBuilder.Professional().Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.False);
    }

    // Retira features e encolhe limites → agendado; até a virada valem os recursos já pagos.
    [Test]
    public void P2_ProfessionalToEssential_IsScheduled()
    {
        var current = PlanBuilder.Professional().Build();
        var target = PlanBuilder.Essential().Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.True);
    }

    // Mensal → anual alonga o compromisso e não tira nada → imediato.
    [Test]
    public void P3_MonthlyToAnnual_SameTier_IsImmediate()
    {
        var current = PlanBuilder.Essential().Build();
        var target = PlanBuilder.Essential().Annual().Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.False);
    }

    // Anual → mensal não retira capability nenhuma, mas jogaria fora os meses do ano já pago.
    // "Tempo de serviço comprado" conta como algo que o usuário perderia → agendado.
    [Test]
    public void P4_AnnualToMonthly_SameTier_IsScheduled()
    {
        var current = PlanBuilder.Essential().Annual().Build();
        var target = PlanBuilder.Essential().Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.True);
    }

    // Sobe de tier E encurta o ciclo: o ganho de features não compensa o tempo perdido.
    [Test]
    public void EssentialAnnualToProfessionalMonthly_IsScheduled()
    {
        var current = PlanBuilder.Essential().Annual().Build();
        var target = PlanBuilder.Professional().Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.True,
            "Encurtar o ciclo já pago agenda a troca mesmo quando o alvo é superior.");
    }

    // ── A ordem do enum BillingPeriod é regra de negócio ────────────────────────────────────

    // ShortensBillingCycle compara `target.BillingPeriod < current.BillingPeriod`, ou seja, depende
    // da ORDEM dos membros do enum. Reordenar `BillingPeriod` compila, não quebra teste nenhum de
    // compilação e inverte silenciosamente a classificação de toda troca de ciclo. Este teste
    // trava o contrato.
    [Test]
    public void BillingPeriodEnumOrder_IsPartOfTheContract()
    {
        Assert.That((int)BillingPeriod.Monthly, Is.LessThan((int)BillingPeriod.Annual),
            "PlanChange.ShortensBillingCycle depende desta ordem: ciclo mais curto vem antes.");
    }

    // ── Limites: -1 (ilimitado) é o MAIOR valor, não o menor ────────────────────────────────

    // A armadilha aritmética: `-1 < 2` é verdade numericamente, mas ilimitado→2 **encolhe** e
    // 2→ilimitado **não**. Uma comparação ingênua inverteria os dois casos abaixo.
    [Test]
    public void Limit_FromUnlimitedToFinite_ShrinksAndIsScheduled()
    {
        var current = PlanBuilder.Empty().WithLimit(PlanLimits.Employees, PlanLimits.Unlimited).Build();
        var target = PlanBuilder.Empty().WithLimit(PlanLimits.Employees, 2).Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.True,
            "Ilimitado → 2 tira capacidade, mesmo com -1 sendo numericamente menor.");
    }

    [Test]
    public void Limit_FromFiniteToUnlimited_DoesNotShrink_IsImmediate()
    {
        var current = PlanBuilder.Empty().WithLimit(PlanLimits.Employees, 2).Build();
        var target = PlanBuilder.Empty().WithLimit(PlanLimits.Employees, PlanLimits.Unlimited).Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.False);
    }

    [Test]
    public void Limit_Decreased_IsScheduled()
    {
        var current = PlanBuilder.Empty().WithLimit(PlanLimits.Stores, 5).Build();
        var target = PlanBuilder.Empty().WithLimit(PlanLimits.Stores, 1).Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.True);
    }

    [Test]
    public void Limit_Increased_IsImmediate()
    {
        var current = PlanBuilder.Empty().WithLimit(PlanLimits.Stores, 1).Build();
        var target = PlanBuilder.Empty().WithLimit(PlanLimits.Stores, 5).Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.False);
    }

    [Test]
    public void Limit_Unchanged_IsImmediate()
    {
        var current = PlanBuilder.Empty().WithLimit(PlanLimits.Stores, 5).Build();
        var target = PlanBuilder.Empty().WithLimit(PlanLimits.Stores, 5).Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.False);
    }

    // Chave ausente no alvo = capability não concedida = 0 → encolhe.
    //
    // ⚠️ Atenção de manutenção: esta semântica é OPOSTA à do EntitlementService, onde um limite
    // ausente resolve como ILIMITADO (EnsureWithinLimitAsync). Os dois leem o mesmo LimitsJson com
    // regras contrárias para "ausente" — este teste fixa o lado do PlanChange.
    [Test]
    public void Limit_MissingFromTargetPlan_CountsAsZero_AndIsScheduled()
    {
        var current = PlanBuilder.Empty().WithLimit(PlanLimits.Employees, 2).Build();
        var target = PlanBuilder.Empty().Build();   // não declara o limite

        Assert.That(PlanChange.IsScheduled(current, target), Is.True,
            "Limite ausente no alvo é 0 (não ilimitado) — o usuário perderia capacidade.");
    }

    // Limite novo, que o plano atual não declarava, não é perda.
    [Test]
    public void Limit_OnlyPresentInTargetPlan_IsNotAShrink()
    {
        var current = PlanBuilder.Empty().Build();
        var target = PlanBuilder.Empty().WithLimit(PlanLimits.Employees, 2).Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.False);
    }

    // ── Entitlements ────────────────────────────────────────────────────────────────────────

    [Test]
    public void Entitlement_Removed_IsScheduled()
    {
        var current = PlanBuilder.Empty()
            .WithEntitlements(EntitlementCatalog.Sales, EntitlementCatalog.AdvancedReports).Build();
        var target = PlanBuilder.Empty().WithEntitlements(EntitlementCatalog.Sales).Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.True);
    }

    [Test]
    public void Entitlement_Added_IsImmediate()
    {
        var current = PlanBuilder.Empty().WithEntitlements(EntitlementCatalog.Sales).Build();
        var target = PlanBuilder.Empty()
            .WithEntitlements(EntitlementCatalog.Sales, EntitlementCatalog.AdvancedReports).Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.False);
    }

    // O backend persiste as chaves em lowercase e o catálogo canônico é camelCase. Se a comparação
    // fosse sensível ao caso, TODA troca pareceria retirar entitlements e nada seria imediato.
    [Test]
    public void Entitlement_ComparisonIsCaseInsensitive()
    {
        var current = PlanBuilder.Empty().WithEntitlements("AdvancedReports").Build();
        var target = PlanBuilder.Empty().WithEntitlements("advancedreports").Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.False,
            "É a mesma capability escrita com outro casing — nada foi retirado.");
    }

    // ── RemovesCapabilities: só o que o diálogo lista para o usuário ────────────────────────

    // A distinção fina: uma troca agendada só por encurtar o ciclo NÃO tira recurso nenhum. Se o
    // diálogo usasse IsScheduled para listar perdas, avisaria "você vai perder..." sem nada a perder.
    [Test]
    public void P4_AnnualToMonthly_IsScheduledButRemovesNoCapability()
    {
        var current = PlanBuilder.Essential().Annual().Build();
        var target = PlanBuilder.Essential().Build();

        Assert.Multiple(() =>
        {
            Assert.That(PlanChange.IsScheduled(current, target), Is.True, "Agenda: encurta o ciclo pago.");
            Assert.That(PlanChange.RemovesCapabilities(current, target), Is.False,
                "Mas não há feature nem limite a perder — o diálogo não deve listar nada.");
        });
    }

    [Test]
    public void P2_ProfessionalToEssential_RemovesCapabilities()
    {
        var current = PlanBuilder.Professional().Build();
        var target = PlanBuilder.Essential().Build();

        Assert.That(PlanChange.RemovesCapabilities(current, target), Is.True);
    }

    [Test]
    public void RemovesCapabilities_IgnoresBillingCycle()
    {
        var current = PlanBuilder.Professional().Annual().Build();
        var target = PlanBuilder.Professional().Build();

        Assert.That(PlanChange.RemovesCapabilities(current, target), Is.False,
            "Mesmo tier: o ciclo não é capability.");
    }

    // ── Trocar para o próprio plano ─────────────────────────────────────────────────────────

    [Test]
    public void SamePlan_NeitherScheduledNorRemovesAnything()
    {
        var plan = PlanBuilder.Professional().Build();

        Assert.Multiple(() =>
        {
            Assert.That(PlanChange.IsScheduled(plan, plan), Is.False);
            Assert.That(PlanChange.RemovesCapabilities(plan, plan), Is.False);
        });
    }

    // A classificação deriva dos eixos do plano, nunca de um "tier" hardcoded: dois planos com
    // preços muito diferentes, mas mesmos entitlements/limites/ciclo, não agendam nada.
    [Test]
    public void PriceAlone_DoesNotDriveClassification()
    {
        var current = PlanBuilder.Essential().Named("Caro", "caro", 9999).Build();
        var target = PlanBuilder.Essential().Named("Barato", "barato", 999).Build();

        Assert.That(PlanChange.IsScheduled(current, target), Is.False,
            "Ficar mais barato não é, por si só, perder algo.");
    }
}
