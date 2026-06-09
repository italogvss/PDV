namespace PDV.Domain.Entities;

public class Product : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string? NCM { get; set; }
    public decimal Price { get; set; }
    public decimal? PurchasePrice { get; set; }
    public int Stock { get; set; }
    public int? MinStock { get; set; }
    public int? MinCriticalStock { get; set; }
    public Guid? CategoryId { get; set; }
    public string? ImageUrl { get; set; } // {tenantId}/product/{productId}.webp

    public ProductCategory? Category { get; set; }
}
