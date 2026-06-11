namespace PDV.Application.DTOs.Employees;

public record UpdateEmployeeRequest(
    Guid RoleId,
    string? Phone);
