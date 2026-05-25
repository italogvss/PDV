namespace PDV.Domain.Entities;

public class Tenant
{
    public Guid Id { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<UserTenant> UserTenants { get; set; } = [];
    public TenantSettings? Settings { get; set; }
}
