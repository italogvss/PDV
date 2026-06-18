using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IPlanRepository
{
    Task<IReadOnlyList<Plan>> GetActiveAsync();
    Task<Plan?> GetByIdAsync(Guid id);
    Task<Plan?> GetByExternalProductIdAsync(string externalProductId);
    Task AddAsync(Plan plan);
    Task UpdateAsync(Plan plan);
}
