namespace PDV.Application.DTOs.Appointments;

public record AppointmentResponse(
    Guid Id,
    Guid? CustomerId,
    string CustomerName,
    string? CustomerPhone,
    Guid? EmployeeId,
    string EmployeeName,
    IEnumerable<AppointmentServiceRefResponse> Services,
    DateTime Start,
    int DurationMinutes,
    decimal Price,
    string Status,
    string Note,
    string Color,
    DateTime CreatedAt
);
