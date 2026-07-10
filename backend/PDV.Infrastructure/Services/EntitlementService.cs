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
    IUserContext userContext,
    IUserTenantRepository userTenantRepository,
    ISubscriptionRepository subscriptionRepository) : IEntitlementService
{
    public async Task<ResolvedEntitlement> ResolveForCurrentTenantAsync()
    {
        // Sem tenant (onboarding pendente) não há "dono do tenant" a buscar — quem está logado
        // só pode ser o próprio usuário que eventualmente vai criar o tenant, então a assinatura
        // relevante é a dele mesmo (ex.: já contratou um plano antes de finalizar o onboarding).
        Guid? ownerId = tenantContext.TenantId == Guid.Empty
            ? userContext.UserId
            : await userTenantRepository.GetOwnerUserIdAsync(tenantContext.TenantId);
        var subscription = ownerId is null ? null : await subscriptionRepository.GetByUserIdAsync(ownerId.Value);

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

    public bool IsEntitled(Subscription s) => s.IsEntitledAt(DateTime.UtcNow);

    private static readonly IReadOnlyDictionary<string, int> EmptyLimits = new Dictionary<string, int>();
}
