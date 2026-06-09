namespace PDV.Application.DTOs.Appointments;

public record CreateAppointmentRequest(
    Guid? CustomerId,
    string CustomerName,
    string? CustomerPhone,
    Guid EmployeeId,
    IEnumerable<Guid> ServiceIds,
    DateTime Start,
    int DurationMinutes,
    decimal Price,
    string Status,
    string Note,
    string Color = ""
);
