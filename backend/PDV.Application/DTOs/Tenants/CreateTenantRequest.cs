namespace PDV.Application.DTOs.Tenants;

public record BusinessHoursDayDto(bool Open, string OpenTime, string CloseTime);

public record CreateTenantRequest(
    // Step 1 — Negócio
    string FantasyName,
    string? Phone,
    string Segment,
    string? LogoUrl,

    // Step 2 — Documentos
    bool SkipDocuments,
    string? Cnpj,
    string? CompanyName,
    string? StateRegistration,
    string TaxRegime,

    // Step 3 — Endereço
    string? Cep,
    string? Street,
    string? Number,
    string? Complement,
    string? Neighborhood,
    string? City,
    string? State,

    // Step 4 — Horário
    bool SkipHours,
    string? HoursPreset,
    Dictionary<string, BusinessHoursDayDto>? BusinessHours);
