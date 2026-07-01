namespace PDV.Domain.Entities;

public class ServiceProduct
{
    public Guid Id { get; set; }
    public Guid ServiceId { get; set; }
    public Service Service { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; } = 1;
}
