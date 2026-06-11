using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Suppliers;

namespace PDV.Application.Interfaces;

public interface ISupplierService
{
    Task<PaginatedResponse<SupplierResponse>> GetAllAsync(int page, int pageSize, string? search);
    Task<SupplierResponse> GetByIdAsync(Guid id);
    Task<SupplierResponse> CreateAsync(CreateSupplierRequest request);
    Task<SupplierResponse> UpdateAsync(Guid id, UpdateSupplierRequest request);
    Task DeleteAsync(Guid id);
    Task<int> PurgeAllAsync();
}
