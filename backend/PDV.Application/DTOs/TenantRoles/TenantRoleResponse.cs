namespace PDV.Application.DTOs.TenantRoles;

public record TenantRoleResponse(
    Guid Id,
    string Name,
    string? Description,
    bool IsDefault,
    int MemberCount,
    IEnumerable<string> Permissions);
