namespace PDV.Domain.Entities;

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string? NCM { get; set; }
    public decimal Price { get; set; }
    public decimal? PurchasePrice { get; set; }
    public int Stock { get; set; }
    public int? MinStock { get; set; }
    public int? MinCriticalStock { get; set; }
    public Guid? CategoryId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ProductCategory? Category { get; set; }
}
