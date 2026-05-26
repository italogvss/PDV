namespace PDV.Application.DTOs.Products;

public record CreateProductRequest(
    string Name,
    string? Barcode,
    string? Ncm,
    decimal Price,
    decimal? PurchasePrice,
    int Stock,
    int? MinStock,
    int? MinCriticalStock,
    Guid? CategoryId);
