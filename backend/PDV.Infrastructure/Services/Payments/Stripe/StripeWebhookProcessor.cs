using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces.Payments;
using PDV.Domain.Exceptions;
using Stripe;

namespace PDV.Infrastructure.Services.Payments.Stripe;

// Verifica a autenticidade (HMAC do corpo raw, header Stripe-Signature, com tolerância de
// timestamp) e traduz o payload para o modelo de domínio. Não toca no banco — entra rawBody, sai
// PaymentWebhookEvent. Não é 100% puro: `invoice.paid` pode chamar de volta a API do Stripe (ver
// FetchPaymentIntentIdAsync) porque o payload do evento não traz o dado necessário.
//
// `checkout.session.completed` NÃO é tratado de propósito: ele não carrega o período da assinatura
// e tudo o que ele correlaciona (client_reference_id) já viaja em `subscription_data.metadata`,
// que o Stripe copia para a assinatura e, dela, para toda fatura futura.
public class StripeWebhookProcessor(
    IOptions<StripeOptions> options,
    IStripeClient client,
    ILogger<StripeWebhookProcessor> logger) : IPaymentWebhookProcessor
{
    private readonly StripeOptions _options = options.Value;
    private readonly InvoiceService _invoices = new(client);

    public string Provider => StripeGateway.ProviderName;

    public async Task<PaymentWebhookEvent> ParseAsync(string rawBody, string? signatureHeader)
    {
        var stripeEvent = Verify(rawBody, signatureHeader);

        return stripeEvent.Type switch
        {
            "invoice.paid" => await FromInvoicePaid(stripeEvent),
            "invoice.payment_failed" => FromInvoiceFailed(stripeEvent),
            "charge.succeeded" => FromChargeSucceeded(stripeEvent),
            "charge.refunded" => FromChargeRefunded(stripeEvent),
            "charge.dispute.created" => FromDisputeCreated(stripeEvent),
            "customer.subscription.created" => FromSubscription(stripeEvent, PaymentWebhookType.SubscriptionCompleted),
            "customer.subscription.updated" => FromSubscription(stripeEvent, PaymentWebhookType.SubscriptionUpdated),
            "customer.subscription.deleted" => FromSubscription(stripeEvent, PaymentWebhookType.SubscriptionCancelled),
            _ => Base(stripeEvent, PaymentWebhookType.Unknown),
        };
    }

    // CG-10: a assinatura criptográfica é conferida sobre o corpo RAW, antes de qualquer parse.
    // `throwOnApiVersionMismatch: false` — o SDK é fixado numa versão de API; um evento emitido por
    // outra versão (endpoint antigo no painel) ainda deve ser lido, não recusado.
    private Event Verify(string rawBody, string? signatureHeader)
    {
        if (string.IsNullOrEmpty(signatureHeader))
            throw new UnauthorizedException("Webhook sem assinatura.");

        try
        {
            return EventUtility.ConstructEvent(
                rawBody, signatureHeader, _options.WebhookSecret,
                tolerance: _options.WebhookToleranceSeconds,
                throwOnApiVersionMismatch: false);
        }
        catch (StripeException ex)
        {
            throw new UnauthorizedException($"Assinatura do webhook inválida: {ex.Message}");
        }
    }

    // -----------------------------------------------------------------------
    // Faturas
    // -----------------------------------------------------------------------

    // invoice.paid — entrou dinheiro. É o único evento que registra uma cobrança paga.
    //
    // O payload do webhook NÃO traz `invoice.payments` (é expandable e não vem por padrão —
    // conferido com eventos reais da conta, não só com uma chamada de API avulsa). Sem o
    // PaymentIntent, `PaymentIntentIdOf` cairia no fallback `invoice.Id`, que contraria o
    // invariante de `Payment.GatewayChargeId` (`pi_` = paga, `in_` = recusada) e faz o
    // `charge.refunded` (que só carrega `pi_`) achar a linha errada depois (docs/subscriptions.md
    // §15). Por isso busca a fatura de novo com `expand` quando o campo não veio no evento.
    private async Task<PaymentWebhookEvent> FromInvoicePaid(Event e)
    {
        var invoice = Cast<Invoice>(e);
        var (periodStart, periodEnd) = PeriodOf(invoice);
        var paymentIntentId = PaymentIntentIdOf(invoice) ?? await FetchPaymentIntentIdAsync(invoice.Id);

        return Base(e, PaymentWebhookType.CheckoutCompleted) with
        {
            SubscriptionId = SubscriptionIdOf(invoice),
            CustomerId = invoice.CustomerId,
            Metadata = SubscriptionMetadataOf(invoice),
            // Chaveia pelo PaymentIntent: é o único id que o evento de estorno também carrega.
            // Uma fatura quitada sem cobrança (cupom de 100%) cai na própria fatura.
            ChargeId = paymentIntentId ?? invoice.Id,
            InvoiceId = invoice.Id,
            AmountCents = (int)invoice.AmountPaid,
            PaidAt = invoice.StatusTransitions?.PaidAt ?? e.Created,
            ReceiptUrl = invoice.HostedInvoiceUrl,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
        };
    }

    // Só chamado quando o evento não trouxe `payments` — o caso comum em produção. Uma falha aqui
    // (fatura de teste sintética nos fixtures de `.claude/webhook-tests`, instabilidade pontual da
    // API) não pode derrubar o webhook inteiro: cai no mesmo fallback `invoice.Id` do caso
    // legítimo de fatura sem PaymentIntent (cupom de 100%).
    private async Task<string?> FetchPaymentIntentIdAsync(string invoiceId)
    {
        try
        {
            var expanded = await _invoices.GetAsync(invoiceId, new InvoiceGetOptions
            {
                Expand = ["payments.data.payment.payment_intent"],
            });
            return PaymentIntentIdOf(expanded);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Não foi possível buscar o PaymentIntent da fatura {InvoiceId} no Stripe.", invoiceId);
            return null;
        }
    }

    // invoice.payment_failed — o cartão recusou. A fatura é a mesma entre as retentativas, e
    // `attempt_count` é o número da tentativa: retentar não cria linha nova (RF-27 / R4).
    private static PaymentWebhookEvent FromInvoiceFailed(Event e)
    {
        var invoice = Cast<Invoice>(e);

        return Base(e, PaymentWebhookType.SubscriptionPaymentFailed) with
        {
            SubscriptionId = SubscriptionIdOf(invoice),
            CustomerId = invoice.CustomerId,
            Metadata = SubscriptionMetadataOf(invoice),
            ChargeId = invoice.Id,
            InvoiceId = invoice.Id,
            AmountCents = (int)invoice.AmountDue,
            RetryNumber = (int)invoice.AttemptCount,
        };
    }

    // -----------------------------------------------------------------------
    // Cobranças
    // -----------------------------------------------------------------------

    // charge.succeeded — só o cartão usado. Chega em qualquer ordem em relação a invoice.paid; os
    // dois convergem na mesma linha de Payment, chaveada pelo PaymentIntent.
    private static PaymentWebhookEvent FromChargeSucceeded(Event e)
    {
        var charge = Cast<Charge>(e);

        return Base(e, PaymentWebhookType.ChargeSucceeded) with
        {
            CustomerId = charge.CustomerId,
            ChargeId = charge.PaymentIntentId,
            AmountCents = (int)charge.Amount,
            PaidAt = e.Created,
            ReceiptUrl = charge.ReceiptUrl,
            CardLastFour = charge.PaymentMethodDetails?.Card?.Last4,
            CardBrand = charge.PaymentMethodDetails?.Card?.Brand,
        };
    }

    private static PaymentWebhookEvent FromChargeRefunded(Event e)
    {
        var charge = Cast<Charge>(e);

        return Base(e, PaymentWebhookType.CheckoutRefunded) with
        {
            CustomerId = charge.CustomerId,
            ChargeId = charge.PaymentIntentId,
            AmountCents = (int)charge.AmountRefunded,
            // Um estorno parcial não derruba o acesso de quem está em dia (RF-42).
            ReversedInFull = charge.Refunded,
        };
    }

    private static PaymentWebhookEvent FromDisputeCreated(Event e)
    {
        var dispute = Cast<Dispute>(e);

        return Base(e, PaymentWebhookType.CheckoutDisputed) with
        {
            ChargeId = dispute.PaymentIntentId,
            AmountCents = (int)dispute.Amount,
            // Uma disputa retém o valor inteiro até se resolver — é a reversão total que RF-42
            // manda tratar de forma conservadora.
            ReversedInFull = true,
        };
    }

    // -----------------------------------------------------------------------
    // Assinatura
    // -----------------------------------------------------------------------

    // O objeto da assinatura carrega o estado inteiro (status, preço vigente, período, agendamento).
    // O reconciliador aplica esse estado — nenhum handler precisa adivinhar o que mudou.
    private static PaymentWebhookEvent FromSubscription(Event e, PaymentWebhookType type)
    {
        var subscription = Cast<global::Stripe.Subscription>(e);
        var item = subscription.Items?.Data?.FirstOrDefault();

        return Base(e, type) with
        {
            SubscriptionId = subscription.Id,
            CustomerId = subscription.CustomerId,
            Metadata = subscription.Metadata ?? new Dictionary<string, string>(),
            ExternalId = MetadataValue(subscription.Metadata, "subscriptionId"),
            SubscriptionStatus = subscription.Status,
            CurrentPriceId = item?.Price?.Id,
            // O período vive no ITEM da assinatura (API 2025-06-30 em diante).
            CurrentPeriodEnd = item?.CurrentPeriodEnd,
            ScheduleId = subscription.ScheduleId,
            CanceledAt = subscription.CanceledAt,
            CancelledDueTo = subscription.CancellationDetails?.Reason,
        };
    }

    // -----------------------------------------------------------------------
    // Auxiliares
    // -----------------------------------------------------------------------

    private static PaymentWebhookEvent Base(Event e, PaymentWebhookType type) => new(
        Type: type,
        Provider: StripeGateway.ProviderName,
        RawEventType: e.Type,
        EventId: e.Id,
        EventCreatedAt: e.Created,
        Metadata: new Dictionary<string, string>());

    // Um payload que não deserializa no tipo esperado é bug nosso de mapeamento, não erro do
    // usuário: sobe como 500 e o Stripe reentrega.
    private static T Cast<T>(Event e) where T : class =>
        e.Data.Object as T
        ?? throw new InvalidOperationException($"Payload inesperado no evento {e.Type} ({e.Id}).");

    // in_... → sub_... (movido para `parent.subscription_details` na API 2025-06-30 em diante).
    private static string? SubscriptionIdOf(Invoice invoice) =>
        invoice.Parent?.SubscriptionDetails?.SubscriptionId;

    // A metadata da assinatura viaja em toda fatura dela — é assim que uma renovação, meses depois
    // do checkout, ainda resolve o usuário certo sem depender do cliente no gateway.
    private static IReadOnlyDictionary<string, string> SubscriptionMetadataOf(Invoice invoice) =>
        invoice.Parent?.SubscriptionDetails?.Metadata ?? new Dictionary<string, string>();

    private static string? PaymentIntentIdOf(Invoice invoice) =>
        invoice.Payments?.Data?
            .Select(p => p.Payment?.PaymentIntentId)
            .FirstOrDefault(id => id is not null);

    // O período que a fatura custeia sai das LINHAS, não de invoice.period_*: numa fatura de
    // proporcional as linhas cobrem o resto do ciclo, enquanto invoice.period_* cobre um instante.
    private static (DateTime? Start, DateTime? End) PeriodOf(Invoice invoice)
    {
        var lines = invoice.Lines?.Data;
        if (lines is not { Count: > 0 }) return (invoice.PeriodStart, invoice.PeriodEnd);

        return (lines.Min(l => l.Period.Start), lines.Max(l => l.Period.End));
    }

    private static string? MetadataValue(IDictionary<string, string>? metadata, string key) =>
        metadata is not null && metadata.TryGetValue(key, out var value) ? value : null;
}
