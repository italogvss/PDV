using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface ISubscriptionRepository
{
    // Assinatura corrente do Owner (uma por usuário). Inclui Plan.
    Task<Subscription?> GetLiveByUserIdAsync(Guid userId);
    Task AddAsync(Subscription subscription);
    Task UpdateAsync(Subscription subscription);

    // Remoção FÍSICA da assinatura (exceção ao soft delete): usado no cancelamento em trial,
    // que bloqueia o acesso sem deixar assinatura para reativar em trial (HasUsedTrial permanece).
    Task DeleteAsync(Subscription subscription);

    // Marca como Expired as assinaturas canceladas cujo período já terminou. Retorna a quantidade afetada.
    Task<int> ExpireCanceledPastPeriodAsync(DateTime now);

    // Marca como Expired os trials PDV-side cujo TrialEndsAt já passou (sem conversão em assinatura
    // paga). O acesso já é barrado por IsEntitled; isto mantém o status coerente. Retorna a quantidade.
    Task<int> ExpireTrialingPastEndAsync(DateTime now);
}
