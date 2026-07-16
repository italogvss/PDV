using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Registro de acesso à aplicação (Marco Civil da Internet, art. 15): data/hora, IP e referência do
// login. Guarda obrigatória de no mínimo 6 meses. Scoped por UserId, GLOBAL (sem query filter de
// tenant) — o login acontece antes de haver contexto de tenant. Sem FK para User: o registro precisa
// sobreviver à anonimização/exclusão do usuário (o UserId permanece como referência).
public class AccessLog : BaseEntity
{
    public Guid UserId { get; set; }
    public AccessEvent Event { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    // A data/hora do evento é o CreatedAt herdado de BaseEntity.
}
