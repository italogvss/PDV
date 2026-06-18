using System.Text.Json;

namespace PDV.Application.Helpers;

// Ponte entre o LimitsJson persistido (dicionário chave→int) e o contrato/lógica de negócio.
public static class PlanJson
{
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
