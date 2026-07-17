using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace PDV.UnitTests.Support;

// Lê os claims de um access_token emitido pelo AuthService/TenantService. O token é o contrato real
// entre backend e sessão — asseverar o claim emitido é o que prova que role/tenant foram resolvidos
// corretamente, sem depender de detalhes internos do service.
public static class JwtProbe
{
    public static JwtSecurityToken Read(string accessToken) =>
        new JwtSecurityTokenHandler().ReadJwtToken(accessToken);

    public static string? Claim(string accessToken, string type) =>
        Read(accessToken).Claims.FirstOrDefault(c => c.Type == type)?.Value;

    // O AuthService emite o role em ClaimTypes.Role (URI longa); o handler não encurta na leitura.
    public static string? Role(string accessToken) => Claim(accessToken, ClaimTypes.Role);

    public static string? TenantId(string accessToken) => Claim(accessToken, "tenantId");

    public static string? Subject(string accessToken) => Claim(accessToken, JwtRegisteredClaimNames.Sub);

    public static bool HasMustChangePassword(string accessToken) =>
        Claim(accessToken, "mustChangePassword") == "true";
}
