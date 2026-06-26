using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FluentValidation;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PDV.Application.DTOs.Auth;
using PDV.Application.DTOs.Users;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;
using BCryptNet = BCrypt.Net.BCrypt;

namespace PDV.Infrastructure.Services;

public class AuthService(
    IUserRepository userRepository,
    IConfiguration configuration,
    IEmployeeRepository employeeRepository,
    ITenantRoleRepository roleRepository,
    IStorageService storage,
    IValidator<ChangePasswordRequest> changePasswordValidator) : IAuthService
{
    public async Task<(string AccessToken, string RefreshToken)> LoginWithGoogleAsync(
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

    private async Task<(string AccessToken, string RefreshToken)> HandleGoogleCallbackAsync(
        string googleId, string email, string name, string? avatarUrl)
    {
        // Busca exclusivamente pelo GoogleId — sem fallback por email para evitar colisão com contas de employee
        var user = await userRepository.GetByExternalAuthAsync("Google", googleId);

        if (user is null)
        {
            user = new User
            {
                Email = email,
                Name = name,
                Role = UserRole.Owner,
                ImageUrl = avatarUrl,
            };
            user.ExternalLogins.Add(new ExternalAuth
            {
                Provider = "Google",
                ProviderId = googleId,
            });
            user.Settings = new UserSettings
            {
                UserId = user.Id,
                Theme = Theme.Light,
            };
            await userRepository.AddAsync(user);
        }
        else
        {
            var changed = false;

            // Vincular Google se ainda não tiver (ex: usuário criado por outro meio)
            if (!user.ExternalLogins.Any(e => e.Provider == "Google" && e.ProviderId == googleId))
            {
                user.ExternalLogins.Add(new ExternalAuth
                {
                    Provider = "Google",
                    ProviderId = googleId,
                });
                changed = true;
            }

            if (user.Name != name) { user.Name = name; changed = true; }
            if (user.ImageUrl != avatarUrl) { user.ImageUrl = avatarUrl; changed = true; }

            if (changed)
            {
                user.UpdatedAt = DateTime.UtcNow;
                await userRepository.UpdateAsync(user);
            }
        }

        var (tenantId, role) = ResolveActiveTenant(user);

        var rawRefreshToken = GenerateRefreshToken();
        user.RefreshToken = HashRefreshToken(rawRefreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);

        return (GenerateToken(user.Id, tenantId, user.Name, role), rawRefreshToken);
    }

    public async Task<(string AccessToken, string RefreshToken)> RefreshAsync(string refreshToken)
    {
        var hashed = HashRefreshToken(refreshToken);
        var user = await userRepository.GetByRefreshTokenAsync(hashed)
            ?? throw new UnauthorizedException("Refresh token inválido.");

        if (user.RefreshTokenExpiry is null || user.RefreshTokenExpiry < DateTime.UtcNow)
            throw new UnauthorizedException("Refresh token expirado.");

        var (tenantId, role) = ResolveActiveTenant(user);

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

    public async Task<MeResponse> GetMeAsync(Guid userId, string role, Guid? tenantId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var settings = user.Settings is not null
            ? new UserSettingsDTO(user.Settings.Theme.ToString(), user.Settings.TextSize, user.Settings.AccentColor)
            : null;

        var tenantItems = new List<TenantListItem>();
        foreach (var ut in user.UserTenants)
        {
            var s = ut.Tenant.Settings;
            var logoUrl = s is not null
                ? await storage.ResolveReadUrlAsync(s.LogoUrl, MediaCategory.Tenant, s.UpdatedAt)
                : null;
            tenantItems.Add(new TenantListItem(ut.TenantId, s?.FantasyName ?? "", ut.Role.ToString(), logoUrl,
                ut.Tenant.IsActive, ut.Tenant.ScheduledDeletionAt));
        }

        var mustChangePassword = user.LocalAuth?.MustChangePassword ?? false;

        IEnumerable<string> permissions = [];
        if (role == "Employee" && tenantId.HasValue)
        {
            var employee = await employeeRepository.GetByUserIdAsync(userId, tenantId.Value);
            if (employee is not null)
            {
                var tenantRole = await roleRepository.GetByIdAsync(employee.RoleId);
                if (tenantRole is not null)
                    permissions = tenantRole.Permissions.Select(p => p.Permission.ToString());
            }
        }

        var imageUrl = await storage.ResolveReadUrlAsync(user.ImageUrl, MediaCategory.Profile, user.UpdatedAt);

        // Módulos da operação ativos do tenant ativo (nulo/sem tenant → lista vazia).
        var activeSettings = tenantId.HasValue
            ? user.UserTenants.FirstOrDefault(ut => ut.TenantId == tenantId.Value)?.Tenant.Settings
            : null;
        var modules = activeSettings is not null
            ? OperationModuleHelper.ReadEnabled(activeSettings.EnabledModulesJson)
            : [];

        return new MeResponse(user.Id, user.Name, user.Email, user.Phone, user.Document, user.BirthDate,
            imageUrl, user.LastTenantId, user.Role.ToString(), settings, tenantItems, mustChangePassword, permissions, modules);
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

        var items = new List<TenantListItem>();
        foreach (var ut in user.UserTenants)
        {
            var s = ut.Tenant.Settings;
            var logoUrl = s is not null
                ? await storage.ResolveReadUrlAsync(s.LogoUrl, MediaCategory.Tenant, s.UpdatedAt)
                : null;
            items.Add(new TenantListItem(ut.TenantId, s?.FantasyName ?? "", ut.Role.ToString(), logoUrl,
                ut.Tenant.IsActive, ut.Tenant.ScheduledDeletionAt));
        }
        return items;
    }

    public async Task<(string AccessToken, string RefreshToken)> LoginWithLocalAsync(string username, string password)
    {
        var user = await userRepository.GetByUsernameAsync(username);

        // Mesma mensagem em todos os casos — não revelar se o usuário existe
        if (user is null || !user.IsActive)
            throw new UnauthorizedException("Credenciais inválidas.");

        var localAuth = user.LocalAuth;
        if (localAuth is null)
            throw new UnauthorizedException("Credenciais inválidas.");

        if (!BCryptNet.Verify(password, localAuth.PasswordHash))
            throw new UnauthorizedException("Credenciais inválidas.");

        var (tenantId, role) = ResolveActiveTenant(user);

        var rawRefreshToken = GenerateRefreshToken();
        user.RefreshToken = HashRefreshToken(rawRefreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);

        var accessToken = localAuth.MustChangePassword
            ? GenerateToken(user.Id, tenantId, user.Name, role, mustChangePassword: true)
            : GenerateToken(user.Id, tenantId, user.Name, role);

        return (accessToken, rawRefreshToken);
    }

    public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
    {
        await changePasswordValidator.ValidateAndThrowAsync(new ChangePasswordRequest(currentPassword, newPassword));

        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var localAuth = user.LocalAuth
            ?? throw new BusinessException("Usuário não possui login por senha.");

        if (!BCryptNet.Verify(currentPassword, localAuth.PasswordHash))
            throw new UnauthorizedException("Senha atual incorreta.");

        localAuth.PasswordHash = BCryptNet.HashPassword(newPassword);
        localAuth.MustChangePassword = false;
        localAuth.UpdatedAt = DateTime.UtcNow;

        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);
    }

    // Resolve o tenant ativo e o papel (role) do token a partir dos vínculos do usuário.
    // O papel vem SEMPRE do UserTenant do tenant ativo — nunca de User.Role (global).
    // Exceção: admins de plataforma (User.Role == Admin) não têm vínculo de tenant.
    private static (Guid? TenantId, string Role) ResolveActiveTenant(User user)
    {
        var tenants = user.UserTenants.ToList();
        if (tenants.Count == 0)
            return (null, string.Empty);

        var active = user.LastTenantId.HasValue
            ? tenants.FirstOrDefault(ut => ut.TenantId == user.LastTenantId) ?? tenants[0]
            : tenants[0];

            if (user.Role == UserRole.Admin)
                return (active.TenantId, user.Role.ToString());

        return (active.TenantId, active.Role.ToString());
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

    private string GenerateToken(Guid userId, Guid? tenantId, string name, string role,
        bool mustChangePassword = false)
    {
        var secret = configuration["JWT_SECRET"]
            ?? throw new InvalidOperationException("JWT_SECRET não configurado.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresHours = int.TryParse(configuration["JWT_EXPIRES_HOURS"], out var h) ? h : 8;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new("tenantId", tenantId?.ToString() ?? ""),
            new(JwtRegisteredClaimNames.Name, name),
            new(ClaimTypes.Role, role),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        if (mustChangePassword)
            claims.Add(new Claim("mustChangePassword", "true"));

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiresHours),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
