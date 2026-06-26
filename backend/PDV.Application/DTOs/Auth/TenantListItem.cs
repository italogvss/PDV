namespace PDV.Application.DTOs.Auth;

public record TenantListItem(
    Guid TenantId,
    string Name,
    string Role,
    string? LogoUrl = null,
    bool IsActive = true,
    DateTime? ScheduledDeletionAt = null);
