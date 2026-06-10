namespace PDV.Application.DTOs.Employees;

public record EmployeeResponse(
    Guid Id,
    Guid UserId,
    string Name,
    string Email,
    Guid RoleId,
    string RoleName,
    decimal? Salary,
    string? Phone,
    string? ImageUrl,
    bool IsActive,
    DateTime CreatedAt);
