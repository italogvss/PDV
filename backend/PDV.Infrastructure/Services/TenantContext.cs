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
            return Guid.Parse(claim.Value);
        }
    }
}
 