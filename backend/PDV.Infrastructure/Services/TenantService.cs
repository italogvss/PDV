using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PDV.Application.DTOs.Tenants;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class TenantService(
    ITenantRepository tenantRepository,
    IUserRepository userRepository,
    IConfiguration configuration) : ITenantService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<(CreateTenantResponse Response, string AccessToken)> CreateAsync(
        Guid userId, CreateTenantRequest request)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var tenant = new Tenant();

        tenant.Settings = new TenantSettings
        {
            TenantId = tenant.Id,

            FantasyName        = request.FantasyName.Trim(),
            Phone              = request.Phone?.Trim(),
            Segment            = request.Segment,
            LogoUrl            = request.LogoUrl,

            CompanyName        = request.SkipDocuments ? null : request.CompanyName?.Trim(),
            Cnpj               = request.SkipDocuments ? null : StripMask(request.Cnpj),
            StateRegistration  = request.SkipDocuments ? null : request.StateRegistration?.Trim(),
            TaxRegime          = request.TaxRegime,

            AddressCep         = StripMask(request.Cep),
            AddressStreet      = request.Street?.Trim(),
            AddressNumber      = request.Number?.Trim(),
            AddressComplement  = request.Complement?.Trim(),
            AddressNeighborhood = request.Neighborhood?.Trim(),
            AddressCity        = request.City?.Trim(),
            AddressState       = request.State?.Trim(),

            BusinessHoursJson  = request.SkipHours || request.BusinessHours is null
                                    ? null
                                    : JsonSerializer.Serialize(request.BusinessHours, JsonOptions),
        };

        tenant.UserTenants =
        [
            new UserTenant
            {
                UserId   = userId,
                TenantId = tenant.Id,
                Role     = UserRole.Owner,
                JoinedAt = DateTime.UtcNow,
            }
        ];

        await tenantRepository.AddAsync(tenant);

        user.LastTenantId = tenant.Id;
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);

        var accessToken = GenerateToken(userId, tenant.Id, user.Name, UserRole.Owner.ToString());
        var response    = new CreateTenantResponse(tenant.Id, tenant.Settings.FantasyName);

        return (response, accessToken);
    }

    private static string? StripMask(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? null
            : System.Text.RegularExpressions.Regex.Replace(value, @"\D", "");

    private string GenerateToken(Guid userId, Guid tenantId, string name, string role)
    {
        var secret = configuration["JWT_SECRET"]
            ?? throw new InvalidOperationException("JWT_SECRET não configurado.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresHours = int.TryParse(configuration["JWT_EXPIRES_HOURS"], out var h) ? h : 8;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("tenantId", tenantId.ToString()),
            new Claim(JwtRegisteredClaimNames.Name, name),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiresHours),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
