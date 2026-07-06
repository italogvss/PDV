using Microsoft.AspNetCore.Http;
using PDV.Application.Interfaces;

namespace PDV.Infrastructure.Services;

public class TenantContext(IHttpContextAccessor accessor) : ITenantContext
{
    public Guid TenantId
    {
        get
        {
            var claim = accessor.HttpContext?.User?.FindFirst("tenantId")
                ?? throw new UnauthorizedAccessException("TenantId não encontrado no token.");
            // Usuário sem tenant ainda (onboarding pendente) carrega o claim vazio — Guid.Empty
            // sinaliza "sem tenant" em vez de lançar, permitindo endpoints tenant-independentes
            // (ex.: assinatura, escopada por usuário) funcionarem antes da criação do tenant.
            return Guid.TryParse(claim.Value, out var tenantId) ? tenantId : Guid.Empty;
        }
    }
}
 