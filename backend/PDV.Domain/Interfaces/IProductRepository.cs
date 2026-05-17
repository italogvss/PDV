using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id);
    Task<(IEnumerable<Product> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize,
        string? name = null, string? barcode = null,
        string? sortBy = null, string? sortOrder = null);
    Task AddAsync(Product product);
    Task UpdateAsync(Product product);
    Task<bool> BarcodeExistsAsync(string barcode, Guid? excludeId = null);
}
