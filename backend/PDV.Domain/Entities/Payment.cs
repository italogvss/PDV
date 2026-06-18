using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Histórico de cobranças do Owner (UserId). Scoped por UserId, não por tenant.
public class Payment : BaseEntity
{
    public Guid UserId { get; set; }

    public Guid? SubscriptionId { get; set; }
    public Guid? PlanId { get; set; }

    // Apenas para contextualizar checkout avulso de uma loja específica (não é o escopo de isolamento).
    public Guid? TenantId { get; set; }

    public string Provider { get; set; } = string.Empty;
    public string GatewayChargeId { get; set; } = string.Empty; // bill_... / pix_char_...

    public PaymentKind Kind { get; set; }
    public GatewayPaymentMethod Method { get; set; }
    public int AmountCents { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public string? CouponCode { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? ReceiptUrl { get; set; }

    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
}
