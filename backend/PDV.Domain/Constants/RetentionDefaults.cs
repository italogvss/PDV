namespace PDV.Domain.Constants;

// Prazos de retenção e exclusão de dados.
public static class RetentionDefaults
{
    // Retenção PASSIVA: depois que o acesso cai (assinatura Expired — trial vencido, cancelamento
    // consumado, reembolso, checkout abandonado ou renovação que falhou) SEM pedido de exclusão, os
    // dados do Owner ficam disponíveis por este prazo para exportar ou reassinar. Vencido, o
    // TenantDeletionBackgroundService apaga o tenant. Reassinar limpa o agendamento.
    public const int DaysAfterAccessLoss = 90;

    // Carência de exclusão EXPLÍCITA (encerramento de conta ou de uma loja): a partir do início da
    // carência a conta/loja fica bloqueada, reversível até o vencimento; vencido, roda o pipeline de
    // exclusão/anonimização. Distinto da retenção passiva de 90 dias acima.
    public const int DeletionGraceDays = 30;

    // Expurgo pós-exclusão, por categoria de retenção legal.
    public const int AccessLogDays = 180;   // Marco Civil art. 15 — registros de acesso, mín. 6 meses
    public const int LegalHoldYears = 5;    // CTN 173/195, CC 206§5º, CDC 27 — fiscal/transacional
    public const int WebhookEventDays = 90; // housekeeping — independente de exclusão de conta

    // Housekeeping do log de sistema (Serilog → SystemLog). É diagnóstico operacional, não tem base
    // legal de guarda — prazo curto só para o admin investigar incidentes recentes.
    public const int SystemLogDays = 30;
}
