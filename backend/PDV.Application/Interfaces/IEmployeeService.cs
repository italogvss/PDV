using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Employees;

namespace PDV.Application.Interfaces;

public interface IEmployeeService
{
    Task<PaginatedResponse<EmployeeResponse>> GetAllAsync(int page, int pageSize);
    Task<EmployeeResponse> GetByIdAsync(Guid id);
    Task<EmployeeResponse> CreateAsync(CreateEmployeeRequest request);
    Task<EmployeeResponse> UpdateAsync(Guid id, UpdateEmployeeRequest request);
    Task DeactivateAsync(Guid id);
    Task ReactivateAsync(Guid id);
    Task<IEnumerable<EmployeeResponse>> GetAllInactiveAsync();
    Task HardDeleteAsync(Guid id);
    Task ResetPasswordAsync(Guid id, ResetEmployeePasswordRequest request);
}
