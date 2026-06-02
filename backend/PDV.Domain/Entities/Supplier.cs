namespace PDV.Domain.Entities;

public class Supplier : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
}
