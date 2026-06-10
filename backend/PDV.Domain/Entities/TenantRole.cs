using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class TenantRole : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public bool IsDefault { get; set; } = false;

    public ICollection<TenantRolePermission> Permissions { get; set; } = [];
    public ICollection<Employee> Employees { get; set; } = [];
}
