using PDV.Domain.Entities;

namespace PDV.Domain.Constants;

// Tier estável do plano (Free/Starter/Pro) usado para segmentar avisos. Os planos não têm
// um campo "código"; o tier é derivado do nome ("Starter ...", "Pro ...") ou Free quando não
// há plano efetivo. Valores em minúsculo para casar com Announcement.TargetPlanCode.
public static class PlanTier
{
    public const string Free = "free";
    public const string Starter = "starter";
    public const string Pro = "pro";

    public static string FromPlan(Plan? plan)
    {
        if (plan is null) return Free;
        if (plan.Name.Contains("Pro", StringComparison.OrdinalIgnoreCase)) return Pro;
        if (plan.Name.Contains("Starter", StringComparison.OrdinalIgnoreCase)) return Starter;
        return Free;
    }
}
