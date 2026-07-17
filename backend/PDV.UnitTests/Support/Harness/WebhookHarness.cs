using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PDV.Application.DTOs.Payments;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Services;

namespace PDV.UnitTests.Support.Harness;

// Monta o BillingWebhookService — 3 dependências, todas interfaces. Como toda data vem do EVENTO
// (nunca de UtcNow), estes testes são determinísticos por construção: dá para simular um webhook
// atrasado 6h ou reentregue sem mexer no relógio.
public sealed class WebhookHarness
{
    public Mock<IBillingWebhookRepository> Repo { get; } = new();
    public Mock<IDataRetentionRepository> Retention { get; } = new();

    public Subscription? Subscription { get; private set; }

    // Payment adicionado pelo service (renovação não tem Payment pré-criado).
    public Payment? AddedPayment { get; private set; }

    // Evento registrado como processado — a idempotência depende dele ser gravado sempre.
    public WebhookEvent? StagedEvent { get; private set; }

    public WebhookHarness()
    {
        Repo.Setup(r => r.AddPaymentAsync(It.IsAny<Payment>()))
            .Callback<Payment>(p => AddedPayment = p)
            .Returns(Task.CompletedTask);
        Repo.Setup(r => r.StageEventAsync(It.IsAny<WebhookEvent>()))
            .Callback<WebhookEvent>(e => StagedEvent = e)
            .Returns(Task.CompletedTask);
    }

    // A assinatura resolvível pelo `sub_...` do evento (o caminho mais comum) e pelo Id local.
    public WebhookHarness WithSubscription(Subscription sub, string gatewaySubscriptionId = "sub_test_123")
    {
        Subscription = sub;
        sub.GatewaySubscriptionId ??= gatewaySubscriptionId;
        Repo.Setup(r => r.GetSubscriptionByGatewayIdAsync(gatewaySubscriptionId)).ReturnsAsync(sub);
        Repo.Setup(r => r.GetSubscriptionByIdAsync(sub.Id)).ReturnsAsync(sub);
        Repo.Setup(r => r.GetSubscriptionByUserIdAsync(sub.UserId)).ReturnsAsync(sub);
        return this;
    }

    // Nenhum lookup resolve assinatura — o evento é de outra conta, ou chegou antes da nossa linha.
    public WebhookHarness WithoutSubscription() => this;

    // Assinatura alcançável pelo `cus_...`. É o caminho que salva o `charge.refunded`, que não traz
    // `sub_` — e que a `charge.dispute.created` não tem (ela só carrega o PaymentIntent).
    public WebhookHarness ReachableByCustomer(string customerId)
    {
        Repo.Setup(r => r.GetSubscriptionByGatewayCustomerIdAsync(WebhookEvents.Provider, customerId))
            .ReturnsAsync(() => Subscription);
        return this;
    }

    public WebhookHarness WithPayment(Payment payment)
    {
        Repo.Setup(r => r.GetPaymentByGatewayChargeIdAsync(payment.GatewayChargeId)).ReturnsAsync(payment);
        return this;
    }

    // O preço vigente do evento resolve para este plano (é assim que a troca é reconciliada).
    public WebhookHarness WithPlanForPrice(string priceId, Plan plan)
    {
        Repo.Setup(r => r.GetPlanByExternalProductIdAsync(priceId)).ReturnsAsync(plan);
        return this;
    }

    // Preço que não existe no catálogo local (P11).
    public WebhookHarness WithUnknownPrice(string priceId)
    {
        Repo.Setup(r => r.GetPlanByExternalProductIdAsync(priceId)).ReturnsAsync((Plan?)null);
        return this;
    }

    public BillingWebhookService Build() =>
        new(Repo.Object, Retention.Object, NullLogger<BillingWebhookService>.Instance);
}

// Constrói o PaymentWebhookEvent. O record tem ~25 parâmetros opcionais; montá-lo inline faria o
// arrange esconder qual campo o teste realmente exercita.
public static class WebhookEvents
{
    public const string Provider = "Stripe";
    public const string GatewaySubId = "sub_test_123";
    public const string PriceId = "price_test_essencial_mensal";

    // customer.subscription.created / .updated — o evento de reconciliação.
    public static PaymentWebhookEvent Subscription(
        PaymentWebhookType type,
        DateTime eventCreatedAt,
        string status,
        string? priceId = PriceId,
        DateTime? currentPeriodEnd = null,
        string? scheduleId = null,
        string? cancelledDueTo = null,
        DateTime? canceledAt = null,
        string subscriptionId = GatewaySubId,
        string eventId = "evt_test_001") =>
        new(
            Type: type,
            Provider: Provider,
            RawEventType: type == PaymentWebhookType.SubscriptionCompleted
                ? "customer.subscription.created"
                : "customer.subscription.updated",
            EventId: eventId,
            EventCreatedAt: eventCreatedAt,
            Metadata: new Dictionary<string, string>(),
            SubscriptionId: subscriptionId,
            SubscriptionStatus: status,
            CurrentPriceId: priceId,
            CurrentPeriodEnd: currentPeriodEnd,
            ScheduleId: scheduleId,
            CanceledAt: canceledAt,
            CancelledDueTo: cancelledDueTo);

