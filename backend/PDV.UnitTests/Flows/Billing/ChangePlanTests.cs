using Moq;
using PDV.Application.DTOs.Subscriptions;
using PDV.Domain.Entities;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Billing;

// Fluxo: o usuário troca de plano pelo app — docs/subscriptions.md §8.6, cenários P1–P12.
// A classificação (imediato × agendado) é do PlanChange e já tem testes próprios; aqui o que se
// testa é a ORQUESTRAÇÃO: o que é chamado no gateway, o que é gravado, e o que o diálogo recebe.
[TestFixture]
public class ChangePlanTests
{
    private static readonly DateTime PeriodEnd = DateTime.UtcNow.AddDays(20);

    // ── P1: upgrade vale agora e cobra o proporcional ───────────────────────────────────────

    [Test]
    public async Task P1_UpgradeOnPaidSubscription_AppliesNowAndChargesProration()
    {
        var current = PlanBuilder.Essential().Build();
        var target = PlanBuilder.Professional().Build();
        var sub = SubscriptionBuilder.Active(current).Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(sub).WithPlan(current).WithPlan(target)
            .WhenUpgraded(PeriodEnd, amountDueNowCents: 1247);

        var result = await harness.Build().ChangePlanAsync(new ChangePlanRequest(target.Id));

        Assert.Multiple(() =>
        {
            Assert.That(result.Scheduled, Is.False);
            Assert.That(result.AmountDueNowCents, Is.EqualTo(1247), "A diferença proporcional é cobrada na hora.");
            Assert.That(result.PlanName, Is.EqualTo(target.Name));
            Assert.That(sub.PlanId, Is.EqualTo(target.Id), "O plano vigente muda imediatamente.");
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(PeriodEnd), "O período é reancorado pela resposta do gateway.");
        });
    }

    // P5/RF-34: o Stripe recusa alterar itens de uma assinatura governada por schedule — liberar
    // antes não é detalhe, é pré-condição. E um upgrade cancela o downgrade agendado.
    [Test]
    public async Task P5_UpgradeWithScheduledDowngrade_ReleasesScheduleFirstAndClearsPending()
    {
        var current = PlanBuilder.Professional().Build();
        var scheduled = PlanBuilder.Essential().Build();
        var target = PlanBuilder.Professional().Annual().Build();
        var sub = SubscriptionBuilder.Active(current).WithPendingPlan(scheduled).Build();
        var scheduleId = sub.GatewayScheduleId!;

        var harness = new SubscriptionHarness()
            .WithSubscription(sub).WithPlan(current).WithPlan(target)
            .WhenUpgraded(PeriodEnd, amountDueNowCents: 5000);

        var calls = new List<string>();
        harness.Gateway.Setup(g => g.ReleaseScheduleAsync(scheduleId, It.IsAny<CancellationToken>()))
               .Callback(() => calls.Add("release")).Returns(Task.CompletedTask);
        harness.Gateway.Setup(g => g.UpgradeSubscriptionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .Callback(() => calls.Add("upgrade"))
               .ReturnsAsync(new PDV.Application.DTOs.Payments.PlanUpgradeResult(PeriodEnd, 5000));

        await harness.Build().ChangePlanAsync(new ChangePlanRequest(target.Id));

        Assert.Multiple(() =>
        {
            Assert.That(calls, Is.EqualTo(new[] { "release", "upgrade" }),
                "O agendamento tem de ser liberado ANTES do upgrade.");
            Assert.That(sub.PendingPlanId, Is.Null);
            Assert.That(sub.GatewayScheduleId, Is.Null);
        });
    }

    // ── P2/P4: troca agendada não cobra nem credita nada ────────────────────────────────────

    [Test]
    public async Task P2_DowngradeOnPaidSubscription_IsScheduledAndChargesNothing()
    {
        var current = PlanBuilder.Professional().Build();
        var target = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Active(current).Build();
        var effectiveAt = DateTime.UtcNow.AddDays(20);
        var harness = new SubscriptionHarness()
            .WithSubscription(sub).WithPlan(current).WithPlan(target)
            .WhenDowngradeScheduled("sub_sched_novo", effectiveAt);

        var result = await harness.Build().ChangePlanAsync(new ChangePlanRequest(target.Id));

        Assert.Multiple(() =>
        {
            Assert.That(result.Scheduled, Is.True);
            Assert.That(result.AmountDueNowCents, Is.EqualTo(0), "Nada é cobrado nem creditado numa troca agendada.");
            Assert.That(result.EffectiveAt, Is.EqualTo(effectiveAt));
            Assert.That(sub.PlanId, Is.EqualTo(current.Id), "O plano vigente NÃO muda — o usuário já pagou por ele.");
            Assert.That(sub.PendingPlanId, Is.EqualTo(target.Id));
            Assert.That(sub.GatewayScheduleId, Is.EqualTo("sub_sched_novo"));
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(effectiveAt), "A data da virada vem do gateway.");
        });
        harness.Gateway.Verify(g => g.UpgradeSubscriptionAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // A promoção PendingPlanId → PlanId nunca é otimista aqui: quem promove é o reconciliador de
    // webhook, quando o preço vigente no gateway realmente vira o do plano agendado (P9).
    [Test]
    public async Task P2_ScheduledChange_DoesNotOptimisticallyPromoteThePlan()
    {
        var current = PlanBuilder.Professional().Build();
        var target = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Active(current).Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(sub).WithPlan(current).WithPlan(target)
            .WhenDowngradeScheduled("sub_sched_novo", DateTime.UtcNow.AddDays(20));

        await harness.Build().ChangePlanAsync(new ChangePlanRequest(target.Id));

        Assert.That(sub.PlanId, Is.Not.EqualTo(target.Id),
            "Até a virada valem os entitlements do plano pago.");
    }

    // ── P6/P7/P8: reescolher o plano vigente ────────────────────────────────────────────────

    [Test]
    public async Task P6_ReselectingCurrentPlanWithSchedule_WithdrawsTheScheduledChange()
    {
        var current = PlanBuilder.Professional().Build();
        var sub = SubscriptionBuilder.Active(current).WithPendingPlan(PlanBuilder.Essential().Build()).Build();
        var scheduleId = sub.GatewayScheduleId!;
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(current);

        var result = await harness.Build().ChangePlanAsync(new ChangePlanRequest(current.Id));

        Assert.Multiple(() =>
        {
            Assert.That(result.Scheduled, Is.False);
            Assert.That(sub.PendingPlanId, Is.Null, "Desistiu da troca — nada muda.");
            Assert.That(sub.GatewayScheduleId, Is.Null);
        });
        harness.Gateway.Verify(g => g.ReleaseScheduleAsync(scheduleId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public void P7_ReselectingCurrentPlanWithoutSchedule_IsRejected()
    {
        var current = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Active(current).Build())
            .WithPlan(current);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build()
            .ChangePlanAsync(new ChangePlanRequest(current.Id)));

        Assert.That(ex.Message, Is.EqualTo("Você já está neste plano."));
    }

    [Test]
    public void P8_ReselectingTheAlreadyScheduledPlan_IsRejected()
    {
        var current = PlanBuilder.Professional().Build();
        var scheduled = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Active(current).WithPendingPlan(scheduled).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(current).WithPlan(scheduled);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build()
            .ChangePlanAsync(new ChangePlanRequest(scheduled.Id)));

        Assert.That(ex.Message, Is.EqualTo("A troca para este plano já está agendada."));
    }

    // ── P12: troca durante o trial ──────────────────────────────────────────────────────────

    // O gateway não conhece a assinatura de trial. Não há nada pago a preservar → troca imediata,
    // sem cobrança, com as datas do trial intactas.
    [Test]
    public async Task P12_ChangePlanDuringTrial_IsImmediateAndKeepsTrialDates()
    {
        var current = PlanBuilder.Essential().Build();
        var target = PlanBuilder.Professional().Build();
        var sub = SubscriptionBuilder.Trialing(current, daysLeft: 12).Build();
        var trialEnd = sub.TrialEndsAt;
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(current).WithPlan(target);

        var result = await harness.Build().ChangePlanAsync(new ChangePlanRequest(target.Id));

        Assert.Multiple(() =>
        {
            Assert.That(sub.PlanId, Is.EqualTo(target.Id));
            Assert.That(sub.TrialEndsAt, Is.EqualTo(trialEnd), "Trocar de plano não encurta nem estende o trial.");
            Assert.That(result.AmountDueNowCents, Is.EqualTo(0));
            Assert.That(result.Scheduled, Is.False);
        });
        harness.Gateway.VerifyGet(g => g.Provider, Times.AtMost(1));
        harness.Gateway.Verify(g => g.UpgradeSubscriptionAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        harness.Gateway.Verify(g => g.ScheduleDowngradeAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // Um downgrade no trial também é imediato — a regra de "não perder o que pagou" não se aplica a
    // quem não pagou nada.
    [Test]
    public async Task ChangePlanDuringTrial_EvenDowngrade_IsImmediate()
    {
        var current = PlanBuilder.Professional().Build();
        var target = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Trialing(current).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(current).WithPlan(target);

        var result = await harness.Build().ChangePlanAsync(new ChangePlanRequest(target.Id));

        Assert.Multiple(() =>
        {
            Assert.That(sub.PlanId, Is.EqualTo(target.Id));
            Assert.That(result.Scheduled, Is.False);
        });
    }

    // ── Recusas ─────────────────────────────────────────────────────────────────────────────

    // RF-32: uma assinatura morta reativa por checkout, não por troca de plano.
    [Test]
    public void ChangePlan_OnExpiredSubscription_IsRejected()
    {
        var current = PlanBuilder.Essential().Build();
        var target = PlanBuilder.Professional().Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Expired(current).Build())
            .WithPlan(current).WithPlan(target);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build()
            .ChangePlanAsync(new ChangePlanRequest(target.Id)));

        Assert.That(ex.Message, Is.EqualTo("Nenhuma assinatura ativa para trocar."));
    }

    [Test]
    public void ChangePlan_WithoutAnySubscription_IsRejected()
    {
        var target = PlanBuilder.Professional().Build();
        var harness = new SubscriptionHarness().WithSubscription(null).WithPlan(target);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().ChangePlanAsync(new ChangePlanRequest(target.Id)));
    }

    [Test]
    public void ChangePlan_ToUnknownPlan_ThrowsNotFound()
    {
        var current = PlanBuilder.Essential().Build();
        var unknownId = Guid.NewGuid();
        var harness = new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Active(current).Build())
            .WithPlan(current).WithUnknownPlan(unknownId);

        Assert.ThrowsAsync<NotFoundException>(() => harness.Build().ChangePlanAsync(new ChangePlanRequest(unknownId)));
    }

    // ── Preview: mesma regra, sem executar nada ─────────────────────────────────────────────

    // O diálogo nunca pode oferecer uma troca que o POST recusaria — preview e execução compartilham
    // o ResolveChangeAsync.
    [Test]
    public void Preview_AppliesTheSameValidationsAsExecution()
    {
        var current = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Active(current).Build())
            .WithPlan(current);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build()
            .PreviewChangePlanAsync(new ChangePlanRequest(current.Id)));
    }

    [Test]
    public async Task Preview_Upgrade_ReturnsProrationWithoutChangingAnything()
    {
        var current = PlanBuilder.Essential().Build();
        var target = PlanBuilder.Professional().Build();
        var sub = SubscriptionBuilder.Active(current).Build();
        var nextCharge = DateTime.UtcNow.AddDays(20);
        var harness = new SubscriptionHarness()
            .WithSubscription(sub).WithPlan(current).WithPlan(target)
            .WhenUpgradePreviewed(nextCharge, amountDueNowCents: 1247);

        var result = await harness.Build().PreviewChangePlanAsync(new ChangePlanRequest(target.Id));

        Assert.Multiple(() =>
        {
            Assert.That(result.AmountDueNowCents, Is.EqualTo(1247));
            Assert.That(result.NextChargeAt, Is.EqualTo(nextCharge));
            Assert.That(result.Scheduled, Is.False);
            Assert.That(sub.PlanId, Is.EqualTo(current.Id), "Simular não pode trocar o plano.");
        });
        harness.Gateway.Verify(g => g.UpgradeSubscriptionAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        harness.Subscriptions.Verify(r => r.UpdateAsync(It.IsAny<Subscription>()), Times.Never);
    }

    // Quando o gateway não sabe simular, a UI mostra uma mensagem genérica em vez de inventar valor.
    [Test]
    public async Task Preview_WhenGatewayCannotSimulate_ReturnsNullAmount()
    {
        var current = PlanBuilder.Essential().Build();
        var target = PlanBuilder.Professional().Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Active(current).Build())
            .WithPlan(current).WithPlan(target)
            .WhenUpgradePreviewed(nextChargeAt: null, amountDueNowCents: null);

        var result = await harness.Build().PreviewChangePlanAsync(new ChangePlanRequest(target.Id));

        Assert.That(result.AmountDueNowCents, Is.Null, "Melhor uma mensagem genérica que um valor inventado.");
    }

    [Test]
    public async Task Preview_ScheduledChange_ReportsZeroAndTheTurnoverDate()
    {
        var current = PlanBuilder.Professional().Build();
        var target = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Active(current).WithPeriodEnd(PeriodEnd).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(current).WithPlan(target);

        var result = await harness.Build().PreviewChangePlanAsync(new ChangePlanRequest(target.Id));

        Assert.Multiple(() =>
        {
            Assert.That(result.Scheduled, Is.True);
            Assert.That(result.AmountDueNowCents, Is.EqualTo(0));
            Assert.That(result.EffectiveAt, Is.EqualTo(PeriodEnd));
        });
        harness.Gateway.Verify(g => g.ScheduleDowngradeAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never,
            "Simular não pode criar agendamento no gateway.");
    }
}
