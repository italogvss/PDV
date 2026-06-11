namespace PDV.Domain.Entities;

public class Employee : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
    public string? Phone { get; set; }
    public string? ImageUrl { get; set; } // {tenantId}/employees/{employeeId}.webp

    public User User { get; set; } = null!;
    public TenantRole Role { get; set; } = null!;
}
