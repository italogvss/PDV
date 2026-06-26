namespace PDV.Application.DTOs.TenantRoles;

public record TenantRoleResponse(
    Guid Id,
    string Name,
    string? Description,
    string? Color,
    bool IsDefault,
    int MemberCount,
    IEnumerable<string> Permissions,
    DateTime UpdatedAt = default);
