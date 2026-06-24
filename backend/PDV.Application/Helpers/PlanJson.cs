using System.Text.Json;
using PDV.Domain.Enums;

namespace PDV.Application.Helpers;

// Ponte entre os campos persistidos do PLANO (EntitledModulesJson / LimitsJson) e o
// contrato/lógica de negócio. ATENÇÃO: módulos do plano têm semântica DIFERENTE do tenant —
// aqui vazio = NENHUM módulo (o plano lista explicitamente o que inclui). Não usar o
// OperationModuleHelper (cuja regra é "vazio = todos", válida só para o tenant).
public static class PlanJson
{
    // Lê os módulos incluídos no plano como strings lowercase (contrato HTTP). Vazio = nenhum.
    public static IReadOnlyList<string> ReadModules(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            var names = JsonSerializer.Deserialize<List<string>>(json) ?? [];
            return names
                .Where(n => Enum.TryParse<OperationModule>(n, ignoreCase: true, out _))
                .Select(n => Enum.Parse<OperationModule>(n, ignoreCase: true).ToString().ToLowerInvariant())
                .ToList();
        }
        catch
        {
            return [];
        }
    }

    // Serializa os módulos do plano para o JSON persistido (nomes PascalCase do enum).
    public static string SerializeModules(IEnumerable<OperationModule> modules) =>
        JsonSerializer.Serialize(modules.Select(m => m.ToString()));

    public static IReadOnlyDictionary<string, int> ReadLimits(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, int>();
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, int>>(json) ?? new Dictionary<string, int>();
        }
        catch
        {
            return new Dictionary<string, int>();
        }
    }

    public static string SerializeLimits(IReadOnlyDictionary<string, int> limits) =>
        JsonSerializer.Serialize(limits);
}
