using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface ISubscriptionRepository
{
    // Assinatura do Owner (uma por usuário, nunca soft-deleted). Inclui Plan.
    Task<Subscription?> GetByUserIdAsync(Guid userId);
    Task AddAsync(Subscription subscription);
    Task UpdateAsync(Subscription subscription);

    // Marca como Expired as assinaturas canceladas cujo período já terminou. Retorna a quantidade afetada.
    Task<int> ExpireCanceledPastPeriodAsync(DateTime now);

    // Marca como Expired os trials PDV-side cujo TrialEndsAt já passou (sem conversão em assinatura
    // paga). O acesso já é barrado por IsEntitled; isto mantém o status coerente. Retorna a quantidade.
    Task<int> ExpireTrialingPastEndAsync(DateTime now);

    // Marca como Expired os checkouts Pending abandonados há mais que o TTL (usuário nunca voltou do
    // gateway) — libera a assinatura para uma nova tentativa (Expired não bloqueia checkout, ver
    // StartCheckoutAsync). Retorna a quantidade.
    Task<int> ExpireStalePendingAsync(DateTime cutoff);
}
