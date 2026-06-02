using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Customers;

namespace PDV.Application.Interfaces;

public interface ICustomerService
{
    Task<PaginatedResponse<CustomerResponse>> GetAllAsync(int page, int pageSize, string? search);
    Task<CustomerResponse> GetByIdAsync(Guid id);
    Task<CustomerResponse> CreateAsync(CreateCustomerRequest request);
    Task<CustomerResponse> UpdateAsync(Guid id, UpdateCustomerRequest request);
    Task DeleteAsync(Guid id);
}
