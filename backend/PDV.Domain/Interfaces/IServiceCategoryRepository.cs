using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IServiceCategoryRepository
{
    Task<ServiceCategory?> GetByIdAsync(Guid id);
    Task<IEnumerable<ServiceCategory>> GetAllAsync();
    Task AddAsync(ServiceCategory category);
    Task UpdateAsync(ServiceCategory category);
    Task<bool> NameExistsAsync(string name, Guid? excludeId = null);
}
