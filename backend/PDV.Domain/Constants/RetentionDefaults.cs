namespace PDV.Domain.Constants;

// Depois que o acesso cai (assinatura Expired — trial vencido, cancelamento consumado, reembolso,
// checkout abandonado ou renovação que falhou), os dados do Owner ficam disponíveis por este prazo
// para que ele possa exportá-los ou reassinar. Vencido o prazo, o TenantDeletionBackgroundService
// apaga o tenant definitivamente. Assinar de novo limpa o agendamento.
public static class RetentionDefaults
{
    public const int DaysAfterAccessLoss = 90;
}
