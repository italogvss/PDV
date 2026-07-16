namespace PDV.Domain.Enums;

// Ciclo de vida do pedido de encerramento (ledger AccountDeletion).
public enum AccountDeletionStatus
{
    Requested,  // carência em curso, reversível
    Cancelled,  // reativado pelo Owner antes do vencimento
    Effected,   // pipeline de exclusão/anonimização executado
    Purged,     // dados em legal-hold expurgados após o prazo legal (5 anos)
}
