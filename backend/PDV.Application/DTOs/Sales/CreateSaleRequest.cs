namespace PDV.Application.DTOs.Sales;

public record CreateSaleRequest(
    Guid? CustomerId,
    string? CustomerDocument,
    string PaymentMethod,
    bool IsInstallment,
    int? InstallmentCount,
    decimal AmountPaid,
    List<CreateSaleItemRequest> Items);

public record CreateSaleItemRequest(Guid ProductId, int Quantity);
