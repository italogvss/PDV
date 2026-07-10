namespace PDV.Application.DTOs.Payments;

// Modelos NEUTROS de gateway (sem tipos do AbacatePay) — contrato entre a orquestração de
// negócio e qualquer implementação de IPaymentGateway. Valores monetários em centavos.

public record CustomerInfo(
    string Email,
    string? Name,
    string? TaxId,
    string? Cellphone,
    IReadOnlyDictionary<string, string>? Metadata = null);

public record GatewayCustomerResult(
    string CustomerId,
    string Email,
    string? Name,
    string? TaxId,
    string? Cellphone);

public record SubscriptionCheckoutRequest(
    string ProductExternalId,
    string CustomerId,
    string ExternalId,
    string? CouponCode,
    string? ReturnUrl,
    string? CompletionUrl,
    IReadOnlyDictionary<string, string> Metadata);

public record HostedCheckoutResult(
    string CheckoutId,
    string Url,
    string Status);

public record PlanChangeResult(
    string PendingChangeId,
    string Status,
    int NewAmountCents);

public enum GatewayChargeStatus
{
    Pending,
    Paid,
    Expired,
    Cancelled,
    Refunded,
    Disputed,
}

// Tipo normalizado de evento de webhook (mapeado a partir do campo `event` do AbacatePay).
// Não há `SubscriptionTrialStarted`: o trial é PDV-side e o gateway nunca recebe trialDays.
// Não há `SubscriptionPlanChanged`: o AbacatePay não emite evento na troca de plano — ela é
// aplicada de forma síncrona pelo endpoint change-plan (ver SubscriptionService.ChangePlanAsync).
public enum PaymentWebhookType
{
    CheckoutCompleted,
    CheckoutRefunded,
    CheckoutDisputed,
    SubscriptionCompleted,
    SubscriptionRenewed,
    SubscriptionPaymentFailed,
    SubscriptionCancelled,
    Unknown,
}

// Motivo do cancelamento informado pelo gateway (data.subscription.cancelledDueTo). Um cancelamento
// involuntário (cobrança esgotou as tentativas) não ganha o período de cortesia do voluntário.
public static class CancelReasons
{
    public const string MaxPaymentRetriesExceeded = "max_payment_retries_exceeded";
}

// Evento de webhook já verificado e traduzido para o domínio.
public record PaymentWebhookEvent(
    PaymentWebhookType Type,
    string Provider,
    string RawEventType,
    string EventId,
    string? ChargeId,
    // ExternalId definido por nós ao criar a cobrança (= Subscription.Id no banco). Chave primária
    // de correlação para eventos checkout, que não carregam o id da assinatura.
    string? ExternalId,
    // Id da assinatura no gateway (subs_...) — vem de data.subscription.id nos eventos subscription.*.
    string? SubscriptionId,
    string? CustomerId,
    GatewayChargeStatus? Status,
    IReadOnlyDictionary<string, string> Metadata,
    int? AmountCents,
    DateTime? PaidAt,
    string? ReceiptUrl,
    // Dados do cartão usado na cobrança (data.payerInformation.CARD) — gravados no histórico de Payment.
    string? CardLastFour = null,
    string? CardBrand = null,
    // data.subscription.updatedAt — quando o gateway processou este evento. É a âncora do período:
    // usar o relógio local estenderia o ciclo indevidamente num webhook atrasado ou retentado.
    DateTime? SubscriptionUpdatedAt = null,
    // data.checkout.nextChargeAt — fim exato do período custeado por esta cobrança, quando o gateway
    // o informa. Preferido sobre o cálculo `âncora + ciclo`.
    DateTime? NextChargeAt = null,
    // data.subscription.cancelledDueTo — ver CancelReasons.
    string? CancelledDueTo = null,
    // Parcela recusada numa renovação (data.installmentId / data.retryNumber), em
    // subscription.payment_failed. O installmentId é a chave de idempotência dessa falha.
    string? InstallmentId = null,
    int? RetryNumber = null);
