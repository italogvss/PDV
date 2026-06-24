using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Log de auditoria centralizado. Cabeçalho fixo (quem fez, quando, em qual entidade)
// + DetailsJson livre com o payload específico de cada ação.
//
// Sem navegações/FKs para User ou para a entidade alvo: é um registro denormalizado e
// imutável — preserva os dados mesmo após hard-delete do alvo ou do autor.
public class AuditLog : BaseEntity
{
    public Guid TenantId { get; set; }
    public AuditAction Action { get; set; }
    public AuditEntityType EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public Guid? PerformedByUserId { get; set; }
    public string PerformedByName { get; set; } = string.Empty;
    public string? DetailsJson { get; set; }
}
