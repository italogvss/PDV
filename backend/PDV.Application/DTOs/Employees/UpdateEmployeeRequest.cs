namespace PDV.Application.DTOs.Employees;

public record UpdateEmployeeRequest(
    string EmployeeType,
    string Position,
    decimal? Salary,
    string? Phone);
