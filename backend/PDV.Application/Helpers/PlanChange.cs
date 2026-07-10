using PDV.Domain.Constants;
using PDV.Domain.Entities;

namespace PDV.Application.Helpers;

// Classifica uma troca de plano. Existe uma única regra de negócio por trás dela: o usuário nunca
// perde, no meio de um ciclo que já pagou, uma capability ou um limite pelo qual pagou.
//
//   downgrade (o plano-alvo retira algo)  → agendado para a virada do ciclo
//   qualquer outra troca                  → vale imediatamente
//
// Em nenhum dos dois casos há cobrança agora: o gateway não calcula diferença, o valor novo entra
// na próxima renovação.
//
// A classificação deriva dos próprios eixos do plano (entitlements + limites) em vez de um "tier"
// hardcoded — um plano novo entra no catálogo sem tocar nesta regra.
public static class PlanChange
{
    public static bool IsDowngrade(Plan current, Plan target)
    {
        var currentKeys = PlanJson.ReadEntitlements(current.EntitledModulesJson);
        var targetKeys = PlanJson.ReadEntitlements(target.EntitledModulesJson).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Alguma capability que ele tem hoje sumiria.
        if (currentKeys.Any(key => !targetKeys.Contains(key))) return true;

        var currentLimits = PlanJson.ReadLimits(current.LimitsJson);
        var targetLimits = PlanJson.ReadLimits(target.LimitsJson);

        return currentLimits.Any(limit => Shrinks(LimitOf(targetLimits, limit.Key), limit.Value));
    }

    // Limite ausente no plano-alvo = capability não concedida = 0.
    private static int LimitOf(IReadOnlyDictionary<string, int> limits, string key) =>
        limits.TryGetValue(key, out var value) ? value : 0;

    // Ilimitado (-1) é maior que qualquer número — a comparação numérica direta o trataria como o menor.
    private static bool Shrinks(int target, int current)
    {
        if (target == PlanLimits.Unlimited) return false;
        if (current == PlanLimits.Unlimited) return true;
        return target < current;
    }
}
