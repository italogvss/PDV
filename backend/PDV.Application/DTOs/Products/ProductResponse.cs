namespace PDV.Application.DTOs.Products;

public record ProductResponse(
    Guid Id,
    string Name,
    string? Barcode,
    string? Ncm,
    decimal Price,
    decimal? PurchasePrice,
    int Stock,
    bool IsActive,
    DateTime CreatedAt);
