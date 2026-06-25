namespace PDV.Application.DTOs.Employees;

public record CreateEmployeeRequest(
    string Name,
    string Username,
    string Email,
    string TemporaryPassword,
    Guid RoleId,
    string? Phone,
    decimal? Salary = null,
    int? PaymentDay = null,
    bool AutoCreateSalaryExpense = false);
