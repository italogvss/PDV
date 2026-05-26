using PDV.Application.DTOs.ProductCategories;

namespace PDV.Application.Interfaces;

public interface IProductCategoryService
{
    Task<IEnumerable<ProductCategoryResponse>> GetAllAsync();
    Task<ProductCategoryResponse> GetByIdAsync(Guid id);
    Task<ProductCategoryResponse> CreateAsync(CreateProductCategoryRequest request);
    Task<ProductCategoryResponse> UpdateAsync(Guid id, UpdateProductCategoryRequest request);
    Task DeleteAsync(Guid id);
}
