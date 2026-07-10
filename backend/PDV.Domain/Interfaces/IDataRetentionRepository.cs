namespace PDV.Domain.Interfaces;

// Retenção dos dados após a perda de acesso ao plano. Sem query filter de tenant — varre todos os
// usuários por design.
public interface IDataRetentionRepository
{
    // Reconcilia ScheduledDeletionAt das lojas a partir do estado da assinatura do Owner:
    // sem acesso → agenda a exclusão para `perda de acesso + retentionDays`; com acesso → cancela o
    // agendamento. Quem nunca assinou nem fez trial conta a partir da criação da loja.
    // Idempotente: rodar de novo sem mudança de estado não escreve nada.
    Task<(int Scheduled, int Cleared)> SyncScheduledDeletionAsync(DateTime now, int retentionDays);
}
