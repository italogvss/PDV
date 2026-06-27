namespace PDV.Application.DTOs.Payments;

public record PaymentHistoryItemResponse(
    Guid Id,
    string Kind,
    string Method,
    int AmountCents,
    string Status,
    DateTime? PaidAt,
    string? ReceiptUrl,
    string? CardLastFour,
    string? CardBrand,
    DateTime? PeriodStart,
    DateTime? PeriodEnd,
    DateTime CreatedAt);

public record PaymentHistoryResponse(
    IReadOnlyList<PaymentHistoryItemResponse> Data,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
