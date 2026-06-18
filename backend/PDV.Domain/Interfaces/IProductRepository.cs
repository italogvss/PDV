using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id);
    Task<(IEnumerable<Product> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize,
        string? name = null, string? barcode = null,
        Guid? categoryId = null,
        string? sortBy = null, string? sortOrder = null);
    Task AddAsync(Product product);
    Task UpdateAsync(Product product);
    Task<bool> BarcodeExistsAsync(string barcode, Guid? excludeId = null);
    // Total de produtos ativos do tenant atual (para enforcement de limite de plano).
    Task<int> CountAsync();
    Task<IEnumerable<Product>> GetAllInactiveAsync();
    Task<Product?> GetInactiveByIdAsync(Guid id);
    Task RestoreAsync(Product product);
    Task HardDeleteAsync(Product product);
    Task<int> PurgeAllAsync();
}