    // customer.subscription.deleted
    public static PaymentWebhookEvent Cancelled(
        DateTime eventCreatedAt,
        string? cancelledDueTo = null,
        DateTime? canceledAt = null,
        string eventId = "evt_test_cancel") =>
        new(
            Type: PaymentWebhookType.SubscriptionCancelled,
            Provider: Provider,
            RawEventType: "customer.subscription.deleted",
            EventId: eventId,
            EventCreatedAt: eventCreatedAt,
            Metadata: new Dictionary<string, string>(),
            SubscriptionId: GatewaySubId,
            CanceledAt: canceledAt,
            CancelledDueTo: cancelledDueTo);

    // invoice.paid — o único evento que registra dinheiro que entrou.
    public static PaymentWebhookEvent InvoicePaid(
        DateTime eventCreatedAt,
        string chargeId = "pi_test_123",
        string invoiceId = "in_test_123",
        int? amountCents = 2999,
        DateTime? paidAt = null,
        DateTime? periodStart = null,
        DateTime? periodEnd = null,
        string eventId = "evt_test_paid") =>
        new(
            Type: PaymentWebhookType.CheckoutCompleted,
            Provider: Provider,
            RawEventType: "invoice.paid",
            EventId: eventId,
            EventCreatedAt: eventCreatedAt,
            Metadata: new Dictionary<string, string>(),
            SubscriptionId: GatewaySubId,
            ChargeId: chargeId,
            InvoiceId: invoiceId,
            AmountCents: amountCents,
            PaidAt: paidAt,
            PeriodStart: periodStart,
            PeriodEnd: periodEnd,
            ReceiptUrl: "https://stripe/receipt/123");

    // invoice.payment_failed — chaveado pela FATURA (in_), estável entre retentativas.
    public static PaymentWebhookEvent InvoiceFailed(
        DateTime eventCreatedAt,
        int retryNumber,
        string invoiceId = "in_test_123",
        string eventId = "evt_test_failed") =>
        new(
            Type: PaymentWebhookType.SubscriptionPaymentFailed,
            Provider: Provider,
            RawEventType: "invoice.payment_failed",
            EventId: eventId,
            EventCreatedAt: eventCreatedAt,
            Metadata: new Dictionary<string, string>(),
            SubscriptionId: GatewaySubId,
            ChargeId: invoiceId,
            InvoiceId: invoiceId,
            RetryNumber: retryNumber);

    // charge.succeeded — enriquece o histórico com o cartão.
    public static PaymentWebhookEvent ChargeSucceeded(
        DateTime eventCreatedAt,
        string chargeId = "pi_test_123",
        string cardLastFour = "4242",
        string cardBrand = "visa",
        string eventId = "evt_test_charge") =>
        new(
            Type: PaymentWebhookType.ChargeSucceeded,
            Provider: Provider,
            RawEventType: "charge.succeeded",
            EventId: eventId,
            EventCreatedAt: eventCreatedAt,
            Metadata: new Dictionary<string, string>(),
            SubscriptionId: GatewaySubId,
            ChargeId: chargeId,
            CardLastFour: cardLastFour,
            CardBrand: cardBrand,
            ReceiptUrl: "https://stripe/charge-receipt/123");

    // charge.refunded / charge.dispute.created — nenhum dos dois traz `sub_`.
    //
    // A assimetria importa e vem do StripeWebhookProcessor: `charge.refunded` carrega o
    // `customer` (→ dá para achar a assinatura sem o Payment), enquanto
    // `charge.dispute.created` carrega APENAS o PaymentIntent — nela, a única ponte até a
    // assinatura é a linha de Payment já registrada. Por isso `customerId` é opcional aqui.
    public static PaymentWebhookEvent Reversed(
        PaymentWebhookType type,
        DateTime eventCreatedAt,
        bool reversedInFull,
        string chargeId = "pi_test_123",
        string? customerId = null,
        string eventId = "evt_test_reversed") =>
        new(
            Type: type,
            Provider: Provider,
            RawEventType: type == PaymentWebhookType.CheckoutRefunded
                ? "charge.refunded"
                : "charge.dispute.created",
            EventId: eventId,
            EventCreatedAt: eventCreatedAt,
            Metadata: new Dictionary<string, string>(),
            CustomerId: customerId,
            ChargeId: chargeId,
            ReversedInFull: reversedInFull);
}
