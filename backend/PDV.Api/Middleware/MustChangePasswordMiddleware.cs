namespace PDV.Api.Middleware;

// Enforcement backend do fluxo de troca de senha obrigatória. Enquanto o JWT carrega o claim
// `mustChangePassword == "true"`, bloqueia TODAS as rotas exceto a allowlist mínima necessária para
// concluir a troca (change-password), bootstrapar a sessão (me), rotacionar o token (refresh) e sair
// (logout). Sem isso, um funcionário com senha temporária poderia chamar a API direto sem trocá-la.
//
// Enforcement por claim (stateless): a troca de senha reemite o access_token sem o claim, liberando
// o acesso na hora; o refresh preserva o claim enquanto MustChangePassword continuar true.
public class MustChangePasswordMiddleware(RequestDelegate next)
{
    private static readonly string[] Allowlist =
    [
        "/api/auth/change-password",
        "/api/auth/me",
        "/api/auth/logout",
        "/api/auth/refresh",
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        var user = context.User;
        if (user.Identity?.IsAuthenticated == true &&
            user.FindFirst("mustChangePassword")?.Value == "true" &&
            !IsAllowed(context.Request.Path))
        {
            context.Response.StatusCode = 403;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsync(
                """{"type":"https://tools.ietf.org/html/rfc7807","title":"Troca de senha obrigatória.","detail":"Você precisa trocar a senha temporária antes de usar o sistema.","status":403,"code":"MUST_CHANGE_PASSWORD"}""");
            return;
        }

        await next(context);
    }

    private static bool IsAllowed(PathString path) =>
        Allowlist.Any(p => path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase));
}
