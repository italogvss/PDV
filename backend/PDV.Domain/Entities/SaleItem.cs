namespace PDV.Domain.Entities;

public class SaleItem
{
    public Guid Id { get; set; }
    public Guid SaleId { get; set; }
    public Sale Sale { get; set; } = null!;
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public Guid? ServiceId { get; set; }
    public Service? Service { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal? PurchasePriceSnapshot { get; set; }
    public int Quantity { get; set; }
    public decimal Subtotal { get; set; }
}
