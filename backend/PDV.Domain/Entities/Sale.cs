using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class Sale : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid? OperatorId { get; set; }
    public User? Operator { get; set; }
    public string OperatorName { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerDocument { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public bool IsInstallment { get; set; }
    public int? InstallmentCount { get; set; }
    public decimal? InstallmentValue { get; set; }
    public decimal Discount { get; set; } = 0;
    public decimal Total { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal FeeRate { get; set; }
    public decimal FeeAmount { get; set; }
    public decimal NetAmount { get; set; }
    public SaleStatus Status { get; set; } = SaleStatus.Active;
    public Guid? CancelledById { get; set; }
    public User? CancelledBy { get; set; }
    public string? CancelledByName { get; set; }
    public DateTime? CancelledAt { get; set; }

    public ICollection<SaleItem> Items { get; set; } = [];
}
