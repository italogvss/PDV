namespace PDV.Domain.Entities;

public class EmployeeSalaryLink
{
    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public Guid TenantId { get; set; }
    public Guid RecurringSeriesId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
