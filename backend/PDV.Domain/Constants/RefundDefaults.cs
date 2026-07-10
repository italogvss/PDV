namespace PDV.Domain.Constants;

// Janela de arrependimento: dentro dela o cancelamento encerra a assinatura na hora e abre uma
// solicitação de reembolso (Subscription.RefundRequested). Contada a partir de
// Subscription.StartedAt — o momento em que a assinatura paga passou a valer. Renovações não
// reabrem a janela; uma reativação sim, porque grava um novo StartedAt.
//
// O estorno em si NÃO tem endpoint na API do AbacatePay: é aprovado manualmente no painel, e só
// então chega o webhook `checkout.refunded` que fecha o ciclo.
public static class RefundDefaults
{
    public const int WindowDays = 7;
}
