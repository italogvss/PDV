using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PDV.Application.DTOs.Tenants;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
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
    IStorageService storage,
    IValidator<BusinessSettingsDto> businessValidator,
    IValidator<OperationSettingsDto> operationValidator,
    IValidator<PaymentsSettingsDto> paymentsValidator,
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

        var segment = ParseSegment(request.Segment);

        tenant.Settings = new TenantSettings
        {
            TenantId = tenant.Id,

            FantasyName        = request.FantasyName.Trim(),
            Phone              = request.Phone?.Trim(),
            Segment            = segment,
            EnabledModulesJson = OperationModuleHelper.Serialize(SegmentModuleDefaults.ForSegment(segment)),
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
        return await Map(settings);
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
        settings.Segment           = ParseSegment(request.Segment);
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

        return (await Map(settings)).Business;
    }

    public async Task<OperationSettingsDto> UpdateOperationAsync(OperationSettingsDto request)
    {
        await operationValidator.ValidateAndThrowAsync(request);

        var settings = await tenantRepository.GetSettingsAsync(tenantContext.TenantId)
            ?? throw new NotFoundException("Configurações do tenant não encontradas.");

        settings.AllowDiscounts                = request.AllowDiscounts;
        settings.DiscountLimitPercent          = request.DiscountLimitPercent;
        settings.InventoryControlEnabled       = request.InventoryControlEnabled;
        settings.DefaultMinStock               = request.DefaultMinStock;
        settings.DefaultCriticalStock          = request.DefaultCriticalStock;
        settings.StockFieldsEditable           = request.StockFieldsEditable;
        settings.RequireCustomerOnSale         = request.RequireCustomerOnSale;
        settings.RequireCustomerOnAppointment  = request.RequireCustomerOnAppointment;

        settings.UpdatedAt = DateTime.UtcNow;
        await tenantRepository.UpdateSettingsAsync(settings);

        return (await Map(settings)).Operation;
    }

    public async Task<PaymentsSettingsDto> UpdatePaymentsAsync(PaymentsSettingsDto request)
    {
        await paymentsValidator.ValidateAndThrowAsync(request);

        var settings = await tenantRepository.GetSettingsAsync(tenantContext.TenantId)
            ?? throw new NotFoundException("Configurações do tenant não encontradas.");

        settings.PaymentFeesEnabled       = request.FeesEnabled;
        settings.PaymentPixEnabled        = request.Pix.Enabled;
        settings.PaymentPixFee            = request.Pix.Fee;
        settings.PaymentCardCreditEnabled = request.CardCredit.Enabled;
        settings.PaymentCardCreditFee     = request.CardCredit.Fee;
        settings.PaymentCardDebitEnabled  = request.CardDebit.Enabled;
        settings.PaymentCardDebitFee      = request.CardDebit.Fee;
        settings.PaymentCashEnabled       = request.Cash.Enabled;
        settings.PaymentCashFee           = request.Cash.Fee;

        settings.UpdatedAt = DateTime.UtcNow;
        await tenantRepository.UpdateSettingsAsync(settings);

        return (await Map(settings)).Payments;
    }

    public async Task<ModulesSettingsDto> UpdateModulesAsync(ModulesSettingsDto request)
    {
        var settings = await tenantRepository.GetSettingsAsync(tenantContext.TenantId)
            ?? throw new NotFoundException("Configurações do tenant não encontradas.");

        settings.EnabledModulesJson = OperationModuleHelper.SerializeFromWire(request.Modules);

        settings.UpdatedAt = DateTime.UtcNow;
        await tenantRepository.UpdateSettingsAsync(settings);

        return (await Map(settings)).Modules;
    }

    private async Task<TenantSettingsResponse> Map(TenantSettings s)
    {
        var logoUrl = await storage.ResolveReadUrlAsync(s.LogoUrl, MediaCategory.Tenant, s.UpdatedAt);
        return
            new(
            new BusinessSettingsDto(
                logoUrl,
                s.FantasyName,
                s.CompanyName,
                s.Cnpj,
                s.StateRegistration,
                s.Segment.ToString().ToLowerInvariant(),
                s.Phone,
                s.TaxRegime,
                new SettingsAddressDto(
                    s.AddressCep, s.AddressStreet, s.AddressNumber, s.AddressComplement,
                    s.AddressNeighborhood, s.AddressCity, s.AddressState),
                s.BusinessHoursJson is null
                    ? null
                    : JsonSerializer.Deserialize<Dictionary<string, BusinessHoursDayDto>>(s.BusinessHoursJson, JsonOptions)),
            new OperationSettingsDto(
                s.AllowDiscounts,
                s.DiscountLimitPercent,
                s.InventoryControlEnabled,
                s.DefaultMinStock,
                s.DefaultCriticalStock,
                s.StockFieldsEditable,
                s.RequireCustomerOnSale,
                s.RequireCustomerOnAppointment),
            new PaymentsSettingsDto(
                s.PaymentFeesEnabled,
                new PaymentMethodDto(s.PaymentPixEnabled, s.PaymentPixFee),
                new PaymentMethodDto(s.PaymentCardCreditEnabled, s.PaymentCardCreditFee),
                new PaymentMethodDto(s.PaymentCardDebitEnabled, s.PaymentCardDebitFee),
                new PaymentMethodDto(s.PaymentCashEnabled, s.PaymentCashFee)),
            new ModulesSettingsDto(OperationModuleHelper.ReadEnabled(s.EnabledModulesJson)));
    }

    // Converte a string do frontend (lowercase, ex.: "varejo") para o enum Segment.
    // Valor ausente ou desconhecido cai em Outro (que habilita todos os módulos).
    private static Segment ParseSegment(string? value) =>
        Enum.TryParse<Segment>(value, ignoreCase: true, out var segment) ? segment : Segment.Outro;

    private static IEnumerable<TenantRole> CreateDefaultRoles(Guid tenantId)
    {
        return
        [
            new TenantRole
            {
                TenantId = tenantId,
                Name = "Gerente",
                Description = "Acesso completo ao sistema.",
                Color = "#db2d2d",
                IsDefault = true,
                Permissions =
                [
                    new() { Permission = Permission.SellProducts },
                    new() { Permission = Permission.CancelSales },
                    new() { Permission = Permission.ViewSalesHistory },
                    new() { Permission = Permission.ViewStock },
                    new() { Permission = Permission.ManageStock },
                    new() { Permission = Permission.ViewExpenses },
                    new() { Permission = Permission.ManageExpenses },
                    new() { Permission = Permission.ViewReports },
                    new() { Permission = Permission.ViewEmployees },
                    new() { Permission = Permission.ManageEmployees },
                    new() { Permission = Permission.ViewCustomers },
                    new() { Permission = Permission.ManageCustomers },
                    new() { Permission = Permission.ViewSuppliers },
                    new() { Permission = Permission.ViewAppointments },
                    new() { Permission = Permission.ManageAppointments },
                ],
            },
            new TenantRole
            {
                TenantId = tenantId,
                Name = "Atendente",
                Description = "Realiza vendas e consulta estoque.",
                Color = "#2d55da",
                IsDefault = true,
                Permissions =
                [
                    new() { Permission = Permission.SellProducts },
                    new() { Permission = Permission.ViewSalesHistory },
                    new() { Permission = Permission.ViewStock },
                    new() { Permission = Permission.ViewCustomers },
                    new() { Permission = Permission.ViewAppointments },
                ],
            },
            new TenantRole
            {
                TenantId = tenantId,
                Name = "Estoquista",
                Color = "#d39b23",
                Description = "Gerencia o estoque.",
                IsDefault = true,
                Permissions =
                [
                    new() { Permission = Permission.ViewStock },
                    new() { Permission = Permission.ManageStock },
                    new() { Permission = Permission.ViewSuppliers },
                ],
            },
        ];
    }

    public async Task ValidateOwnershipAsync(Guid userId, Guid tenantId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var link = user.UserTenants.FirstOrDefault(ut => ut.TenantId == tenantId)
            ?? throw new UnauthorizedException("Sem acesso a este estabelecimento.");

        if (link.Role != UserRole.Owner)
            throw new UnauthorizedException("Apenas o proprietário pode exportar dados deste estabelecimento.");
    }

    public async Task<string> DeactivateCurrentAsync(Guid userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var currentLink = user.UserTenants.FirstOrDefault(ut => ut.TenantId == tenantContext.TenantId)
            ?? throw new NotFoundException("Estabelecimento não encontrado.");

        if (currentLink.Role != UserRole.Owner)
            throw new UnauthorizedException("Apenas o proprietário pode encerrar o estabelecimento.");

        var otherActive = user.UserTenants
            .Where(ut => ut.TenantId != tenantContext.TenantId && ut.Tenant.IsActive)
            .ToList();

        if (otherActive.Count == 0)
            throw new BusinessException("Não é possível encerrar o único estabelecimento ativo. Crie outro negócio antes.");

        var tenant = currentLink.Tenant;
        tenant.IsActive = false;
        tenant.ScheduledDeletionAt = DateTime.UtcNow.AddMonths(1);
        tenant.UpdatedAt = DateTime.UtcNow;
        await tenantRepository.UpdateAsync(tenant);

        var next = otherActive.First();
        user.LastTenantId = next.TenantId;
        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);

        return GenerateToken(userId, next.TenantId, user.Name, next.Role.ToString());
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
