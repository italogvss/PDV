namespace PDV.Domain.Entities;

public class ServiceCategory : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;

    public ICollection<Service> Services { get; set; } = [];
}
