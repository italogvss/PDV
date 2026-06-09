using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using FluentValidation;
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
    ITenantRoleRepository roleRepository,
    ITenantContext tenantContext,
    IValidator<BusinessSettingsDto> businessValidator,
    IValidator<OperationSettingsDto> operationValidator,
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

        await roleRepository.AddRangeAsync(CreateDefaultRoles(tenant.Id));

        user.LastTenantId = tenant.Id;
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);

        var accessToken = GenerateToken(userId, tenant.Id, user.Name, UserRole.Owner.ToString());
        var response    = new CreateTenantResponse(tenant.Id, tenant.Settings.FantasyName);

        return (response, accessToken);
    }

    public async Task<TenantSettingsResponse> GetSettingsAsync()
    {
        var settings = await tenantRepository.GetSettingsAsync(tenantContext.TenantId)
            ?? throw new NotFoundException("Configurações do tenant não encontradas.");
        return Map(settings);
    }

    public async Task<BusinessSettingsDto> UpdateBusinessAsync(BusinessSettingsDto request)
    {
        await businessValidator.ValidateAndThrowAsync(request);

        var settings = await tenantRepository.GetSettingsAsync(tenantContext.TenantId)
            ?? throw new NotFoundException("Configurações do tenant não encontradas.");

        settings.FantasyName       = request.FantasyName.Trim();
        settings.CompanyName       = request.CompanyName?.Trim();
        settings.Cnpj              = StripMask(request.Cnpj);
        settings.StateRegistration = request.StateRegistration?.Trim();
        settings.Segment           = request.Segment?.Trim();
        settings.Phone             = request.Phone?.Trim();
        settings.LogoUrl           = request.LogoUrl;
        settings.TaxRegime         = request.TaxRegime;

        settings.AddressCep          = StripMask(request.Address.Cep);
        settings.AddressStreet       = request.Address.Street?.Trim();
        settings.AddressNumber       = request.Address.Number?.Trim();
        settings.AddressComplement   = request.Address.Complement?.Trim();
        settings.AddressNeighborhood = request.Address.Neighborhood?.Trim();
        settings.AddressCity         = request.Address.City?.Trim();
        settings.AddressState        = request.Address.State?.Trim();

        settings.BusinessHoursJson = request.BusinessHours is null
            ? null
            : JsonSerializer.Serialize(request.BusinessHours, JsonOptions);

        settings.UpdatedAt = DateTime.UtcNow;
        await tenantRepository.UpdateSettingsAsync(settings);

        return Map(settings).Business;
    }

    public async Task<OperationSettingsDto> UpdateOperationAsync(OperationSettingsDto request)
    {
        await operationValidator.ValidateAndThrowAsync(request);

        var settings = await tenantRepository.GetSettingsAsync(tenantContext.TenantId)
            ?? throw new NotFoundException("Configurações do tenant não encontradas.");

        settings.AutoOpen              = request.AutoOpen;
        settings.RequireOperator       = request.RequireOperator;
        settings.CashFundAmount        = request.CashFundAmount;
        settings.InactivityLockMinutes = request.InactivityLockMinutes;
        settings.AllowDiscounts        = request.AllowDiscounts;
        settings.DiscountLimitPercent  = request.DiscountLimitPercent;
        settings.RequireManagerCancel  = request.RequireManagerCancel;
        settings.BarcodeReader         = request.BarcodeReader;

        settings.UpdatedAt = DateTime.UtcNow;
        await tenantRepository.UpdateSettingsAsync(settings);

        return Map(settings).Operation;
    }

    private static TenantSettingsResponse Map(TenantSettings s) =>
        new(
            new BusinessSettingsDto(
                s.LogoUrl,
                s.FantasyName,
                s.CompanyName,
                s.Cnpj,
                s.StateRegistration,
                s.Segment,
                s.Phone,
                s.TaxRegime,
                new SettingsAddressDto(
                    s.AddressCep, s.AddressStreet, s.AddressNumber, s.AddressComplement,
                    s.AddressNeighborhood, s.AddressCity, s.AddressState),
                s.BusinessHoursJson is null
                    ? null
                    : JsonSerializer.Deserialize<Dictionary<string, BusinessHoursDayDto>>(s.BusinessHoursJson, JsonOptions)),
            new OperationSettingsDto(
                s.AutoOpen,
                s.RequireOperator,
                s.CashFundAmount,
                s.InactivityLockMinutes,
                s.AllowDiscounts,
                s.DiscountLimitPercent,
                s.RequireManagerCancel,
                s.BarcodeReader));

    private static IEnumerable<TenantRole> CreateDefaultRoles(Guid tenantId)
    {
        return
        [
            new TenantRole
            {
                TenantId = tenantId,
                Name = "Gerente",
                Description = "Acesso completo ao sistema.",
                IsDefault = true,
                Permissions =
                [
                    new() { Permission = Permission.SellProducts },
                    new() { Permission = Permission.CancelSales },
                    new() { Permission = Permission.ViewStock },
                    new() { Permission = Permission.ManageStock },
                    new() { Permission = Permission.ViewExpenses },
                    new() { Permission = Permission.ManageExpenses },
                    new() { Permission = Permission.ViewReports },
                    new() { Permission = Permission.ManageEmployees },
                ],
            },
            new TenantRole
            {
                TenantId = tenantId,
                Name = "Atendente",
                Description = "Realiza vendas e consulta estoque.",
                IsDefault = true,
                Permissions =
                [
                    new() { Permission = Permission.SellProducts },
                    new() { Permission = Permission.ViewStock },
                ],
            },
            new TenantRole
            {
                TenantId = tenantId,
                Name = "Estoquista",
                Description = "Gerencia o estoque.",
                IsDefault = true,
                Permissions =
                [
                    new() { Permission = Permission.ViewStock },
                    new() { Permission = Permission.ManageStock },
                ],
            },
        ];
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
