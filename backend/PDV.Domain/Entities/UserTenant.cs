using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class UserTenant
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public UserRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
}
