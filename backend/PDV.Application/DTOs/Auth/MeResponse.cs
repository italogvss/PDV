namespace PDV.Application.DTOs.Auth;

public record MeResponse(
    Guid Id,
    string Name,
    string Email,
    string? AvatarUrl,
    Guid? LastTenantId);
