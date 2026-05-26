using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Products;

namespace PDV.Application.Interfaces;

public interface IProductService
{
    Task<PaginatedResponse<ProductResponse>> GetAllAsync(
        int page, int pageSize,
        string? name = null, string? barcode = null,
        Guid? categoryId = null,
        string? sortBy = null, string? sortOrder = null);
    Task<ProductResponse> GetByIdAsync(Guid id);
    Task<ProductResponse> CreateAsync(CreateProductRequest request);
    Task<ProductResponse> UpdateAsync(Guid id, UpdateProductRequest request);
    Task DeleteAsync(Guid id);
    Task<ProductResponse> AdjustStockAsync(Guid id, AdjustStockRequest request);
}
