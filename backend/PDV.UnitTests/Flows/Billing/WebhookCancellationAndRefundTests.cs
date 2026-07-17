using PDV.Application.DTOs.Payments;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Billing;

// Fluxo: o gateway avisa que a assinatura acabou, ou que o dinheiro voltou
// (docs/subscriptions.md §8.7–8.8, cenários X1–X11, R6).
// A pergunta cara: **derruba o acesso ou não?** Errar para "derruba" corta quem está em dia por
// causa de um estorno antigo; errar para "não derruba" dá serviço de graça a quem pediu o dinheiro
// de volta.
[TestFixture]
public class WebhookCancellationAndRefundTests
{
    private static readonly DateTime EventTime = new(2026, 03, 10, 12, 00, 00, DateTimeKind.Utc);

    private static Payment PaidPayment(Guid subId, Guid userId, DateTime? periodEnd, string chargeId = "pi_test_123") =>
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SubscriptionId = subId,
            GatewayChargeId = chargeId,
            GatewayInvoiceId = "in_test_123",
            Status = PaymentStatus.Paid,
            AmountCents = 2999,
            PeriodEnd = periodEnd,
        };

    // ── X3: cancelamento voluntário preserva o período pago ─────────────────────────────────

    [Test]
    public async Task X3_VoluntaryCancellation_KeepsAccessUntilPeriodEnd()
    {
        var periodEnd = EventTime.AddDays(20);
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 40).WithPeriodEnd(periodEnd).Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.Cancelled(EventTime));

        Assert.Multiple(() =>
        {
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Canceled));
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(periodEnd),
                "Cancelar só interrompe as próximas faturas — o já pago é honrado.");
            Assert.That(sub.CanceledAt, Is.EqualTo(EventTime));
        });
    }

    // P10: o agendamento morre junto com a assinatura.
    [Test]
    public async Task P10_Cancellation_KillsTheScheduledPlanChange()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 40)
            .WithPendingPlan(PlanBuilder.Essential().Build()).Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.Cancelled(EventTime));

        Assert.Multiple(() =>
        {
            Assert.That(sub.PendingPlanId, Is.Null);
            Assert.That(sub.GatewayScheduleId, Is.Null);
        });
    }

    // ── R6/RF-28: cancelamento involuntário não ganha cortesia ──────────────────────────────

    // As tentativas de cobrança se esgotaram: não há período pago a honrar. Se caísse no caminho
    // voluntário, o inadimplente ficaria com acesso até o fim de um ciclo que nunca pagou.
    [Test]
    public async Task R6_CancelledDueToPaymentFailure_ExpiresImmediately()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 40).WithPeriodEnd(EventTime.AddDays(20)).Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(
            WebhookEvents.Cancelled(EventTime, cancelledDueTo: CancelReasons.PaymentFailed));

        Assert.Multiple(() =>
        {
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Expired));
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(EventTime), "Sem cortesia: o acesso acaba agora.");
        });
    }

    // Checkout abandonado / cartão recusado: nunca chegou a valer. Sem este caminho, um Canceled
    // com CurrentPeriodEnd nulo daria acesso PARA SEMPRE (IsEntitledAt trata null como "sem fim").
    [Test]
    public async Task NeverPaidSubscription_Cancelled_ExpiresInsteadOfGrantingForeverAccess()
    {
        var sub = SubscriptionBuilder.Pending().Build();
        sub.StartedAt = null;
        sub.CurrentPeriodEnd = null;
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.Cancelled(EventTime));

        Assert.Multiple(() =>
        {
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Expired));
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(EventTime));
            Assert.That(sub.IsEntitledAt(EventTime.AddDays(1)), Is.False,
                "A prova: sem período pago, o acesso não pode sobreviver ao cancelamento.");
        });
    }

    // ── X9: eco do cancelamento durante um estorno em trânsito ──────────────────────────────

    // Cancelamos dentro da janela e emitimos o estorno → RefundRequested. O gateway ecoa o
    // cancelamento. Esse eco não pode virar "Canceled" (que dá acesso até o fim do período): o
    // estado final é ditado pelo evento de estorno.
    [Test]
    public async Task X9_CancellationEchoWhileRefundPending_PreservesRefundRequested()
    {
        var sub = SubscriptionBuilder.RefundRequested().Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.Cancelled(EventTime));

        Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.RefundRequested),
            "O eco do cancelamento espera o estorno se consumar.");
    }

    // ── X2: o estorno se consuma ────────────────────────────────────────────────────────────

    [Test]
    public async Task X2_RefundSettles_MarksPaymentRefundedAndExpiresSubscription()
    {
        var sub = SubscriptionBuilder.RefundRequested().Build();
        var payment = PaidPayment(sub.Id, sub.UserId, periodEnd: EventTime.AddDays(25));
        var harness = new WebhookHarness().WithSubscription(sub).WithPayment(payment);

        await harness.Build().ProcessAsync(WebhookEvents.Reversed(
            PaymentWebhookType.CheckoutRefunded, EventTime, reversedInFull: true));

        Assert.Multiple(() =>
        {
            Assert.That(payment.Status, Is.EqualTo(PaymentStatus.Refunded));
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Expired));
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(EventTime));
        });
    }

    // ── X7/X8: quando o estorno derruba o acesso ────────────────────────────────────────────

    // Chargeback da cobrança que custeia o período corrente: reversão total → derruba.
    [Test]
    public async Task X7_ChargebackOnCurrentPeriod_ExpiresSubscription()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 20).WithPeriodEnd(EventTime.AddDays(10)).Build();
        var payment = PaidPayment(sub.Id, sub.UserId, periodEnd: EventTime.AddDays(10));
        var harness = new WebhookHarness().WithSubscription(sub).WithPayment(payment);

        await harness.Build().ProcessAsync(WebhookEvents.Reversed(
            PaymentWebhookType.CheckoutDisputed, EventTime, reversedInFull: true));

        Assert.Multiple(() =>
        {
            Assert.That(payment.Status, Is.EqualTo(PaymentStatus.Disputed));
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Expired));
        });
    }

    // O caso oposto e mais fácil de errar: estornar uma cobrança de um ciclo ANTIGO de quem hoje
    // está em dia. O dinheiro volta, mas o acesso corrente não é afetado.
    [Test]
    public async Task X8_RefundOnOldChargeOfActiveSubscriber_PreservesAccess()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 20).WithPeriodEnd(EventTime.AddDays(10)).Build();
        // Cobrança de um período que já terminou.
        var payment = PaidPayment(sub.Id, sub.UserId, periodEnd: EventTime.AddDays(-40));
        var harness = new WebhookHarness().WithSubscription(sub).WithPayment(payment);

        await harness.Build().ProcessAsync(WebhookEvents.Reversed(
            PaymentWebhookType.CheckoutRefunded, EventTime, reversedInFull: true));

        Assert.Multiple(() =>
        {
            Assert.That(payment.Status, Is.EqualTo(PaymentStatus.Refunded), "A cobrança volta como estornada.");
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Active), "Mas quem está em dia não perde acesso.");
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(EventTime.AddDays(10)));
        });
    }

    // Estorno PARCIAL (ex.: cortesia de alguns reais) não é rescisão — não derruba nada.
    [Test]
    public async Task PartialRefund_OnCurrentPeriod_DoesNotRevokeAccess()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 20).WithPeriodEnd(EventTime.AddDays(10)).Build();
        var payment = PaidPayment(sub.Id, sub.UserId, periodEnd: EventTime.AddDays(10));
        var harness = new WebhookHarness().WithSubscription(sub).WithPayment(payment);

        await harness.Build().ProcessAsync(WebhookEvents.Reversed(
            PaymentWebhookType.CheckoutRefunded, EventTime, reversedInFull: false));

        Assert.Multiple(() =>
        {
            Assert.That(payment.Status, Is.EqualTo(PaymentStatus.Refunded));
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Active));
        });
    }

    // Conservador: estorno de uma cobrança que não está no nosso histórico. Não dá para saber qual
    // período foi revertido → derruba (melhor cortar acesso e revisar do que servir de graça).
    //
    // O `charge.refunded` chega até a assinatura pelo `cus_...` mesmo sem Payment — é o que torna
    // este caminho (`payment is null` em RevokesAccess) alcançável de verdade.
    [Test]
    public async Task RefundOfUnknownCharge_RevokesAccessConservatively()
    {
        const string customerId = "cus_test_123";
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 20).WithPeriodEnd(EventTime.AddDays(10)).Build();
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .ReachableByCustomer(customerId);   // nenhum Payment casa com o pi_

        await harness.Build().ProcessAsync(WebhookEvents.Reversed(
            PaymentWebhookType.CheckoutRefunded, EventTime, reversedInFull: true,
            chargeId: "pi_desconhecido", customerId: customerId));

        Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Expired),
            "Sem saber o que foi revertido, o seguro é revogar.");
    }

    // O limite real do "conservador": uma DISPUTA de cobrança fora do histórico não revoga nada —
    // e não por decisão, mas porque não há como chegar à assinatura. O `charge.dispute.created` do
    // Stripe carrega só o PaymentIntent (sem `customer`, sem `sub_`), então a única ponte é a linha
    // de Payment; sem ela, `ResolveSubscriptionAsync` devolve null e o handler é no-op.
    //
    // Na prática isso só acontece se a cobrança nunca foi registrada (o `invoice.paid` se perdeu),
    // que já é a condição de alarme do CG-18. Fixado aqui para que a assimetria seja intencional e
    // visível, em vez de uma surpresa durante um chargeback real.
    [Test]
    public async Task DisputeOfChargeMissingFromHistory_CannotResolveSubscription_IsNoOp()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 20).WithPeriodEnd(EventTime.AddDays(10)).Build();
        var harness = new WebhookHarness().WithSubscription(sub);   // dispute não traz cus_

        await harness.Build().ProcessAsync(WebhookEvents.Reversed(
            PaymentWebhookType.CheckoutDisputed, EventTime, reversedInFull: true,
            chargeId: "pi_desconhecido"));

        Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Active),
            "Sem Payment e sem cus_, a disputa não encontra a assinatura — nada é aplicado.");
    }

    // A assinatura aguardando estorno cai mesmo que a reversão seja parcial ou de outro período:
    // foi ela quem pediu o dinheiro de volta.
    [Test]
    public async Task RefundRequested_AnyReversal_RevokesAccess()
    {
        var sub = SubscriptionBuilder.RefundRequested().Build();
        var payment = PaidPayment(sub.Id, sub.UserId, periodEnd: EventTime.AddDays(-40));
        var harness = new WebhookHarness().WithSubscription(sub).WithPayment(payment);

        await harness.Build().ProcessAsync(WebhookEvents.Reversed(
            PaymentWebhookType.CheckoutRefunded, EventTime, reversedInFull: false));

        Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Expired));
    }
}
