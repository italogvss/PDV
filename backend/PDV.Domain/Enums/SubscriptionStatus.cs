namespace PDV.Domain.Enums;

// Estado do ciclo de vida de uma assinatura. `Pending` = checkout iniciado, aguardando
// confirmação do gateway (webhook). `RefundRequested` = cancelamento dentro da janela de reembolso:
// a assinatura já foi encerrada no gateway e o acesso caiu, mas o estorno é aprovado manualmente no
// painel do AbacatePay — só então chega `checkout.refunded` e o estado final vira `Expired`.
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
