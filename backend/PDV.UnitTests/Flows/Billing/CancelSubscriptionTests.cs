using Moq;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Billing;

// Fluxo: o usuário cancela a assinatura — docs/subscriptions.md §8.7–8.8, cenários X1–X6.
// A matriz é de três desfechos, e a diferença entre eles é dinheiro:
//   trial            → acesso cai agora, nada a estornar
//   pago, ≤ 7 dias   → acesso cai agora + ESTORNO emitido
//   pago, > 7 dias   → acesso até o fim do período, sem estorno
[TestFixture]
public class CancelSubscriptionTests
{
    private static Payment PaidCharge(Guid subId, Guid userId, int amountCents = 2999, string chargeId = "pi_test_123") =>
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SubscriptionId = subId,
            GatewayChargeId = chargeId,
            Status = PaymentStatus.Paid,
            AmountCents = amountCents,
        };

    // ── T5: cancelar no trial ───────────────────────────────────────────────────────────────

    [Test]
    public async Task T5_CancelDuringTrial_ExpiresNowWithoutRefund()
    {
        var sub = SubscriptionBuilder.Trialing(daysLeft: 12).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub);

        var result = await harness.Build().CancelAsync();

        Assert.Multiple(() =>
        {
            Assert.That(result.Status, Is.EqualTo("Expired"));
            Assert.That(result.RefundRequested, Is.False, "Não houve cobrança — não há o que estornar.");
            Assert.That(result.AccessUntil, Is.Null, "O acesso cai na hora.");
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Expired));
            Assert.That(sub.TrialEndsAt, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromSeconds(5)));
        });
        harness.Gateway.Verify(g => g.RefundAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // O trial é PDV-side: o gateway nunca soube dessa assinatura.
    [Test]
    public async Task T5_CancelDuringTrial_NeverCallsTheGateway()
    {
        var harness = new SubscriptionHarness().WithSubscription(SubscriptionBuilder.Trialing().Build());

        await harness.Build().CancelAsync();

        harness.Gateway.Verify(g => g.CancelSubscriptionAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // Cancelar nunca desativa a loja nem desloga (RF-40) — o usuário fica os 90 dias de retenção
    // para exportar dados ou reassinar.
    [Test]
    public async Task Cancel_ReportsDataRetentionWindow()
    {
        var harness = new SubscriptionHarness().WithSubscription(SubscriptionBuilder.Trialing().Build());

        var result = await harness.Build().CancelAsync();

        Assert.That(result.DataAvailableUntil,
            Is.EqualTo(DateTime.UtcNow.AddDays(RetentionDefaults.DaysAfterAccessLoss)).Within(TimeSpan.FromMinutes(1)));
    }

    // ── X1: cancelar dentro da janela de 7 dias ─────────────────────────────────────────────

    [Test]
    public async Task X1_CancelWithinRefundWindow_RequestsRefundAndCutsAccessNow()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 3).Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(sub)
            .WithPaidCharges(PaidCharge(sub.Id, sub.UserId));

        var result = await harness.Build().CancelAsync();

        Assert.Multiple(() =>
        {
            Assert.That(result.Status, Is.EqualTo("RefundRequested"));
            Assert.That(result.RefundRequested, Is.True);
            Assert.That(result.AccessUntil, Is.Null, "Devolveu o dinheiro → o acesso cai na hora.");
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.RefundRequested),
                "Estado transitório: o webhook de estorno é quem vira para Expired.");
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromSeconds(5)));
        });
        harness.Gateway.Verify(g => g.RefundAsync("pi_test_123", It.IsAny<CancellationToken>()), Times.Once);
    }

    // Dentro de 7 dias pode haver a fatura inicial MAIS a proporcional de um upgrade — as duas voltam.
    [Test]
    public async Task X1_RefundsEveryPaidChargeSinceStartedAt()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 3).Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(sub)
            .WithPaidCharges(
                PaidCharge(sub.Id, sub.UserId, 2999, "pi_fatura_inicial"),
                PaidCharge(sub.Id, sub.UserId, 1247, "pi_proporcional_upgrade"));

        await harness.Build().CancelAsync();

        harness.Gateway.Verify(g => g.RefundAsync("pi_fatura_inicial", It.IsAny<CancellationToken>()), Times.Once);
        harness.Gateway.Verify(g => g.RefundAsync("pi_proporcional_upgrade", It.IsAny<CancellationToken>()), Times.Once);
    }

    // Cobrança de valor zero (cupom de 100%) não é estornável.
    [Test]
    public async Task X1_ZeroAmountCharge_IsNotRefunded()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 3).Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(sub)
            .WithPaidCharges(PaidCharge(sub.Id, sub.UserId, amountCents: 0, chargeId: "in_cupom_100"));

        await harness.Build().CancelAsync();

        harness.Gateway.Verify(g => g.RefundAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // Se o estorno falha, o cancelamento NÃO é desfeito: a recorrência já morreu no gateway e a
    // assinatura fica em RefundRequested até alguém resolver no painel. O log é o alarme.
    [Test]
    public async Task X1_WhenRefundFails_CancellationIsNotRolledBack()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 3).Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(sub)
            .WithPaidCharges(PaidCharge(sub.Id, sub.UserId));
        harness.Gateway.Setup(g => g.RefundAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new PaymentGatewayException("charge already refunded"));

        var result = await harness.Build().CancelAsync();

        Assert.Multiple(() =>
        {
            Assert.That(result.Status, Is.EqualTo("RefundRequested"));
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.RefundRequested),
                "Fica travada aqui de propósito: bloqueia reassinatura até o estorno ser resolvido.");
        });
    }

    // ── X3/X4: cancelar fora da janela ──────────────────────────────────────────────────────

    [Test]
    public async Task X3_CancelOutsideRefundWindow_KeepsAccessUntilPeriodEnd()
    {
        var periodEnd = DateTime.UtcNow.AddDays(20);
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 40).WithPeriodEnd(periodEnd).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub);

        var result = await harness.Build().CancelAsync();

        Assert.Multiple(() =>
        {
            Assert.That(result.Status, Is.EqualTo("Canceled"));
            Assert.That(result.RefundRequested, Is.False);
            Assert.That(result.AccessUntil, Is.EqualTo(periodEnd), "O período já pago é honrado.");
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(periodEnd), "O período NÃO é truncado.");
        });
        harness.Gateway.Verify(g => g.RefundAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // X4: um anual cancelado no dia 200 mantém os ~165 dias restantes.
    [Test]
    public async Task X4_AnnualCancelledMidCycle_KeepsTheRemainingMonths()
    {
        var periodEnd = DateTime.UtcNow.AddDays(165);
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 200).WithPeriodEnd(periodEnd).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub);

        var result = await harness.Build().CancelAsync();

        Assert.That(result.AccessUntil, Is.EqualTo(periodEnd));
    }

    // A retenção conta do FIM do acesso, não do cancelamento (D4).
    [Test]
    public async Task X3_DataRetentionCountsFromEndOfPaidPeriod()
    {
        var periodEnd = DateTime.UtcNow.AddDays(20);
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 40).WithPeriodEnd(periodEnd).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub);

        var result = await harness.Build().CancelAsync();

        Assert.That(result.DataAvailableUntil,
            Is.EqualTo(periodEnd.AddDays(RetentionDefaults.DaysAfterAccessLoss)).Within(TimeSpan.FromSeconds(5)));
    }

    // ── X5/X6: a janela conta de StartedAt ──────────────────────────────────────────────────

    // Renovar não reabre a janela: quem assinou há 40 dias e renovou ontem está FORA.
    [Test]
    public async Task X5_RenewedYesterdayButStartedLongAgo_IsOutsideTheWindow()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 40).WithPeriodEnd(DateTime.UtcNow.AddDays(29)).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub);

        var result = await harness.Build().CancelAsync();

        Assert.That(result.Status, Is.EqualTo("Canceled"), "A renovação não move o StartedAt (RF-25).");
    }

    // Reativar grava um StartedAt novo: cancelar 2 dias depois está DENTRO.
    [Test]
    public async Task X6_ReactivatedTwoDaysAgo_IsInsideTheWindow()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 2).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPaidCharges(PaidCharge(sub.Id, sub.UserId));

        var result = await harness.Build().CancelAsync();

        Assert.That(result.Status, Is.EqualTo("RefundRequested"));
    }

    // Quase no fim da janela: 7 dias menos um minuto ainda estorna.
    //
    // O instante EXATO da borda (`StartedAt + 7d == now`) não é testável de forma determinística:
    // o service lê `DateTime.UtcNow` alguns milissegundos depois do arrange, então a deadline já
    // passou quando a comparação roda. Testar isso exigiria um `TimeProvider` injetado — hoje não
    // existe. A margem de 1 minuto mantém o teste honesto em vez de flaky.
    [Test]
    public async Task RefundWindow_JustInsideTheBoundary_StillRefunds()
    {
        var sub = SubscriptionBuilder.Active()
            .WithStartedAt(DateTime.UtcNow.AddDays(-RefundDefaults.WindowDays).AddMinutes(1))
            .Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPaidCharges(PaidCharge(sub.Id, sub.UserId));

        var result = await harness.Build().CancelAsync();

        Assert.That(result.Status, Is.EqualTo("RefundRequested"));
    }

    [Test]
    public async Task RefundWindow_JustPastTheBoundary_DoesNotRefund()
    {
        var sub = SubscriptionBuilder.Active()
            .WithStartedAt(DateTime.UtcNow.AddDays(-RefundDefaults.WindowDays).AddMinutes(-5))
            .WithPeriodEnd(DateTime.UtcNow.AddDays(23))
            .Build();
        var harness = new SubscriptionHarness().WithSubscription(sub);

        var result = await harness.Build().CancelAsync();

        Assert.That(result.Status, Is.EqualTo("Canceled"));
    }

    // ── Ordem e recusas ─────────────────────────────────────────────────────────────────────

    // RF-38: encerra a recorrência no gateway ANTES de mexer no estado local. Se a persistência
    // falhar depois, o pior caso é um estado local defasado — não uma cobrança indevida.
    [Test]
    public async Task RF38_Cancel_StopsTheGatewayRecurrenceBeforePersistingLocalState()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 40).Build();
        sub.GatewaySubscriptionId = "sub_viva_123";
        var harness = new SubscriptionHarness().WithSubscription(sub);

        var calls = new List<string>();
        harness.Gateway.Setup(g => g.CancelSubscriptionAsync("sub_viva_123", It.IsAny<CancellationToken>()))
               .Callback(() => calls.Add("gateway-cancel")).Returns(Task.CompletedTask);
        harness.Subscriptions.Setup(r => r.UpdateAsync(It.IsAny<Subscription>()))
               .Callback(() => calls.Add("local-save")).Returns(Task.CompletedTask);

        await harness.Build().CancelAsync();

        Assert.That(calls, Is.EqualTo(new[] { "gateway-cancel", "local-save" }));
    }

    // P10: o agendamento morre com a assinatura.
    [Test]
    public async Task P10_Cancel_ClearsAnyScheduledPlanChange()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 40)
            .WithPendingPlan(PlanBuilder.Essential().Build()).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub);

        await harness.Build().CancelAsync();

        Assert.Multiple(() =>
        {
            Assert.That(sub.PendingPlanId, Is.Null);
            Assert.That(sub.GatewayScheduleId, Is.Null);
        });
    }

    [TestCase(SubscriptionStatus.Expired)]
    [TestCase(SubscriptionStatus.Canceled)]
    [TestCase(SubscriptionStatus.Pending)]
    [TestCase(SubscriptionStatus.RefundRequested)]
    public void Cancel_OnNonLiveSubscription_IsRejected(SubscriptionStatus status)
    {
        var sub = status switch
        {
            SubscriptionStatus.Expired => SubscriptionBuilder.Expired().Build(),
            SubscriptionStatus.Canceled => SubscriptionBuilder.Canceled().Build(),
            SubscriptionStatus.Pending => SubscriptionBuilder.Pending().Build(),
            _ => SubscriptionBuilder.RefundRequested().Build(),
        };
        var harness = new SubscriptionHarness().WithSubscription(sub);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().CancelAsync());

        Assert.That(ex.Message, Is.EqualTo("Nenhuma assinatura ativa para cancelar."));
    }

    [Test]
    public void Cancel_WithoutAnySubscription_IsRejected()
    {
        var harness = new SubscriptionHarness().WithSubscription(null);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CancelAsync());
    }
}
