namespace PDV.Application.DTOs.Reports;

public record AppointmentsByEmployeeResponse(
    Guid EmployeeId,
    string EmployeeName,
    int Count,
    decimal Revenue);
