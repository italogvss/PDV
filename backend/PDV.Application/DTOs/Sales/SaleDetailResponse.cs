namespace PDV.Application.DTOs.Sales;

public record SaleDetailResponse(
    Guid Id,
    Guid OperatorId,
    string OperatorName,
    string? CustomerName,
    string PaymentMethod,
    bool IsInstallment,
    int? InstallmentCount,
    decimal? InstallmentValue,
    decimal Total,
    string Status,
    Guid? CancelledById,
    DateTime? CancelledAt,
    DateTime CreatedAt,
    List<SaleItemResponse> Items,
    decimal AmountPaid,
    decimal Change);
