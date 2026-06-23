using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Services;

namespace PDV.Application.Interfaces;

public interface IServiceService
{
    Task<PaginatedResponse<ServiceResponse>> GetAllAsync(
        int page, int pageSize,
        string? name = null,
        Guid? categoryId = null,
        string? sortBy = null, string? sortOrder = null);
    Task<ServiceResponse> GetByIdAsync(Guid id);
    Task<ServiceResponse> CreateAsync(CreateServiceRequest request);
    Task<ServiceResponse> UpdateAsync(Guid id, UpdateServiceRequest request, Guid changedByUserId);
    Task DeleteAsync(Guid id);
    Task<IEnumerable<ServiceResponse>> GetAllInactiveAsync();
    Task RestoreAsync(Guid id);
    Task HardDeleteAsync(Guid id);
    Task<int> PurgeAllAsync();
}
