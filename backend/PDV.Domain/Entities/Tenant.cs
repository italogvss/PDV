namespace PDV.Domain.Entities;

public class Tenant : BaseEntity
{
    public DateTime? ScheduledDeletionAt { get; set; }
    public ICollection<UserTenant> UserTenants { get; set; } = [];
    public TenantSettings? Settings { get; set; }
}
