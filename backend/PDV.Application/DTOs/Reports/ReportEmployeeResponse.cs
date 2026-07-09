namespace PDV.Application.DTOs.Reports;

public record ReportEmployeeResponse(
    Guid Id,
    string Name,
    string? RoleName,
    decimal? Salary,
    string? AvatarUrl);
