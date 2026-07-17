using Moq;
using PDV.Application.DTOs.Payments;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Billing;

// Fluxo: registrar o dinheiro que entrou (ou não) — docs/subscriptions.md §8.3–8.5, §9.
// O histórico de cobranças é o extrato do cliente: uma linha duplicada vira "fui cobrado duas
// vezes", e uma linha faltando vira dinheiro que entrou sem registro (CG-18).
[TestFixture]
public class WebhookPaymentTests
{
    private static readonly DateTime EventTime = new(2026, 03, 10, 12, 00, 00, DateTimeKind.Utc);
    private static readonly DateTime InvoicePeriodStart = new(2026, 03, 10, 00, 00, 00, DateTimeKind.Utc);
    private static readonly DateTime InvoicePeriodEnd = new(2026, 04, 10, 00, 00, 00, DateTimeKind.Utc);

    // ── C1/R1: invoice.paid cria a linha paga ───────────────────────────────────────────────

    // Numa renovação não existe Payment pré-criado — o evento cria a linha do zero.
    [Test]
    public async Task R1_InvoicePaid_WithoutExistingPayment_CreatesPaidLine()
    {
        var plan = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Active(plan).Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.InvoicePaid(
            EventTime, periodStart: InvoicePeriodStart, periodEnd: InvoicePeriodEnd));

