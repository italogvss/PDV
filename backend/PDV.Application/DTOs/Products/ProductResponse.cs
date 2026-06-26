using PDV.Application.DTOs.ProductCategories;

namespace PDV.Application.DTOs.Products;

public record ProductResponse(
    Guid Id,
    string Name,
    string? Barcode,
    string? Ncm,
    decimal Price,
    decimal? PurchasePrice,
    int Stock,
    int TotalSold,
    int? MinStock,
    int? MinCriticalStock,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    ProductCategoryResponse? Category,
    string? ImageUrl);
