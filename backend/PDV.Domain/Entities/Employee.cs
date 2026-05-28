using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class Employee : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public EmployeeType EmployeeType { get; set; } = EmployeeType.Employee;
    public string Position { get; set; } = string.Empty;
    public decimal? Salary { get; set; }
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; } // {tenantId}/employees/{employeeId}.webp

    public User User { get; set; } = null!;
}
