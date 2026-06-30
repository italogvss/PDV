using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IPlanRepository
{
    Task<IReadOnlyList<Plan>> GetActiveAsync();
    Task<Plan?> GetByIdAsync(Guid id);
    Task<Plan?> GetByExternalProductIdAsync(string externalProductId);

    // Resolve o plano pelo slug do handoff da landing (?plano=<slug>). Ignora slugs vazios.
    Task<Plan?> GetBySlugAsync(string slug);
    Task AddAsync(Plan plan);
    Task UpdateAsync(Plan plan);
}
