namespace PDV.Domain.Entities;

public class ProductCategory : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;

    public ICollection<Product> Products { get; set; } = [];
}
