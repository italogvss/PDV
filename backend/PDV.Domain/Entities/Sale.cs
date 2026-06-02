using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class Sale : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid OperatorId { get; set; }
    public User Operator { get; set; } = null!;
    public string? CustomerName { get; set; }
    public string? CustomerDocument { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public bool IsInstallment { get; set; }
    public int? InstallmentCount { get; set; }
    public decimal? InstallmentValue { get; set; }
    public decimal Total { get; set; }
    public decimal AmountPaid { get; set; }
    public SaleStatus Status { get; set; } = SaleStatus.Active;
    public Guid? CancelledById { get; set; }
    public User? CancelledBy { get; set; }
    public DateTime? CancelledAt { get; set; }

    public ICollection<SaleItem> Items { get; set; } = [];
}
