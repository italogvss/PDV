namespace PDV.Application.DTOs.Employees;

public record EmployeeResponse(
    Guid Id,
    Guid UserId,
    string Name,
    string Email,
    string EmployeeType,
    string Position,
    decimal? Salary,
    string? Phone,
    string? AvatarUrl,
    bool IsActive,
    DateTime CreatedAt);
