using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IPlanRepository
{
    Task<IReadOnlyList<Plan>> GetActiveAsync();

    // Todos os planos, ativos ou não — usado pelo seeder, que precisa reativar um plano que voltou
    // ao catálogo e casar por Slug independentemente do IsActive.
    Task<IReadOnlyList<Plan>> GetAllAsync();

    Task<Plan?> GetByIdAsync(Guid id);
    Task<Plan?> GetByExternalProductIdAsync(string externalProductId);

    // Resolve o plano pelo slug do handoff da landing (?plano=<slug>). Devolve null para slug vazio
    // ou desconhecido — quem chama decide o que fazer (o trial cai no TrialDefaults.FallbackPlanSlug).
    Task<Plan?> GetBySlugAsync(string? slug);
    Task AddAsync(Plan plan);
    Task UpdateAsync(Plan plan);
}
