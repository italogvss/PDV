namespace PDV.Application.DTOs.Appointments;

public record AppointmentServiceRefResponse(
    Guid Id,
    string Name,
    int DurationMinutes,
    decimal Price,
    string CategoryColor
);
