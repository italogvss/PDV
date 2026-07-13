namespace PDV.Domain.Enums;

// Ciclo de cobrança do plano. A ordem dos membros é significativa: um ciclo mais curto vem antes,
// e `PlanChange` usa essa ordem para saber quando uma troca encurta o compromisso já pago.
public enum BillingPeriod
{
    Monthly,
    Annual,
}
