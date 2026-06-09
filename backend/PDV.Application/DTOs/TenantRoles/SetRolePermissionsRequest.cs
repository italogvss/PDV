namespace PDV.Application.DTOs.TenantRoles;

public record SetRolePermissionsRequest(IEnumerable<string> Permissions);
