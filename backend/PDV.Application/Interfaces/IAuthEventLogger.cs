using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

// Registro de eventos de acesso (login/logout). Grava o AccessLog (Marco Civil art. 15, com IP+data)
// e uma entrada na trilha de auditoria (AuditLog). Nunca lança: uma falha de log não pode derrubar a
// autenticação. Separado do IAuditLogger porque o login acontece FORA do contexto de request
// (sem IUserContext/ITenantContext) — o autor e o tenant são passados explicitamente.
public interface IAuthEventLogger
{
    Task LogAsync(Guid userId, string userName, Guid? tenantId, AccessEvent evt);
}
