using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Ledger de conformidade (append-only por convenção) do encerramento de conta/loja. Registra quando
// foi solicitado, quando (e se) foi efetivado, e quais categorias foram eliminadas/retidas — é a
// prova de conformidade LGPD. Scoped por UserId (Owner); não recebe query filter de tenant.
//
// Nota: "imutável" é intenção de design — nenhum job de cleanup toca esta tabela. Só transições de
// Status (Requested → Cancelled/Effected → Purged) e os carimbos EffectedAt/PurgeAfter são gravados.
public class AccountDeletion : BaseEntity
{
    public Guid UserId { get; set; }

    public AccountDeletionScope Scope { get; set; }

    // Preenchido apenas no escopo SingleStore (o tenant encerrado). null no encerramento de conta.
    public Guid? TenantId { get; set; }

    public AccountDeletionPath Path { get; set; }
    public AccountDeletionStatus Status { get; set; } = AccountDeletionStatus.Requested;

    public DateTime RequestedAt { get; set; }

    // Início da carência bloqueada (= User.AccountDeletionEffectiveAt).
    public DateTime CarencyStartsAt { get; set; }

    // Fim da carência = quando o pipeline de exclusão roda (CarencyStartsAt + DeletionGraceDays).
    public DateTime ScheduledDeletionAt { get; set; }

    // Quando o pipeline efetivamente rodou.
    public DateTime? EffectedAt { get; set; }

    // Prazo do expurgo final dos registros em legal-hold (EffectedAt + LegalHoldYears).
    public DateTime? PurgeAfter { get; set; }

    public bool SubscriptionCanceled { get; set; }
    public bool RefundRequested { get; set; }

    // Snapshot dos tenants abrangidos e do resultado por categoria (para a prova de conformidade).
    public string? TenantIdsJson { get; set; }
    public string? CategoriesJson { get; set; }
}
