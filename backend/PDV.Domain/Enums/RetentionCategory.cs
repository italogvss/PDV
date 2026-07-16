namespace PDV.Domain.Enums;

// Categoria de retenção legal por entidade/registro. Governa o que o pipeline de exclusão faz no
// "strip" (fim da carência) e por quanto tempo o "purge" mantém antes do hard-delete definitivo.
public enum RetentionCategory
{
    // Sem base de retenção: hard-delete imediato no strip.
    NoBasis,

    // Registros de acesso (Marco Civil art. 15): mínimo 6 meses.
    AccessLog,

    // Auditoria de ações financeiras/destrutivas: 5 anos.
    SensitiveAudit,

    // Transacional/fiscal (Sale, Payment, Expense...): 5 anos (CTN/CC/CDC).
    Transactional,

    // Cadastro mínimo vinculado a transações (User/Customer reduzidos a nome+documento): 5 anos.
    MinimalCadastral,

    // Housekeeping (WebhookEvent): 90 dias, independente de exclusão de conta.
    Housekeeping,
}
