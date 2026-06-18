namespace PDV.Domain.Entities;

// Catálogo de planos pagos. Entidade GLOBAL (sem TenantId/UserId, sem query filter) —
// compartilhada entre todos os tenants. Semeada pelo PlanSeeder a partir de PlanSeedData.
public class Plan : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Valores em centavos.
    public int PriceMonthlyCents { get; set; }
    public int? PriceAnnualCents { get; set; }

    // Produto correspondente no gateway (ciclo MONTHLY — usado na assinatura por cartão).
    public string ExternalProductId { get; set; } = string.Empty;
    public int? TrialDays { get; set; }

    // Lógica de negócio do plano (não vive no gateway).
    // ModulesJson: lista de OperationModule (nomes PascalCase). LimitsJson: dicionário chave→int.
    public string ModulesJson { get; set; } = "[]";
    public string LimitsJson { get; set; } = "{}";

    public int DisplayOrder { get; set; }
    public bool SupportsCard { get; set; } = true;
    public bool SupportsPix { get; set; } = true;
}
