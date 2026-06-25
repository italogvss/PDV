namespace PDV.Application.DTOs.Employees;

public record UpdateEmployeeRequest(
    Guid RoleId,
    string? Phone,
    decimal? Salary = null,
    int? PaymentDay = null,
    bool AutoCreateSalaryExpense = false);
