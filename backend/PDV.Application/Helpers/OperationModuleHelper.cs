using System.Text.Json;
using PDV.Domain.Constants;
using PDV.Domain.Enums;

namespace PDV.Application.Helpers;

// Ponte entre o armazenamento (EnabledModulesJson: JSON com nomes PascalCase do enum) e o
// contrato HTTP (strings lowercase: "sales", "inventory", ...).
// Regra central: EnabledModulesJson nulo/vazio = todos os módulos ativos (retrocompatível).
public static class OperationModuleHelper
{
    // Lê os módulos ativos a partir do JSON persistido, como strings lowercase para o frontend.
    public static IReadOnlyList<string> ReadEnabled(string? json)
    {
        var modules = string.IsNullOrWhiteSpace(json)
            ? SegmentModuleDefaults.All
            : Deserialize(json);

        return modules.Select(ToWire).ToList();
    }

    // Serializa uma lista de módulos (enum) para o JSON persistido (nomes PascalCase).
    public static string Serialize(IEnumerable<OperationModule> modules) =>
        JsonSerializer.Serialize(modules.Select(m => m.ToString()));

    // Converte as strings recebidas do frontend (lowercase) em JSON persistido, ignorando
    // valores inválidos e duplicados. Mantém a ordem canônica do enum.
    public static string SerializeFromWire(IEnumerable<string> wireModules)
    {
        var valid = new HashSet<OperationModule>();
        foreach (var s in wireModules)
        {
            if (Enum.TryParse<OperationModule>(s, ignoreCase: true, out var module))
                valid.Add(module);
        }

        var ordered = SegmentModuleDefaults.All.Where(valid.Contains);
        return Serialize(ordered);
    }

    private static OperationModule[] Deserialize(string json)
    {
        var names = JsonSerializer.Deserialize<List<string>>(json) ?? [];
        return names
            .Where(n => Enum.TryParse<OperationModule>(n, ignoreCase: true, out _))
            .Select(n => Enum.Parse<OperationModule>(n, ignoreCase: true))
            .ToArray();
    }

    private static string ToWire(OperationModule module) => module.ToString().ToLowerInvariant();
}
