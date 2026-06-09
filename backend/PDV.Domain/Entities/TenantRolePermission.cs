using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class TenantRolePermission
{
    public Guid TenantRoleId { get; set; }
    public TenantRole Role { get; set; } = null!;
    public Permission Permission { get; set; }
}
