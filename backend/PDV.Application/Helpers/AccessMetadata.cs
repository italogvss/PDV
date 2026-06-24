using PDV.Application.DTOs.Access;
using PDV.Domain.Constants;
using PDV.Domain.Enums;

namespace PDV.Application.Helpers;

// Monta o AccessMetadataResponse a partir dos enums e do ModuleCatalog (dados estáticos).
public static class AccessMetadata
{
    public static AccessMetadataResponse Build()
    {
        var modules = Enum.GetValues<OperationModule>()
            .Select(m => m.ToString().ToLowerInvariant())
            .ToList();

        var permissions = Enum.GetValues<Permission>()
            .Select(p => p.ToString())
            .ToList();

        var modulePermissions = ModuleCatalog.ModulePermissions.ToDictionary(
            kv => kv.Key.ToString().ToLowerInvariant(),
            kv => (IReadOnlyList<string>)kv.Value.Select(p => p.ToString()).ToList());

        var core = ModuleCatalog.CorePermissions.Select(p => p.ToString()).ToList();

        return new AccessMetadataResponse(modules, permissions, modulePermissions, core);
    }
}
