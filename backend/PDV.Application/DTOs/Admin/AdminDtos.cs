namespace PDV.Application.DTOs.Admin;

public record AdminWebhookEventDto(
    Guid Id,
    string Provider,
    string EventId,
    string EventType,
    string Status,
    DateTime ReceivedAt,
    DateTime? ProcessedAt,
    string? Error);

public record AdminSubscriptionDto(
    Guid Id,
    string UserEmail,
    string UserName,
    string PlanName,
    string Status,
    string Method,
    string Provider,
    bool IsRenewable,
    string? GatewaySubscriptionId,
    string? GatewayCustomerId,
    DateTime? TrialEndsAt,
    DateTime? CurrentPeriodEnd,
    DateTime? CanceledAt,
    DateTime CreatedAt);

public record AdminPaymentDto(
    Guid Id,
    string UserEmail,
    string UserName,
    string GatewayChargeId,
    string Kind,
    string Method,
    int AmountCents,
    string Status,
    string Provider,
    string? CouponCode,
    DateTime? PaidAt,
    DateTime? PeriodStart,
    DateTime? PeriodEnd,
    string? ReceiptUrl,
    DateTime CreatedAt);

public record AdminConfigDto(
    string ApiKey,
    string WebhookSecret,
    string BaseUrl,
    string? BackUrl);

public record SimulatePixRequest(string PixChargeId);

public record AdminPlanDto(
    Guid Id,
    string Name,
    string? Description,
    int PriceCents,
    string BillingPeriod,
    int? TrialDays,
    bool SupportsCard,
    bool SupportsPix,
    bool IsActive,
    int DisplayOrder,
    string ExternalProductId,
    IReadOnlyList<string> Modules,
    IReadOnlyDictionary<string, int> Limits,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record UpdatePlanRequest(
    string Name,
    string? Description,
    int PriceCents,
    int? TrialDays,
    bool SupportsCard,
    bool SupportsPix,
    int DisplayOrder);
