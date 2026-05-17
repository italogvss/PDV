namespace PDV.Application.DTOs.Sales;

public record SaleItemResponse(
    Guid Id,
    Guid SaleId,
    Guid? ProductId,
    string ProductName,
    decimal UnitPrice,
    decimal? PurchasePriceSnapshot,
    int Quantity,
    decimal Subtotal);
