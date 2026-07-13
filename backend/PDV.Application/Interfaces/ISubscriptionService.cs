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

    // Simula a troca sem executá-la: valida as mesmas regras e devolve quanto será cobrado agora.
    // É o que o diálogo de confirmação mostra antes de o usuário decidir (RF-37).
    Task<ChangePlanResult> PreviewChangePlanAsync(ChangePlanRequest request);

    // Executa a troca. Um upgrade vale na hora e cobra a diferença proporcional; uma troca que
    // retira recursos ou encurta o ciclo fica agendada para a virada. Ver ChangePlanResult.
    Task<ChangePlanResult> ChangePlanAsync(ChangePlanRequest request);

    // Cancela a assinatura do usuário: em trial o acesso ao plano cai na hora; dentro da janela de
    // arrependimento o estorno é emitido e o acesso cai; fora dela o acesso segue até o fim do
    // período pago. Em nenhum caso a loja é desativada. Ver CancelSubscriptionResult.
    Task<CancelSubscriptionResult> CancelAsync();
}
