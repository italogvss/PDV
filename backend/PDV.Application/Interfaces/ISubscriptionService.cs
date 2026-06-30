using PDV.Application.DTOs.Subscriptions;

namespace PDV.Application.Interfaces;

public interface ISubscriptionService
{
    // Assinatura efetiva do tenant atual (resolvida via o Owner da loja). Sem assinatura viva →
    // Status "None"/expirado, sem módulos (acesso bloqueado — não há mais plano Free).
    Task<SubscriptionResponse> GetMineAsync();

    Task<IReadOnlyList<PlanResponse>> GetPlansAsync();

    // Owner-only — opera sobre a assinatura do usuário autenticado.
    Task<StartCheckoutResponse> StartCheckoutAsync(StartCheckoutRequest request);
    Task ChangePlanAsync(ChangePlanRequest request);
    Task CancelAsync();
}
