namespace PDV.Domain.Entities;

public class Tenant : BaseEntity
{
    // Fim da carência: quando o pipeline de exclusão "strip" deve rodar (hard-delete do que não tem
    // base legal + anonimização). Zerado após o strip.
    public DateTime? ScheduledDeletionAt { get; set; }

    // Âncora de legal-hold: após o strip, o Tenant e os dados fiscais/transacionais (Sale, Expense,
    // SaleItem, EmployeeSalaryLink, Customer/Employee anonimizados) são retidos por 5 anos. Vencido
    // este prazo, o DataPurgeBackgroundService apaga tudo, inclusive a linha do Tenant. Precisa existir
    // porque Sale/Expense/Customer/Employee têm FK CASCADE para Tenant — apagar o Tenant no strip
    // levaria os dados fiscais junto.
    public DateTime? LegalHoldUntil { get; set; }

    public ICollection<UserTenant> UserTenants { get; set; } = [];
    public TenantSettings? Settings { get; set; }
}
