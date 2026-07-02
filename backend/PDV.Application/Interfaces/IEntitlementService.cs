using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

// Plano efetivo já resolvido para o tenant atual. `Subscription` pode estar presente mesmo
// quando não dá direito (ex.: expirada) — nesse caso `Plan` é null e Entitlements/Limits ficam
// vazios (sem plano Free permanente), bloqueando toda capability gateada com 402.
public record ResolvedEntitlement(
    Subscription? Subscription,
    Plan? Plan,
    IReadOnlyList<string> Entitlements,
    IReadOnlyDictionary<string, int> Limits)
{
    // Capability concedida pelo plano efetivo? (chave do EntitlementCatalog, case-insensitive)
    public bool Has(string entitlementKey) =>
        Entitlements.Contains(entitlementKey, StringComparer.OrdinalIgnoreCase);
}

// Resolutor central do "plano efetivo" + enforcement (gating 402). Encontra o Owner do tenant
// atual e lê a assinatura viva dele; sem assinatura válida → sem entitlements (acesso bloqueado).
public interface IEntitlementService
{
    Task<ResolvedEntitlement> ResolveForCurrentTenantAsync();

    // Verifica se a assinatura dá direito no momento atual (sem consulta ao banco).
    bool IsEntitled(Subscription s);

    // 402 se a capability não estiver no plano efetivo. Eixo único: módulos e sub-features.
    Task RequireEntitlementAsync(string entitlementKey);

    // Açúcar sobre RequireEntitlementAsync usando a chave do módulo — mantém [RequireModule].
    Task RequireModuleAsync(OperationModule module);

    // 402 se `currentCount` já atingiu o limite (limite -1 = ilimitado).
    Task EnsureWithinLimitAsync(string limitKey, int currentCount);
}
