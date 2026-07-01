namespace PDV.Application.DTOs.Services;

public record ServiceProductResponse(
    Guid ProductId,
    string ProductName,
    decimal? PurchasePrice,
    decimal Price,
    int Quantity);
