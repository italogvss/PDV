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
            var entitlements = PlanJson.ReadEntitlements(subscription.Plan.EntitledModulesJson);
            var limits = PlanJson.ReadLimits(subscription.Plan.LimitsJson);
            return new ResolvedEntitlement(subscription, subscription.Plan, entitlements, limits);
        }

        // Sem assinatura válida → SEM acesso (não existe mais plano Free permanente). Todos os
        // controllers com [RequireModule] retornam 402 → app bloqueado até assinar. `subscription`
        // pode estar presente (ex.: trial/assinatura expirada) para a UI exibir status/renovação.
        return new ResolvedEntitlement(subscription, null, [], EmptyLimits);
    }

    public async Task RequireEntitlementAsync(string entitlementKey)
    {
        var resolved = await ResolveForCurrentTenantAsync();

        if (!resolved.Has(entitlementKey))
            throw new PaymentRequiredException(
                "Recurso indisponível no seu plano.",
                "Este recurso não está incluído no plano atual. Faça upgrade para utilizá-lo.",
                "NOT_IN_PLAN");
    }

    // Módulo é só uma capability coarse — delega ao gate único de entitlement.
    public Task RequireModuleAsync(OperationModule module) =>
        RequireEntitlementAsync(EntitlementCatalog.ForModule(module));

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

    private static readonly IReadOnlyDictionary<string, int> EmptyLimits = new Dictionary<string, int>();
}
