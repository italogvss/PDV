namespace PDV.Application.DTOs.Employees;

public record CreateEmployeeRequest(
    string Name,
    string Email,
    string TemporaryPassword,
    Guid RoleId,
    string Position,
    decimal? Salary,
    string? Phone);
