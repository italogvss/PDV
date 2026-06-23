using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface ISubscriptionRepository
{
    // Assinatura corrente do Owner (uma por usuário). Inclui Plan.
    Task<Subscription?> GetLiveByUserIdAsync(Guid userId);
    Task AddAsync(Subscription subscription);
    Task UpdateAsync(Subscription subscription);

    // Marca como Expired as assinaturas canceladas cujo período já terminou. Retorna a quantidade afetada.
    Task<int> ExpireCanceledPastPeriodAsync(DateTime now);
}
