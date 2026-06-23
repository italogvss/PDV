namespace PDV.Domain.Entities;

public class ProductPriceHistory : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal OldPrice { get; set; }
    public decimal NewPrice { get; set; }
    public Guid? ChangedByUserId { get; set; }
    public User? ChangedByUser { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
}
