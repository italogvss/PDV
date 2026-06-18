using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using PDV.Application.Interfaces;
using PDV.Domain.Exceptions;

namespace PDV.Infrastructure.Services;

public class UserContext(IHttpContextAccessor accessor) : IUserContext
{
    public Guid UserId
    {
        get
        {
            // O JWT carrega o userId no claim `sub`, mapeado para NameIdentifier pelo handler.
            var claim = accessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)
                ?? accessor.HttpContext?.User?.FindFirst("sub")
                ?? throw new UnauthorizedException("Usuário não identificado.");
            return Guid.Parse(claim.Value);
        }
    }
}
