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

public record PixChargeRequest(
    int AmountCents,
    string Description,
    int? ExpiresInSeconds,
    CustomerInfo? Customer,
    string ExternalId,
    IReadOnlyDictionary<string, string> Metadata);

public record PixChargeResult(
    string ChargeId,
    string BrCode,
    string BrCodeBase64,
    string Status,
    DateTime? ExpiresAt);

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
public enum PaymentWebhookType
{
    CheckoutCompleted,
    CheckoutRefunded,
    CheckoutDisputed,
    TransparentCompleted,
    TransparentRefunded,
    TransparentDisputed,
    SubscriptionTrialStarted,
    SubscriptionCompleted,
    SubscriptionRenewed,
    SubscriptionCancelled,
    SubscriptionPlanChanged,
    Unknown,
}

// Evento de webhook já verificado e traduzido para o domínio.
public record PaymentWebhookEvent(
    PaymentWebhookType Type,
    string RawEventType,
    string EventId,
    string? ChargeId,
    string? SubscriptionId,
    string? CustomerId,
    GatewayChargeStatus? Status,
    IReadOnlyDictionary<string, string> Metadata,
    int? AmountCents,
    DateTime? PaidAt,
    string? ReceiptUrl);
