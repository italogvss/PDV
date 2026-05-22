using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PDV.Application.DTOs.Auth;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class AuthService(
    IUserRepository userRepository,
    ITenantRepository tenantRepository,
    IConfiguration configuration) : IAuthService
{
    public async Task<(string AccessToken, string RefreshToken, bool HasTenants)> LoginWithGoogleAsync(
        string credential)
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

        return await HandleGoogleCallbackAsync(
            payload.Subject, payload.Email, payload.Name ?? string.Empty, payload.Picture);
    }

    private async Task<(string AccessToken, string RefreshToken, bool HasTenants)> HandleGoogleCallbackAsync(
        string googleId, string email, string name, string? avatarUrl)
    {
        var user = await userRepository.GetByGoogleIdAsync(googleId)
                ?? await userRepository.GetByEmailAsync(email);

        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                GoogleId = googleId,
                Email = email,
                Name = name,
                AvatarUrl = avatarUrl,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            user.Settings = new UserSettings
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Theme = Theme.Light,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            await userRepository.AddAsync(user);
        }
        else
        {
            var changed = false;
            if (user.Name != name) { user.Name = name; changed = true; }
            if (user.AvatarUrl != avatarUrl) { user.AvatarUrl = avatarUrl; changed = true; }
            if (user.GoogleId != googleId) { user.GoogleId = googleId; changed = true; }
            if (changed)
            {
                user.UpdatedAt = DateTime.UtcNow;
                await userRepository.UpdateAsync(user);
            }
        }

        var tenants = user.UserTenants.ToList();
        var hasTenants = tenants.Count > 0;

        Guid? tenantId = null;
        var role = UserRole.Owner.ToString();

        if (hasTenants)
        {
            var active = user.LastTenantId.HasValue
                ? tenants.FirstOrDefault(ut => ut.TenantId == user.LastTenantId) ?? tenants[0]
                : tenants[0];
            tenantId = active.TenantId;
            role = active.Role.ToString();
        }

        var rawRefreshToken = GenerateRefreshToken();
        user.RefreshToken = HashRefreshToken(rawRefreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);

        return (GenerateToken(user.Id, tenantId, user.Name, role), rawRefreshToken, hasTenants);
    }

    public async Task<(string AccessToken, string RefreshToken)> RefreshAsync(string refreshToken)
    {
        var hashed = HashRefreshToken(refreshToken);
        var user = await userRepository.GetByRefreshTokenAsync(hashed)
            ?? throw new UnauthorizedException("Refresh token inválido.");

        if (user.RefreshTokenExpiry is null || user.RefreshTokenExpiry < DateTime.UtcNow)
            throw new UnauthorizedException("Refresh token expirado.");

        var tenants = user.UserTenants.ToList();
        Guid? tenantId = null;
        var role = UserRole.Owner.ToString();

        if (tenants.Count > 0)
        {
            var active = user.LastTenantId.HasValue
                ? tenants.FirstOrDefault(ut => ut.TenantId == user.LastTenantId) ?? tenants[0]
                : tenants[0];
            tenantId = active.TenantId;
            role = active.Role.ToString();
        }

        var newRawRefreshToken = GenerateRefreshToken();
        user.RefreshToken = HashRefreshToken(newRawRefreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);

        return (GenerateToken(user.Id, tenantId, user.Name, role), newRawRefreshToken);
    }

    public async Task LogoutAsync(Guid userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);
    }

    public async Task<MeResponse> GetMeAsync(Guid userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        return new MeResponse(user.Id, user.Name, user.Email, user.AvatarUrl, user.LastTenantId);
    }

    public async Task<string> CreateTenantAsync(Guid userId, CreateTenantRequest request)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            CNPJ = request.CNPJ,
            Address = request.Address,
            Phone = request.Phone,
            LogoUrl = request.LogoUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        tenant.Settings = new TenantSettings
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        tenant.UserTenants =
        [
            new UserTenant
            {
                UserId = userId,
                TenantId = tenant.Id,
                Role = UserRole.Owner,
                JoinedAt = DateTime.UtcNow,
            }
        ];

        await tenantRepository.AddAsync(tenant);

        user.LastTenantId = tenant.Id;
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);

        return GenerateToken(userId, tenant.Id, user.Name, UserRole.Owner.ToString());
    }

    public async Task<string> SwitchTenantAsync(Guid userId, Guid tenantId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var userTenant = user.UserTenants.FirstOrDefault(ut => ut.TenantId == tenantId)
            ?? throw new UnauthorizedException("Usuário não pertence a este tenant.");

        user.LastTenantId = tenantId;
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);

        return GenerateToken(userId, tenantId, user.Name, userTenant.Role.ToString());
    }

    public async Task<IEnumerable<TenantListItem>> GetUserTenantsAsync(Guid userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        return user.UserTenants
            .Select(ut => new TenantListItem(ut.TenantId, ut.Tenant.Name, ut.Role.ToString()));
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static string HashRefreshToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hash);
    }

    private string GenerateToken(Guid userId, Guid? tenantId, string name, string role)
    {
        var secret = configuration["JWT_SECRET"]
            ?? throw new InvalidOperationException("JWT_SECRET não configurado.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresHours = int.TryParse(configuration["JWT_EXPIRES_HOURS"], out var h) ? h : 8;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("tenantId", tenantId?.ToString() ?? ""),
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
