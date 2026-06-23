using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class AppointmentStatusLog : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }
    public AppointmentStatus FromStatus { get; set; }
    public AppointmentStatus ToStatus { get; set; }
    public Guid? ChangedByUserId { get; set; }
    public User? ChangedByUser { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
}
