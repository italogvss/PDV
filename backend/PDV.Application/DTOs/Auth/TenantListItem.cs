namespace PDV.Application.DTOs.Auth;

public record TenantListItem(
    Guid TenantId,
    string Name,
    string Role);
