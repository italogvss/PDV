namespace PDV.Application.DTOs.Products;

public record UpdateProductRequest(
    string Name,
    string? Barcode,
    string? Ncm,
    decimal Price,
    decimal? PurchasePrice,
    int Stock,
    int? MinStock,
    int? MinCriticalStock,
    Guid? CategoryId);
