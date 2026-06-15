using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IServiceRepository
{
    Task<Service?> GetByIdAsync(Guid id);
    Task<(IEnumerable<Service> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize,
        string? name = null,
        Guid? categoryId = null,
        string? sortBy = null, string? sortOrder = null);
    Task AddAsync(Service service);
    Task UpdateAsync(Service service);
    Task<IEnumerable<Service>> GetAllInactiveAsync();
    Task<Service?> GetInactiveByIdAsync(Guid id);
    Task RestoreAsync(Service service);
    Task HardDeleteAsync(Service service);
    Task<int> PurgeAllAsync();
}
