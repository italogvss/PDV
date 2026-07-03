namespace PDV.Application.Interfaces;

// Abstração de provedor OAuth (Google hoje; Apple/Facebook no futuro). Cada provedor valida a
// credencial recebida do frontend e devolve os dados normalizados do usuário.
public interface IOAuthProvider
{
    string ProviderName { get; }

    // Valida a credencial (ex.: Google ID Token) — assinatura, audience, expiração e e-mail
    // verificado — e retorna os dados do usuário. Lança UnauthorizedException se inválida.
    Task<OAuthUserInfo> ValidateAsync(string credential);
}

// Dados normalizados do usuário autenticado por um provedor OAuth.
// `ProviderId` é o identificador estável do provedor (ex.: `sub` do Google).
public record OAuthUserInfo(string ProviderId, string Email, bool EmailVerified, string Name, string? AvatarUrl);
