namespace PDV.Application.DTOs.Auth;

public record CreateTenantRequest(
    string Name,
    string? CNPJ,
    string? Address,
    string? Phone,
    string? LogoUrl);
