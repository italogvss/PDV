using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using PDV.Application.Interfaces;
using PDV.Domain.Exceptions;

namespace PDV.Infrastructure.Services;

public class GoogleOAuthProvider(IConfiguration configuration) : IOAuthProvider
{
    public string ProviderName => "Google";

    public async Task<OAuthUserInfo> ValidateAsync(string credential)
    {
        if (string.IsNullOrWhiteSpace(credential))
            throw new UnauthorizedException("Credencial do Google ausente.");

        var clientId = configuration["Authentication:Google:ClientId"]
            ?? throw new InvalidOperationException("Google ClientId não configurado.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            // Valida assinatura (chaves públicas do Google), issuer, expiração e audience.
            payload = await GoogleJsonWebSignature.ValidateAsync(
                credential,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });
        }
        catch (InvalidJwtException)
        {
            throw new UnauthorizedException("Token do Google inválido.");
        }

        // E-mail não verificado abriria vetor de account-takeover no fallback por e-mail.
        if (!payload.EmailVerified)
            throw new UnauthorizedException("E-mail do Google não verificado.");

        return new OAuthUserInfo(
            payload.Subject, payload.Email, payload.EmailVerified,
            payload.Name ?? string.Empty, payload.Picture);
    }
}
