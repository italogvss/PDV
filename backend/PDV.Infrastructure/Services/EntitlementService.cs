using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

// Resolve o plano efetivo do tenant atual via o Owner da loja e aplica o enforcement 402.
public class EntitlementService(
    ITenantContext tenantContext,
    IUserTenantRepository userTenantRepository,
    ISubscriptionRepository subscriptionRepository) : IEntitlementService
{
    public async Task<ResolvedEntitlement> ResolveForCurrentTenantAsync()
    {
        var ownerId = await userTenantRepository.GetOwnerUserIdAsync(tenantContext.TenantId);
        var subscription = ownerId is null ? null : await subscriptionRepository.GetLiveByUserIdAsync(ownerId.Value);

        if (subscription is not null && IsEntitled(subscription))
        {
            var modules = PlanJson.ReadModules(subscription.Plan.EntitledModulesJson);
            var limits = PlanJson.ReadLimits(subscription.Plan.LimitsJson);
            return new ResolvedEntitlement(subscription, subscription.Plan, modules, limits);
        }

        // Sem assinatura válida → plano Free (módulos/limites de FreePlanDefaults). `subscription`
        // pode estar presente (ex.: expirada) para a UI exibir status/reativação.
        return new ResolvedEntitlement(subscription, null, FreeModules(), FreePlanDefaults.Limits);
    }

    public async Task RequireModuleAsync(OperationModule module)
    {
        var resolved = await ResolveForCurrentTenantAsync();
        var wire = module.ToString().ToLowerInvariant();

        if (!resolved.Modules.Contains(wire))
            throw new PaymentRequiredException(
                "Recurso indisponível no seu plano.",
                $"O módulo '{wire}' não está incluído no plano atual. Faça upgrade para utilizá-lo.",
                "MODULE_NOT_IN_PLAN");
    }

    public async Task EnsureWithinLimitAsync(string limitKey, int currentCount)
    {
        var resolved = await ResolveForCurrentTenantAsync();
        var limit = resolved.Limits.TryGetValue(limitKey, out var value) ? value : PlanLimits.Unlimited;

        if (limit == PlanLimits.Unlimited) return;

        if (currentCount >= limit)
            throw new PaymentRequiredException(
                "Limite do plano atingido.",
                $"Seu plano permite no máximo {limit}. Faça upgrade para aumentar o limite.",
                "PLAN_LIMIT_EXCEEDED");
    }

    // Tem direito ao plano enquanto: em trial não expirado; ou ativo/cancelado dentro do período.
    public bool IsEntitled(Subscription s)
    {
        var now = DateTime.UtcNow;
        return s.Status switch
        {
            SubscriptionStatus.Trialing => s.TrialEndsAt is null || s.TrialEndsAt > now,
            SubscriptionStatus.Active or SubscriptionStatus.Canceled => s.CurrentPeriodEnd is null || s.CurrentPeriodEnd > now,
            _ => false,
        };
    }

    private static IReadOnlyList<string> FreeModules() =>
        FreePlanDefaults.Modules.Select(m => m.ToString().ToLowerInvariant()).ToList();
}
