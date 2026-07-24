using PDV.Domain.Entities;

namespace PDV.Domain.Constants;

// Tier estável do plano, usado para segmentar avisos (Announcement.TargetPlanCode). Os planos não
// têm um campo "código": o tier é o prefixo do Slug antes do primeiro hífen ("essencial-mensal" →
// "essencial"), então plano novo não exige mexer aqui e renomear o plano não quebra a segmentação.
//
// Derivar do Slug (e não do Name) foi o que corrigiu o bug em que "Plano Essencial" caía no mesmo
// balde de quem não tem assinatura nenhuma.
public static class PlanTier
{
    // Sem assinatura válida — alvo próprio (trial expirado, cancelado, inadimplente), separado de
    // qualquer plano pago. É o que permite campanha de reativação sem atingir quem está pagando.
    public const string None = "sem-assinatura";

    // Tiers válidos = prefixos dos slugs semeados + "sem-assinatura". Fonte única da validação do
    // TargetPlanCode no admin e do espelho de chaves no frontend.
    public static readonly IReadOnlyList<string> All =
    [
        .. PlanSeedData.Plans.Select(p => Prefix(p.Slug)).Distinct(StringComparer.OrdinalIgnoreCase),
        None,
    ];

    // `plan == null` é o ÚNICO caso de "sem assinatura". Plano com slug desconhecido devolve o
    // próprio prefixo: não casa com alvo nenhum (só com "todos os planos"), mas nunca cai
    // indevidamente no balde de reativação.
    public static string FromPlan(Plan? plan) => plan is null ? None : Prefix(plan.Slug);

    public static bool IsValid(string code) =>
        All.Contains(code, StringComparer.OrdinalIgnoreCase);

    private static string Prefix(string slug)
    {
        var separator = slug.IndexOf('-');
        return (separator < 0 ? slug : slug[..separator]).ToLowerInvariant();
    }
}
