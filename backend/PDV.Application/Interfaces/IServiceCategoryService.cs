using PDV.Application.DTOs.ServiceCategories;

namespace PDV.Application.Interfaces;

public interface IServiceCategoryService
{
    Task<IEnumerable<ServiceCategoryResponse>> GetAllAsync();
    Task<ServiceCategoryResponse> GetByIdAsync(Guid id);
    Task<ServiceCategoryResponse> CreateAsync(CreateServiceCategoryRequest request);
    Task<ServiceCategoryResponse> UpdateAsync(Guid id, UpdateServiceCategoryRequest request);
    Task DeleteAsync(Guid id);
    Task<IEnumerable<ServiceCategoryResponse>> GetAllInactiveAsync();
    Task RestoreAsync(Guid id);
    Task HardDeleteAsync(Guid id);
}
