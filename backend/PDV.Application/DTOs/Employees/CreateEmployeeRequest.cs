namespace PDV.Application.DTOs.Employees;

public record CreateEmployeeRequest(
    string Name,
    string Email,
    string TemporaryPassword,
    string EmployeeType,
    string Position,
    decimal? Salary,
    string? Phone);
