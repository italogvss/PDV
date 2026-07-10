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

    // Agenda a troca de plano no gateway (vale a partir do próximo ciclo, sem cobrança agora).
    // No trial PDV-side a troca é imediata. Ver ChangePlanResult.
    Task<ChangePlanResult> ChangePlanAsync(ChangePlanRequest request);

    // Cancela a assinatura do usuário: em trial o acesso ao plano cai na hora; dentro da janela de
    // arrependimento abre-se uma solicitação de reembolso; fora dela o acesso segue até o fim do
    // período pago. Em nenhum caso a loja é desativada. Ver CancelSubscriptionResult.
    Task<CancelSubscriptionResult> CancelAsync();
}
