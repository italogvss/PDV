namespace PDV.Domain.Entities;

public class Employee : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public Guid RoleId { get; set; }
    public TenantRole Role { get; set; } = null!;
    public string? Phone { get; set; }
    public string? ImageUrl { get; set; } // {tenantId}/employees/{employeeId}.webp
    public decimal? Salary { get; set; }
    public int? PaymentDay { get; set; }
    public bool AutoCreateSalaryExpense { get; set; } = false;
}
