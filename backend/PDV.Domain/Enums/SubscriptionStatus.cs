namespace PDV.Domain.Enums;

// Estado do ciclo de vida de uma assinatura. `Pending` = checkout iniciado, aguardando
// confirmação do gateway (webhook). Os demais espelham o contrato do frontend.
public enum SubscriptionStatus
{
    Pending,
    Trialing,
    Active,
    Canceled,
    Expired,
}
