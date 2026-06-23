namespace PDV.Domain.Entities;

public class ServicePriceHistory : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? ServiceId { get; set; }
    public Service? Service { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal OldPrice { get; set; }
    public decimal NewPrice { get; set; }
    public Guid? ChangedByUserId { get; set; }
    public User? ChangedByUser { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
}
