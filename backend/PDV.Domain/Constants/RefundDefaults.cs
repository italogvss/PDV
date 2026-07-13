namespace PDV.Domain.Constants;

// Janela de arrependimento: dentro dela o cancelamento encerra a assinatura na hora, revoga o
// acesso e emite o estorno. Contada a partir de Subscription.StartedAt — o momento em que a
// assinatura paga passou a valer. Renovações não reabrem a janela; uma reativação sim, porque
// grava um novo StartedAt.
//
// O estorno é emitido pela API do gateway, mas se consuma de forma assíncrona: a assinatura fica
// em `RefundRequested` (acesso já cortado, checkout bloqueado) até o webhook de estorno confirmar
// que o dinheiro voltou, e só então vira `Expired`.
public static class RefundDefaults
{
    public const int WindowDays = 7;
}
