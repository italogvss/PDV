namespace PDV.Domain.Constants;

// Chaves canônicas dos limites numéricos de plano (lógica de negócio). Persistidas no
// `LimitsJson` do Plano e no Free default. Valor -1 = ilimitado.
public static class PlanLimits
{
    public const string MaxEmployees = "maxEmployees";
    public const string MaxProducts = "maxProducts";
    public const string MaxStorageMb = "maxStorageMb";

    public const int Unlimited = -1;
}
