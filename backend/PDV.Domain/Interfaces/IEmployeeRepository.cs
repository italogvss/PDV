using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IEmployeeRepository
{
    Task<Employee?> GetByIdAsync(Guid id);
    Task<Employee?> GetByIdAnyStatusAsync(Guid id);
    Task<Employee?> GetByUserIdAsync(Guid userId, Guid tenantId);
    Task<(IEnumerable<Employee> Data, int TotalCount)> GetAllAsync(int page, int pageSize);
    Task AddAsync(Employee employee);
    Task UpdateAsync(Employee employee);
    Task<IEnumerable<Employee>> GetAllInactiveAsync();
    Task<Employee?> GetInactiveByIdAsync(Guid id);
    Task HardDeleteAsync(Employee employee);
}
