using System.Text.Json;
using PDV.Domain.Constants;

namespace PDV.Application.Helpers;

// Ponte entre os campos persistidos do PLANO (EntitledModulesJson / LimitsJson) e o
// contrato/lógica de negócio. ATENÇÃO: entitlements do plano têm semântica DIFERENTE do tenant —
// aqui vazio = NENHUMA capability (o plano lista explicitamente o que inclui). Não usar o
// OperationModuleHelper (cuja regra é "vazio = todos", válida só para o tenant).
public static class PlanJson
{
    // Lê as capabilities incluídas no plano como chaves lowercase (contrato HTTP). Unifica
    // módulos + sub-features; filtra pelas chaves conhecidas do EntitlementCatalog. Vazio = nenhuma.
    public static IReadOnlyList<string> ReadEntitlements(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            var keys = JsonSerializer.Deserialize<List<string>>(json) ?? [];
            return keys
                .Select(k => k.Trim().ToLowerInvariant())
                .Where(EntitlementCatalog.IsKnown)
                .Distinct()
                .ToList();
        }
        catch
        {
            return [];
        }
    }

    // Serializa as capabilities do plano para o JSON persistido (chaves lowercase do catálogo).
    public static string SerializeEntitlements(IEnumerable<string> entitlements) =>
        JsonSerializer.Serialize(entitlements.Select(e => e.Trim().ToLowerInvariant()).Distinct());

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
