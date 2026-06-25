using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IEmployeeSalaryLinkRepository
{
    Task<EmployeeSalaryLink?> GetByEmployeeIdAsync(Guid employeeId);
    Task AddAsync(EmployeeSalaryLink link);
    Task DeleteAsync(EmployeeSalaryLink link);
}
