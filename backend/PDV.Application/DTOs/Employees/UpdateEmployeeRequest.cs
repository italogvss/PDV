namespace PDV.Application.DTOs.Employees;

public record UpdateEmployeeRequest(
    Guid RoleId,
    decimal? Salary,
    string? Phone);
