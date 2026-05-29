using PDV.Application.DTOs.Users;

namespace PDV.Application.DTOs.Auth;

public record MeResponse(
    Guid Id,
    string Name,
    string Email,
    string? AvatarUrl,
    Guid? LastTenantId,
    string Role,
    UserSettingsDTO? Settings = null,
    IEnumerable<TenantListItem>? Tenants = null,
    bool MustChangePassword = false);
