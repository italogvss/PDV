namespace PDV.Application.DTOs.Employees;

public record EmployeePermissionsResponse(
    string EmployeeType,
    IEnumerable<string> Permissions);
