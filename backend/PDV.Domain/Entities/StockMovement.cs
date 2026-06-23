using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class StockMovement : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public StockMovementType Type { get; set; }
    public int Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public Guid? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    public string? SupplierName { get; set; }
    public string? Note { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
}
