using PDV.Application.Interfaces;
using PDV.Domain.Interfaces;

namespace PDV.Api.Middleware;

// Enforcement do bloqueio de conta em exclusão. Quando a carência começou
// (User.AccountDeletionEffectiveAt <= now), bloqueia TODAS as rotas exceto a allowlist necessária
// para o Owner exportar os dados, reativar a conta, ver o estado ou sair. Distinto do gate de plano
// (402): aqui o acesso é barrado por estar em processo de exclusão (423), não por falta de plano.
//
// Enforcement stateful (query por request): o pedido acontece no meio da sessão e não há como
// revogar um access_token já emitido só por claim — a checagem no banco garante o bloqueio imediato,
// inclusive no Path B, em que a carência começa numa data futura.
public class AccountDeletionBlockMiddleware(RequestDelegate next)
{
    private static readonly string[] Allowlist =
    [
        "/api/auth/me",
        "/api/auth/logout",
        "/api/auth/refresh",
        "/api/account/deletion", // ver estado + reativar (cancel)
    ];

    public async Task InvokeAsync(HttpContext context, IUserRepository userRepository, IUserContext userContext)
    {
        if (context.User.Identity?.IsAuthenticated == true && !IsAllowed(context.Request.Path))
        {
            var effectiveAt = await userRepository.GetAccountDeletionEffectiveAtAsync(userContext.UserId);
            if (effectiveAt is DateTime eff && eff <= DateTime.UtcNow)
            {
                context.Response.StatusCode = 423; // Locked
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsync(
                    """{"type":"https://tools.ietf.org/html/rfc7807","title":"Conta em processo de exclusão.","detail":"Sua conta está em processo de exclusão. Durante a carência você pode reativá-la ou exportar seus dados.","status":423,"code":"ACCOUNT_PENDING_DELETION"}""");
                return;
            }
        }

        await next(context);
    }

    // Allowlist explícita + qualquer rota de exportação de dados (/.../export...), que precisa
    // continuar acessível durante a carência para o Owner baixar os próprios dados.
    private static bool IsAllowed(PathString path) =>
        Allowlist.Any(p => path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase))
        || (path.Value?.Contains("/export", StringComparison.OrdinalIgnoreCase) ?? false);
}
