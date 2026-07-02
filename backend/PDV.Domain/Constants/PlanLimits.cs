namespace PDV.Domain.Constants;

// Chaves canônicas dos limites numéricos de plano (lógica de negócio). Persistidas no
// `LimitsJson` do Plano. Valor -1 = ilimitado. Modelo definitivo: 4 limites.
public static class PlanLimits
{
    public const string Employees = "employees";
    public const string Stores = "stores";
    public const string SaleHistoryDays = "saleHistoryDays";
    public const string AuditDays = "auditDays";

    public const int Unlimited = -1;
}
