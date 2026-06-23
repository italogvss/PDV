using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Catálogo de planos pagos. Entidade GLOBAL (sem TenantId/UserId, sem query filter) —
// compartilhada entre todos os tenants. Semeada pelo PlanSeeder a partir de PlanSeedData.
public class Plan : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Valor em centavos (preço para o ciclo definido em BillingPeriod).
    public int PriceCents { get; set; }

    // Produto correspondente no gateway. O ciclo (mensal/anual) é definido por BillingPeriod.
    public string ExternalProductId { get; set; } = string.Empty;
    public int? TrialDays { get; set; }

    // Ciclo de cobrança do produto no gateway — base para calcular o fim do período no cartão.
    public BillingPeriod BillingPeriod { get; set; } = BillingPeriod.Monthly;

    // Lógica de negócio do plano (não vive no gateway).
    // ModulesJson: lista de OperationModule (nomes PascalCase). LimitsJson: dicionário chave→int.
    public string ModulesJson { get; set; } = "[]";
    public string LimitsJson { get; set; } = "{}";

    public int DisplayOrder { get; set; }
    public bool SupportsCard { get; set; } = true;
    public bool SupportsPix { get; set; } = true;
}
