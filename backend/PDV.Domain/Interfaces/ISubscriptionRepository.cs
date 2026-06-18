using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface ISubscriptionRepository
{
    // Assinatura corrente do Owner (uma por usuário). Inclui Plan e PendingPlan.
    Task<Subscription?> GetLiveByUserIdAsync(Guid userId);
    Task AddAsync(Subscription subscription);
    Task UpdateAsync(Subscription subscription);
}
