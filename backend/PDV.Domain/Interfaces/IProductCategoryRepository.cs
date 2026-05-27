using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IProductCategoryRepository
{
    Task<ProductCategory?> GetByIdAsync(Guid id);
    Task<IEnumerable<ProductCategory>> GetAllAsync();
    Task AddAsync(ProductCategory category);
    Task UpdateAsync(ProductCategory category);
    Task<bool> NameExistsAsync(string name, Guid? excludeId = null);
}
