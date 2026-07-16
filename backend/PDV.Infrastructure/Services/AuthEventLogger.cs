using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class AuthEventLogger(
    AppDbContext context,
    IHttpContextAccessor httpContextAccessor,
    ILogger<AuthEventLogger> logger) : IAuthEventLogger
{
    public async Task LogAsync(Guid userId, string userName, Guid? tenantId, AccessEvent evt)
    {
        try
        {
            var http = httpContextAccessor.HttpContext;
            var ip = ResolveIp(http);
            var userAgent = Truncate(http?.Request.Headers.UserAgent.ToString(), 512);
            var action = evt == AccessEvent.LoggedIn ? AuditAction.UserLoggedIn : AuditAction.UserLoggedOut;

            // Registro de acesso (Marco Civil) — fonte primária, scoped por UserId.
            await context.AccessLogs.AddAsync(new AccessLog
            {
                UserId = userId,
                Event = evt,
                IpAddress = ip,
                UserAgent = userAgent,
            });

            // Espelho na trilha de auditoria. TenantId pode ser vazio (login antes de haver tenant).
            await context.AuditLogs.AddAsync(new AuditLog
            {
                TenantId = tenantId ?? Guid.Empty,
                Action = action,
                EntityType = AuditEntityType.Authentication,
                EntityId = userId,
                EntityName = userName,
                PerformedByUserId = userId,
                PerformedByName = userName,
            });

            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Log de acesso nunca derruba a autenticação.
            logger.LogWarning(ex, "Falha ao registrar evento de acesso ({Event}) do usuário {UserId}.", evt, userId);
        }
    }

    // X-Forwarded-For (primeiro IP, quando atrás de proxy) tem precedência sobre o IP direto da conexão.
    private static string? ResolveIp(HttpContext? http)
    {
        if (http is null) return null;

        var forwarded = http.Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return Truncate(forwarded.Split(',')[0].Trim(), 45);

        return Truncate(http.Connection.RemoteIpAddress?.ToString(), 45);
    }

    private static string? Truncate(string? value, int max) =>
        string.IsNullOrEmpty(value) ? null : value.Length <= max ? value : value[..max];
}
