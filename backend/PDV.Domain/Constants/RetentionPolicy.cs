using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Política de retenção por categoria — fonte única dos prazos usados pelos jobs de purge/cleanup.
// Concentrar aqui (em vez de espalhar prazos por handler) mantém a regra jurídica auditável num lugar.
public static class RetentionPolicy
{
    // Prazo de guarda APÓS a exclusão efetiva (o "strip"). TimeSpan.Zero = eliminado já no strip,
    // sem retenção. Usado pelo DataPurgeBackgroundService e pelo AuditLogCleanupService.
    public static TimeSpan RetentionFor(RetentionCategory category) => category switch
    {
        RetentionCategory.NoBasis => TimeSpan.Zero,
        RetentionCategory.AccessLog => TimeSpan.FromDays(RetentionDefaults.AccessLogDays),
        RetentionCategory.Housekeeping => TimeSpan.FromDays(RetentionDefaults.WebhookEventDays),
        // Transacional / cadastro mínimo / auditoria sensível: 5 anos.
        _ => TimeSpan.FromDays(365 * RetentionDefaults.LegalHoldYears),
    };

    // Classificação da trilha de auditoria (AuditLog) por ação. Login/logout (Fase 5) entram como
    // AccessLog (6 meses); as demais ações são financeiras/destrutivas → SensitiveAudit (5 anos).
    public static RetentionCategory CategoryOf(AuditAction action) => action switch
    {
        // Registros de acesso (Marco Civil) — 6 meses.
        AuditAction.UserLoggedIn or AuditAction.UserLoggedOut => RetentionCategory.AccessLog,
        // Ações financeiras/destrutivas — 5 anos.
        _ => RetentionCategory.SensitiveAudit,
    };
}
