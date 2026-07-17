using Moq;
using PDV.Application.DTOs.Payments;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Billing;

// Fluxo: o gateway avisa que a assinatura mudou (docs/subscriptions.md §9).
// Eventos `customer.subscription.*` são RECONCILIAÇÃO: aplica-se o objeto inteiro do evento, não um
// delta. Duas regras mandam aqui e são a fonte de quase todo bug de billing:
//   1. toda data vem do EVENTO, nunca de UtcNow;
//   2. um evento mais velho que o último aplicado é descartado (GatewaySyncedAt).
[TestFixture]
public class WebhookReconciliationTests
{
    // Datas fixas: o service nunca lê o relógio para calcular período, então o teste também não deve.
    private static readonly DateTime EventTime = new(2026, 03, 10, 12, 00, 00, DateTimeKind.Utc);
    private static readonly DateTime PeriodEnd = new(2026, 04, 10, 12, 00, 00, DateTimeKind.Utc);

    // ── C1: ativação (customer.subscription.created) ────────────────────────────────────────

    [Test]
    public async Task C1_SubscriptionCreated_ActivatesAndAnchorsStartedAtOnTheEvent()
    {
        var sub = SubscriptionBuilder.Pending().Build();
        sub.StartedAt = null;
        var plan = PlanBuilder.Essential().Build();
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, plan);

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionCompleted, EventTime,
            GatewaySubscriptionStatuses.Active, currentPeriodEnd: PeriodEnd));

        Assert.Multiple(() =>
        {
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Active));
            Assert.That(sub.StartedAt, Is.EqualTo(EventTime),
                "StartedAt ancora a janela de reembolso na data do EVENTO, não em UtcNow.");
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(PeriodEnd));
            Assert.That(sub.TrialEndsAt, Is.Null, "Assinatura paga não carrega data de teste.");
        });
    }

    // D3: voltar a ter acesso cancela a exclusão agendada na hora — sem esperar a varredura horária.
    [Test]
    public async Task D3_SubscriptionActivated_ClearsScheduledDeletionImmediately()
    {
        var sub = SubscriptionBuilder.Expired().Build();
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, PlanBuilder.Essential().Build());

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime,
            GatewaySubscriptionStatuses.Active, currentPeriodEnd: PeriodEnd));

        harness.Retention.Verify(r => r.ClearScheduledDeletionForOwnerAsync(sub.UserId), Times.Once);
    }

    // ── R1/RF-25: renovação estende o período mas NÃO reabre a janela de reembolso ──────────

    [Test]
    public async Task R1_Renewal_ExtendsPeriodFromEventAndPreservesStartedAt()
    {
        var originalStart = new DateTime(2026, 01, 10, 12, 00, 00, DateTimeKind.Utc);
        var sub = SubscriptionBuilder.Active().WithStartedAt(originalStart).Build();
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, PlanBuilder.Essential().Build());

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime,
            GatewaySubscriptionStatuses.Active, currentPeriodEnd: PeriodEnd));

        Assert.Multiple(() =>
        {
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(PeriodEnd));
            Assert.That(sub.StartedAt, Is.EqualTo(originalStart),
                "Renovar não reabre os 7 dias de arrependimento (X5).");
        });
    }

    // ── R8: entrega fora de ordem (a defesa do GatewaySyncedAt) ─────────────────────────────

    // Onde R7 (webhook duplicado) realmente é barrado: NÃO é aqui. `IsStale` usa
    // `EventCreatedAt >= synced`, então uma reentrega — que carrega o MESMO event.created —
    // atravessa e reconcilia de novo. Quem protege R7 é a idempotência por `EventId` no
    // WebhooksController (`ProcessedEventExistsAsync`, CG-11), antes deste service ser chamado.
    //
    // Este teste fixa o limite exato do `>=`: mesmo timestamp reconcilia. Reconciliar é idempotente
    // por natureza (aplica o objeto inteiro), então o efeito é inofensivo — mas quem trocar `>=` por
    // `>` aqui vai descartar a reconciliação legítima de dois eventos do mesmo instante.
    [Test]
    public async Task EventWithSameTimestampAsLastApplied_IsNotStale_AndReconciles()
    {
        var sub = SubscriptionBuilder.Active().Build();
        sub.GatewaySyncedAt = EventTime;
        sub.CurrentPeriodEnd = PeriodEnd;
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, PlanBuilder.Essential().Build());

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime,
            GatewaySubscriptionStatuses.Active, currentPeriodEnd: PeriodEnd.AddMonths(1)));

        Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(PeriodEnd.AddMonths(1)),
            "Empate no timestamp passa pelo `>=` — a proteção contra duplicata é o EventId no controller.");
    }

    // O caso que o GatewaySyncedAt existe para resolver: um evento antigo chegando atrasado não
    // pode reescrever um estado mais novo.
    [Test]
    public async Task R8_EventOlderThanLastApplied_IsDiscarded()
    {
        var sub = SubscriptionBuilder.Active().Build();
        sub.GatewaySyncedAt = EventTime;
        sub.CurrentPeriodEnd = PeriodEnd;
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, PlanBuilder.Essential().Build());

        // Evento gerado 6h ANTES do último aplicado, com período anterior.
        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime.AddHours(-6),
            GatewaySubscriptionStatuses.Active, currentPeriodEnd: PeriodEnd.AddMonths(-1)));

        Assert.Multiple(() =>
        {
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(PeriodEnd),
                "O período não pode retroceder por causa de um webhook atrasado.");
            Assert.That(sub.GatewaySyncedAt, Is.EqualTo(EventTime), "O marcador de sync não retrocede.");
        });
    }

    // Mesmo descartado, o evento tem de ser registrado como processado — senão o gateway retenta
    // para sempre.
    [Test]
    public async Task StaleEvent_IsStillRecordedAsProcessed()
    {
        var sub = SubscriptionBuilder.Active().Build();
        sub.GatewaySyncedAt = EventTime;
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, PlanBuilder.Essential().Build());

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime.AddHours(-6),
            GatewaySubscriptionStatuses.Active, eventId: "evt_atrasado"));

        Assert.That(harness.StagedEvent?.EventId, Is.EqualTo("evt_atrasado"));
        harness.Repo.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    // ── R2/P9: promoção do plano agendado ───────────────────────────────────────────────────

    // Na virada, o preço vigente no gateway passa a ser o do plano agendado. A promoção acontece
    // ANTES do cálculo do período, por construção — o período vem do próprio evento.
    [Test]
    public async Task P9_RenewalConsumesScheduledDowngrade_PromotesPendingPlan()
    {
        var current = PlanBuilder.Professional().Build();
        var scheduled = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Active(current).WithPendingPlan(scheduled).Build();

        const string newPrice = "price_essencial_mensal";
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(newPrice, scheduled);

        // O schedule foi consumido: o gateway não manda mais ScheduleId.
        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime,
            GatewaySubscriptionStatuses.Active, priceId: newPrice,
            currentPeriodEnd: PeriodEnd, scheduleId: null));

        Assert.Multiple(() =>
        {
            Assert.That(sub.PlanId, Is.EqualTo(scheduled.Id), "O plano vigente é o do preço cobrado.");
            Assert.That(sub.PendingPlanId, Is.Null, "O agendamento se consumou.");
            Assert.That(sub.GatewayScheduleId, Is.Null);
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(PeriodEnd));
        });
    }

    // Troca feita fora do app (direto no painel do Stripe): reconcilia de graça, porque a verdade é
    // o preço vigente.
    [Test]
    public async Task PriceChangedOutsideTheApp_ReconcilesPlanFromCurrentPrice()
    {
        var oldPlan = PlanBuilder.Essential().Build();
        var newPlan = PlanBuilder.Professional().Build();
        var sub = SubscriptionBuilder.Active(oldPlan).Build();

        const string proPrice = "price_profissional_mensal";
        var harness = new WebhookHarness().WithSubscription(sub).WithPlanForPrice(proPrice, newPlan);

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime,
            GatewaySubscriptionStatuses.Active, priceId: proPrice, currentPeriodEnd: PeriodEnd));

        Assert.That(sub.PlanId, Is.EqualTo(newPlan.Id));
    }

    // P11: preço fora do catálogo (plano removido) — mantém o atual em vez de zerar o acesso.
    [Test]
    public async Task P11_PriceNotInCatalog_KeepsCurrentPlan()
    {
        var plan = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Active(plan).Build();
        var harness = new WebhookHarness().WithSubscription(sub).WithUnknownPrice("price_fantasma");

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime,
            GatewaySubscriptionStatuses.Active, priceId: "price_fantasma", currentPeriodEnd: PeriodEnd));

        Assert.That(sub.PlanId, Is.EqualTo(plan.Id), "Preço desconhecido não pode derrubar o plano vigente.");
    }

    // O agendamento é sempre o que o gateway diz: sumiu lá, sumiu aqui.
    [Test]
    public async Task ScheduleReleasedAtGateway_ClearsPendingPlan()
    {
        var current = PlanBuilder.Professional().Build();
        var sub = SubscriptionBuilder.Active(current).WithPendingPlan(PlanBuilder.Essential().Build()).Build();
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, current);

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime,
            GatewaySubscriptionStatuses.Active, currentPeriodEnd: PeriodEnd, scheduleId: null));

        Assert.Multiple(() =>
        {
            Assert.That(sub.PendingPlanId, Is.Null);
            Assert.That(sub.GatewayScheduleId, Is.Null);
        });
    }

    // ── R3/RF-27: dunning não mexe no status da assinatura ──────────────────────────────────

    // O acesso já caiu sozinho (o período venceu). Marcar Expired aqui impediria a recuperação numa
    // retentativa bem-sucedida (R5).
    [TestCase(GatewaySubscriptionStatuses.PastDue)]
    [TestCase(GatewaySubscriptionStatuses.Unpaid)]
    [TestCase(GatewaySubscriptionStatuses.Paused)]
    public async Task RF27_DunningStatuses_LeaveSubscriptionUntouched(string gatewayStatus)
    {
        var sub = SubscriptionBuilder.Active().Build();
        var originalPeriodEnd = sub.CurrentPeriodEnd;
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, PlanBuilder.Essential().Build());

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime, gatewayStatus));

        Assert.Multiple(() =>
        {
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Active), "Pode se recuperar numa retentativa.");
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(originalPeriodEnd));
        });
    }

    // 3DS pendente: o 1º pagamento ainda não confirmou.
    [Test]
    public async Task Incomplete_KeepsSubscriptionPending()
    {
        var sub = SubscriptionBuilder.Pending().Build();
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, PlanBuilder.Essential().Build());

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime, GatewaySubscriptionStatuses.Incomplete));

        Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Pending));
    }

    // C7: o cartão nunca confirmou e a janela fechou.
    [Test]
    public async Task C7_IncompleteExpired_ExpiresWithPeriodFromEvent()
    {
        var sub = SubscriptionBuilder.Pending().Build();
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, PlanBuilder.Essential().Build());

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime, GatewaySubscriptionStatuses.IncompleteExpired));

        Assert.Multiple(() =>
        {
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Expired));
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(EventTime));
        });
    }

    // ── Resolução e idempotência ────────────────────────────────────────────────────────────

    // Evento de outra conta (ou que chegou antes da nossa linha existir): não pode explodir nem
    // inventar assinatura — só registra e segue.
    [Test]
    public async Task UnresolvedSubscription_IsANoOpButStillRecordsTheEvent()
    {
        var harness = new WebhookHarness().WithoutSubscription();

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime,
            GatewaySubscriptionStatuses.Active, eventId: "evt_orfao"));

        Assert.That(harness.StagedEvent?.EventId, Is.EqualTo("evt_orfao"));
        harness.Repo.Verify(r => r.AddPaymentAsync(It.IsAny<Payment>()), Times.Never);
    }

    // CG-12: o estado aplicado e o registro do evento vão no MESMO SaveChanges. Se a gravação
    // falhar, nada persiste e o gateway pode reenviar com segurança.
    [Test]
    public async Task EveryEvent_StagesTheRecordAndSavesOnce()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var harness = new WebhookHarness()
            .WithSubscription(sub)
            .WithPlanForPrice(WebhookEvents.PriceId, PlanBuilder.Essential().Build());

        await harness.Build().ProcessAsync(WebhookEvents.Subscription(
            PaymentWebhookType.SubscriptionUpdated, EventTime,
            GatewaySubscriptionStatuses.Active, eventId: "evt_xyz"));

        Assert.Multiple(() =>
        {
            Assert.That(harness.StagedEvent, Is.Not.Null);
            Assert.That(harness.StagedEvent!.EventId, Is.EqualTo("evt_xyz"));
            Assert.That(harness.StagedEvent.Provider, Is.EqualTo("Stripe"));
            Assert.That(harness.StagedEvent.Status, Is.EqualTo("Processed"));
        });
        harness.Repo.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    // Evento que não tratamos não pode quebrar o pipeline nem deixar de ser registrado.
    [Test]
    public async Task UnknownEventType_IsRecordedAndIgnored()
    {
        var harness = new WebhookHarness();

        await harness.Build().ProcessAsync(new PaymentWebhookEvent(
            Type: PaymentWebhookType.Unknown,
            Provider: "Stripe",
            RawEventType: "customer.discount.created",
            EventId: "evt_desconhecido",
            EventCreatedAt: EventTime,
            Metadata: new Dictionary<string, string>()));

        Assert.That(harness.StagedEvent?.EventId, Is.EqualTo("evt_desconhecido"));
    }
}
