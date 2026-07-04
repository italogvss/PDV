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

    // Cancela a assinatura do usuário. Em trial revoga o acesso na hora (remove a assinatura e
    // desativa as lojas do Owner com exclusão agendada); fora do trial mantém o acesso até o fim
    // do período. Ver CancelSubscriptionResult.
    Task<CancelSubscriptionResult> CancelAsync();
}
