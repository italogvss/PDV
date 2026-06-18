using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

// Plano efetivo já resolvido para o tenant atual. `Subscription` pode estar presente mesmo
// quando não dá direito (ex.: expirada) — nesse caso `Plan` é null e Modules/Limits são os do Free.
public record ResolvedEntitlement(
    Subscription? Subscription,
    Plan? Plan,
    IReadOnlyList<string> Modules,
    IReadOnlyDictionary<string, int> Limits);

// Resolutor central do "plano efetivo" + enforcement (gating 402). Encontra o Owner do tenant
// atual e lê a assinatura viva dele; sem assinatura válida → FreePlanDefaults.
public interface IEntitlementService
{
    Task<ResolvedEntitlement> ResolveForCurrentTenantAsync();

    // 402 se o módulo não estiver no plano efetivo.
    Task RequireModuleAsync(OperationModule module);

    // 402 se `currentCount` já atingiu o limite (limite -1 = ilimitado).
    Task EnsureWithinLimitAsync(string limitKey, int currentCount);
}
