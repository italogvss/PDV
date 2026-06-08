using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class Appointment : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public DateTime Start { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Confirmado;
    public string Note { get; set; } = string.Empty;

    public ICollection<AppointmentServiceItem> ServiceItems { get; set; } = [];
}
