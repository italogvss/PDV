namespace PDV.Application.DTOs.Subscriptions;

// Contrato HTTP de assinaturas. Planos são identificados por Id (Guid) — não há tier hardcoded.
// `PlanId == null` em SubscriptionResponse = estado Free (sem assinatura). Limites: -1 = ilimitado.

public record PlanResponse(
    Guid Id,
    string Name,
    string? Description,
    decimal PriceMonthly,
    decimal? PriceAnnual,
    IReadOnlyList<string> Modules,
    IReadOnlyDictionary<string, int> Limits,
    bool SupportsCard,
    bool SupportsPix,
    int? TrialDays);

public record SubscriptionResponse(
    Guid? PlanId,
    string? PlanName,
    string Status,
    string? Method,
    bool IsRenewable,
    DateTime? TrialEndsAt,
    DateTime? CurrentPeriodEnd,
    DateTime? CanceledAt,
    IReadOnlyList<string> Modules,
    IReadOnlyDictionary<string, int> Limits,
    Guid? PendingPlanId,
    string? PendingPlanName);

// Method: "CARD" (assinatura recorrente) | "PIX" (pagamento único). Period: "Monthly" | "Annual" (PIX).
// ReturnUrl/CompletionUrl vêm do frontend — o backend não os conhece, apenas repassa ao gateway.
public record StartCheckoutRequest(
    Guid PlanId,
    string Method,
    string? Period,
    string? CouponCode,
    string? ReturnUrl,
    string? CompletionUrl);

public record PixChargeDto(
    string ChargeId,
    string BrCode,
    string BrCodeBase64,
    DateTime? ExpiresAt);

// Cartão → CheckoutUrl preenchido (redirect). PIX → Pix preenchido (QR embutido).
public record StartCheckoutResponse(
    string? CheckoutUrl,
    PixChargeDto? Pix);

public record ChangePlanRequest(Guid PlanId);
