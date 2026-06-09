namespace PDV.Application.DTOs.Employees;

public record UpdateEmployeeRequest(
    Guid RoleId,
    string Position,
    decimal? Salary,
    string? Phone);