        var payment = harness.AddedPayment;
        Assert.Multiple(() =>
        {
            Assert.That(payment, Is.Not.Null);
            Assert.That(payment!.Status, Is.EqualTo(PaymentStatus.Paid));
            Assert.That(payment.UserId, Is.EqualTo(sub.UserId), "A cobrança é escopada pelo Owner.");
            Assert.That(payment.SubscriptionId, Is.EqualTo(sub.Id));
            Assert.That(payment.GatewayChargeId, Is.EqualTo("pi_test_123"),
                "Chaveada pelo PaymentIntent — é o único id que o evento de estorno também traz.");
            Assert.That(payment.AmountCents, Is.EqualTo(2999));
        });
    }

    // O período vem das LINHAS DA FATURA, não de sub.CurrentPeriodEnd: o invoice.paid pode chegar
    // ANTES do customer.subscription.updated, e ler a assinatura gravaria o período ANTERIOR.
    // É esse campo que depois decide se um estorno derruba o acesso (X7 × X8).
    [Test]
    public async Task InvoicePaid_TakesPeriodFromTheInvoiceLines_NotFromTheSubscription()
    {
        var sub = SubscriptionBuilder.Active().WithPeriodEnd(new DateTime(2026, 01, 01, 0, 0, 0, DateTimeKind.Utc)).Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.InvoicePaid(
            EventTime, periodStart: InvoicePeriodStart, periodEnd: InvoicePeriodEnd));

        Assert.Multiple(() =>
        {
            Assert.That(harness.AddedPayment!.PeriodStart, Is.EqualTo(InvoicePeriodStart));
            Assert.That(harness.AddedPayment.PeriodEnd, Is.EqualTo(InvoicePeriodEnd),
                "Ler sub.CurrentPeriodEnd aqui gravaria o período velho no histórico.");
        });
    }

    // PaidAt vem do evento; sem ele, a data do próprio evento — nunca UtcNow.
    [Test]
    public async Task InvoicePaid_WithoutPaidAt_FallsBackToEventDate()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.InvoicePaid(EventTime, paidAt: null));

        Assert.That(harness.AddedPayment!.PaidAt, Is.EqualTo(EventTime));
    }

    // Linha já criada por charge.succeeded: dá baixa nela em vez de duplicar.
    [Test]
    public async Task InvoicePaid_WithExistingPayment_UpdatesItInsteadOfDuplicating()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var existing = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = sub.UserId,
            SubscriptionId = sub.Id,
            GatewayChargeId = "pi_test_123",
            Status = PaymentStatus.Pending,
        };
        var harness = new WebhookHarness().WithSubscription(sub).WithPayment(existing);

        await harness.Build().ProcessAsync(WebhookEvents.InvoicePaid(EventTime));

        Assert.That(existing.Status, Is.EqualTo(PaymentStatus.Paid));
        harness.Repo.Verify(r => r.AddPaymentAsync(It.IsAny<Payment>()), Times.Never,
            "A linha já existia — criar outra duplicaria a cobrança no extrato.");
    }

    // CG-18: entrou dinheiro que não conseguimos atribuir. Não inventa linha órfã (Payment exige
    // UserId), mas o evento é registrado — o alarme é o log.
    [Test]
    public async Task CG18_InvoicePaid_WithUnresolvedSubscription_DoesNotCreateOrphanPayment()
    {
        var harness = new WebhookHarness().WithoutSubscription();

        await harness.Build().ProcessAsync(WebhookEvents.InvoicePaid(EventTime, eventId: "evt_orfao"));

        Assert.That(harness.AddedPayment, Is.Null);
        Assert.That(harness.StagedEvent?.EventId, Is.EqualTo("evt_orfao"));
    }

    // ── charge.succeeded: enriquece o cartão, em qualquer ordem ─────────────────────────────

    [Test]
    public async Task ChargeSucceeded_AfterInvoicePaid_AddsCardDetailsToTheSameLine()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var existing = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = sub.UserId,
            SubscriptionId = sub.Id,
            GatewayChargeId = "pi_test_123",
            Status = PaymentStatus.Paid,
            ReceiptUrl = "https://stripe/invoice-receipt",
        };
        var harness = new WebhookHarness().WithSubscription(sub).WithPayment(existing);

        await harness.Build().ProcessAsync(WebhookEvents.ChargeSucceeded(EventTime));

        Assert.Multiple(() =>
        {
            Assert.That(existing.CardLastFour, Is.EqualTo("4242"));
            Assert.That(existing.CardBrand, Is.EqualTo("visa"));
            Assert.That(existing.ReceiptUrl, Is.EqualTo("https://stripe/invoice-receipt"),
                "A URL da fatura é melhor que a do recibo da cobrança — não pode ser sobrescrita.");
        });
        harness.Repo.Verify(r => r.AddPaymentAsync(It.IsAny<Payment>()), Times.Never);
    }

    // CG-14: se chegar ANTES do invoice.paid, cria a linha — senão a ordem de entrega decidiria se
    // o histórico mostra o cartão usado.
    [Test]
    public async Task CG14_ChargeSucceeded_BeforeInvoicePaid_CreatesTheLine()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.ChargeSucceeded(EventTime));

        Assert.Multiple(() =>
        {
            Assert.That(harness.AddedPayment, Is.Not.Null);
            Assert.That(harness.AddedPayment!.CardLastFour, Is.EqualTo("4242"));
            Assert.That(harness.AddedPayment.Status, Is.EqualTo(PaymentStatus.Pending),
                "Quem confirma o pagamento é o invoice.paid, não a cobrança.");
        });
    }

    // Cobrança que não pertence a nenhuma assinatura nossa não entra no histórico.
    [Test]
    public async Task ChargeSucceeded_WithUnresolvedSubscription_IsIgnored()
    {
        var harness = new WebhookHarness().WithoutSubscription();

        await harness.Build().ProcessAsync(WebhookEvents.ChargeSucceeded(EventTime));

        Assert.That(harness.AddedPayment, Is.Null);
    }

    // ── R3/R4: dunning — a MESMA parcela não vira várias linhas ─────────────────────────────

    [Test]
    public async Task R3_FirstFailedAttempt_CreatesFailedLineWithRetryNumber()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.InvoiceFailed(EventTime, retryNumber: 1));

        Assert.Multiple(() =>
        {
            Assert.That(harness.AddedPayment, Is.Not.Null);
            Assert.That(harness.AddedPayment!.Status, Is.EqualTo(PaymentStatus.Failed));
            Assert.That(harness.AddedPayment.RetryNumber, Is.EqualTo(1));
            Assert.That(harness.AddedPayment.GatewayChargeId, Is.EqualTo("in_test_123"),
                "Fatura recusada chaveia pelo in_ — não há pi_ quando nada foi cobrado.");
        });
    }

    // A retentativa reusa o id da fatura: só avança o contador. Criar linha nova faria o extrato
    // mostrar 4 recusas onde houve uma parcela.
    [Test]
    public async Task R4_RetryOfTheSameInvoice_AdvancesCounterWithoutNewLine()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var existing = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = sub.UserId,
            SubscriptionId = sub.Id,
            GatewayChargeId = "in_test_123",
            Status = PaymentStatus.Failed,
            RetryNumber = 1,
        };
        var harness = new WebhookHarness().WithSubscription(sub).WithPayment(existing);

        await harness.Build().ProcessAsync(WebhookEvents.InvoiceFailed(EventTime, retryNumber: 2));

        Assert.That(existing.RetryNumber, Is.EqualTo(2));
        harness.Repo.Verify(r => r.AddPaymentAsync(It.IsAny<Payment>()), Times.Never,
            "Mesma parcela = mesma linha.");
    }

    // RF-27: a falha de cobrança NÃO muda o status da assinatura — o acesso já caiu pelo período
    // vencido, e ela ainda pode se recuperar numa retentativa (R5).
    [Test]
    public async Task RF27_InvoiceFailed_DoesNotTouchTheSubscription()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var originalStatus = sub.Status;
        var originalPeriodEnd = sub.CurrentPeriodEnd;
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.InvoiceFailed(EventTime, retryNumber: 1));

        Assert.Multiple(() =>
        {
            Assert.That(sub.Status, Is.EqualTo(originalStatus));
            Assert.That(sub.CurrentPeriodEnd, Is.EqualTo(originalPeriodEnd));
        });
    }

    [Test]
    public async Task InvoiceFailed_WithUnresolvedSubscription_IsIgnored()
    {
        var harness = new WebhookHarness().WithoutSubscription();

        await harness.Build().ProcessAsync(WebhookEvents.InvoiceFailed(EventTime, retryNumber: 1));

        Assert.That(harness.AddedPayment, Is.Null);
    }

    // ── R5: a retentativa passa ─────────────────────────────────────────────────────────────

    // O aviso de cobrança recusada some sozinho porque /me deriva o estado da ÚLTIMA cobrança: o
    // invoice.paid grava uma linha Paid mais nova, sem tocar a Failed anterior.
    [Test]
    public async Task R5_SuccessfulRetry_RecordsNewPaidLineWithoutErasingTheFailedOne()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var failed = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = sub.UserId,
            SubscriptionId = sub.Id,
            GatewayChargeId = "in_test_123",
            Status = PaymentStatus.Failed,
            RetryNumber = 2,
        };
        var harness = new WebhookHarness().WithSubscription(sub).WithPayment(failed);

        // A cobrança bem-sucedida chega com o pi_, não com o in_ da fatura recusada.
        await harness.Build().ProcessAsync(WebhookEvents.InvoicePaid(EventTime, chargeId: "pi_nova_tentativa"));

        Assert.Multiple(() =>
        {
            Assert.That(harness.AddedPayment, Is.Not.Null);
            Assert.That(harness.AddedPayment!.Status, Is.EqualTo(PaymentStatus.Paid));
            Assert.That(failed.Status, Is.EqualTo(PaymentStatus.Failed),
                "O histórico preserva a recusa — ela aconteceu.");
        });
    }

    // Evento de cobrança sem id não tem como ser idempotente — ignora em vez de criar linha sem chave.
    [Test]
    public async Task InvoicePaid_WithoutChargeId_IsIgnored()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(new PaymentWebhookEvent(
            Type: PaymentWebhookType.CheckoutCompleted,
            Provider: "Stripe",
            RawEventType: "invoice.paid",
            EventId: "evt_sem_charge",
            EventCreatedAt: EventTime,
            Metadata: new Dictionary<string, string>(),
            SubscriptionId: WebhookEvents.GatewaySubId,
            ChargeId: null));

        Assert.That(harness.AddedPayment, Is.Null);
    }

    // Fatura sem valor no evento cai para o preço do plano — o extrato nunca mostra R$ 0,00 por
    // omissão do gateway.
    [Test]
    public async Task InvoicePaid_WithoutAmount_FallsBackToPlanPrice()
    {
        var plan = PlanBuilder.Essential().Build();   // 2999
        var sub = SubscriptionBuilder.Active(plan).Build();
        var harness = new WebhookHarness().WithSubscription(sub);

        await harness.Build().ProcessAsync(WebhookEvents.InvoicePaid(EventTime, amountCents: null));

        Assert.That(harness.AddedPayment!.AmountCents, Is.EqualTo(plan.PriceCents));
    }
}
