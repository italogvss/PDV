namespace PDV.Domain.Entities;

public class AppointmentServiceItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public Guid ServiceId { get; set; }
    // Snapshot do catálogo no momento da criação — resiliência a mudanças futuras
    public string ServiceName { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string CategoryColor { get; set; } = string.Empty;
}
