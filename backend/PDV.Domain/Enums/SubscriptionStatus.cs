namespace PDV.Domain.Enums;

// Estado do ciclo de vida de uma assinatura. `Pending` = checkout iniciado, aguardando
// confirmação do gateway (webhook). `RefundRequested` = cancelamento dentro da janela de reembolso:
// a assinatura já foi encerrada no gateway, o acesso caiu e o estorno foi emitido — é um estado
// transitório, que o webhook de estorno converte em `Expired` quando o dinheiro volta. Ele existe
// para bloquear uma reassinatura enquanto o estorno está em trânsito (RF-19).
// Os demais espelham o contrato do frontend.
public enum SubscriptionStatus
{
    Pending,
    Trialing,
    Active,
    RefundRequested,
    Canceled,
    Expired,
}
