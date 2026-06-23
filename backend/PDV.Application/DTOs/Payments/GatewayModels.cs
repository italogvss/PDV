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
    string Provider,
    string RawEventType,
    string EventId,
    string? ChargeId,
    // ExternalId definido por nós ao criar a cobrança (= Subscription.Id no banco). Chave primária
    // de correlação para eventos checkout/transparent, que não carregam o id da assinatura.
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
    // Produto-alvo de uma troca de plano (data.productId, presente em subscription.plan_changed).
    string? ProductId = null,
    // Fim do período de trial informado pelo gateway (data.checkout.trialEndsAt).
    // Presente em checkout.completed de fluxos trial; pode ser nulo em outros eventos.
    DateTime? TrialEndsAt = null);
