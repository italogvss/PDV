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

    // `customer.subscription.created` (que grava StartedAt) e `invoice.paid` (que grava o PaidAt da
    // cobrança fundadora) são dois eventos independentes do Stripe para o mesmo instante de negócio —
    // na prática o segundo chega com um `created` alguns segundos ANTES do primeiro. Sem essa
    // tolerância, `PaidAt >= StartedAt` descarta sistematicamente a cobrança fundadora e o estorno de
    // toda assinatura nova cancelada dentro da janela nunca é emitido. O intervalo real entre uma
    // reativação e o pagamento do ciclo anterior é medido em dias, não segundos — a folga não risca
    // incluir uma cobrança de um ciclo já encerrado.
    public const int ClockSkewToleranceSeconds = 60;
}
