namespace PDV.Application.DTOs.Tenants;

// Configurações completas do tenant, agrupadas por seção (espelha a tela de Configurações).
public record TenantSettingsResponse(
    BusinessSettingsDto Business,
    OperationSettingsDto Operation,
    PaymentsSettingsDto Payments);

// Seção "Negócio" — também é o corpo do PUT /api/tenants/settings/business.
public record BusinessSettingsDto(
    string? LogoUrl,
    string FantasyName,
    string? CompanyName,
    string? Cnpj,
    string? StateRegistration,
    string? Segment,
    string? Phone,
    string TaxRegime,
    SettingsAddressDto Address,
    Dictionary<string, BusinessHoursDayDto>? BusinessHours);

public record SettingsAddressDto(
    string? Cep,
    string? Street,
    string? Number,
    string? Complement,
    string? Neighborhood,
    string? City,
    string? State);

// Seção "Operação / PDV" — também é o corpo do PUT /api/tenants/settings/operation.
public record OperationSettingsDto(
    bool AllowDiscounts,
    decimal DiscountLimitPercent);

// Seção "Pagamentos" — também é o corpo do PUT /api/tenants/settings/payments.
public record PaymentMethodDto(bool Enabled, decimal Fee);

public record PaymentsSettingsDto(
    PaymentMethodDto Pix,
    PaymentMethodDto CardCredit,
    PaymentMethodDto CardDebit,
    PaymentMethodDto Cash);
