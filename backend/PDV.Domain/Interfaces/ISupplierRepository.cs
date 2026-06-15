using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface ISupplierRepository
{
    Task<Supplier?> GetByIdAsync(Guid id);
    Task<(IEnumerable<Supplier> Data, int TotalCount)> GetAllAsync(int page, int pageSize, string? search);
    Task AddAsync(Supplier supplier);
    Task UpdateAsync(Supplier supplier);
    Task<IEnumerable<Supplier>> GetAllInactiveAsync();
    Task<Supplier?> GetInactiveByIdAsync(Guid id);
    Task RestoreAsync(Supplier supplier);
    Task HardDeleteAsync(Supplier supplier);
    Task<int> PurgeAllAsync();
}
