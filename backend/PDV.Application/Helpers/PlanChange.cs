using PDV.Domain.Constants;
using PDV.Domain.Entities;

namespace PDV.Application.Helpers;

// Classifica uma troca de plano em "vale agora" ou "vale na virada do ciclo".
//
// Uma única regra de negócio governa a classificação: **o usuário nunca perde, no meio de um ciclo
// que já pagou, algo pelo qual pagou.** Duas coisas podem ser perdidas:
//
//   1. capabilities e limites — o plano-alvo retira um entitlement ou encolhe um limite;
//   2. tempo de serviço já comprado — o plano-alvo tem um ciclo mais curto (anual → mensal), então
//      trocar agora jogaria fora os meses restantes do ano já pago.
//
// Em qualquer dos dois casos a troca é AGENDADA para a virada. Nas demais (nada é retirado e o
// ciclo não encurta) ela vale imediatamente, e o gateway cobra a diferença proporcional na hora.
//
// A classificação deriva dos eixos do próprio plano — nunca de um "tier" hardcoded. Um plano novo
// entra no catálogo sem tocar nesta regra.
public static class PlanChange
{
    // A troca precisa esperar a virada do ciclo?
    public static bool IsScheduled(Plan current, Plan target) =>
        RemovesEntitlements(current, target)
        || ShrinksLimits(current, target)
        || ShortensBillingCycle(current, target);

    // Só a perda de capabilities/limites — é isto que o diálogo de confirmação lista para o usuário.
    // Uma troca agendada apenas por encurtar o ciclo não tira recurso nenhum.
    public static bool RemovesCapabilities(Plan current, Plan target) =>
        RemovesEntitlements(current, target) || ShrinksLimits(current, target);

    private static bool RemovesEntitlements(Plan current, Plan target)
    {
        var currentKeys = PlanJson.ReadEntitlements(current.EntitledModulesJson);
        var targetKeys = PlanJson.ReadEntitlements(target.EntitledModulesJson).ToHashSet(StringComparer.OrdinalIgnoreCase);

        return currentKeys.Any(key => !targetKeys.Contains(key));
    }

    private static bool ShrinksLimits(Plan current, Plan target)
    {
        var currentLimits = PlanJson.ReadLimits(current.LimitsJson);
        var targetLimits = PlanJson.ReadLimits(target.LimitsJson);

        return currentLimits.Any(limit => Shrinks(LimitOf(targetLimits, limit.Key), limit.Value));
    }

    // Anual → mensal encurta; mensal → anual não. Comparar os preços não serviria: R$ 299,99/ano é
    // "maior" que R$ 49,99/mês em valor absoluto e menor em valor por mês.
    private static bool ShortensBillingCycle(Plan current, Plan target) =>
        target.BillingPeriod < current.BillingPeriod;

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
