using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IProductCategoryRepository
{
    Task<ProductCategory?> GetByIdAsync(Guid id, Guid tenantId);
    Task<IEnumerable<ProductCategory>> GetAllAsync(Guid tenantId);
    Task AddAsync(ProductCategory category);
    Task UpdateAsync(ProductCategory category);
    Task<bool> NameExistsAsync(string name, Guid tenantId, Guid? excludeId = null);
}
