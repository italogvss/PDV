namespace PDV.Domain.Entities;

public class Expense : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public bool IsRecurring { get; set; }
    public DateTime DueDate { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidAt { get; set; }
}
