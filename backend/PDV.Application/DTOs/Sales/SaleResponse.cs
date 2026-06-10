namespace PDV.Application.DTOs.Sales;

public record SaleResponse(
    Guid Id,
    Guid OperatorId,
    string OperatorName,
    string? CustomerName,
    string? CustomerDocument,
    string PaymentMethod,
    bool IsInstallment,
    int? InstallmentCount,
    decimal? InstallmentValue,
    decimal Total,
    decimal Discount,
    string Status,
    Guid? CancelledById,
    DateTime? CancelledAt,
    DateTime CreatedAt);
