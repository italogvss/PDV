namespace PDV.Domain.Entities;

public class Tenant : BaseEntity
{
    public ICollection<UserTenant> UserTenants { get; set; } = [];
    public TenantSettings? Settings { get; set; }
}
