using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Histórico de cobranças do Owner (UserId). Scoped por UserId, não por tenant.
public class Payment : BaseEntity
{
    public Guid UserId { get; set; }

    public Guid? SubscriptionId { get; set; }
    public Guid? PlanId { get; set; }
    public string Provider { get; set; } = string.Empty;
    // bill_... na cobrança de checkout/renovação; intl_... na parcela recusada (payment_failed).
    public string GatewayChargeId { get; set; } = string.Empty;

    public PaymentKind Kind { get; set; }
    public GatewayPaymentMethod Method { get; set; }
    public int AmountCents { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public string? CouponCode { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? ReceiptUrl { get; set; }

    // Tentativa de cobrança da renovação (data.retryNumber). Só em Status = Failed.
    public int? RetryNumber { get; set; }

    // Cartão usado na cobrança (vem do webhook em data.payerInformation.CARD).
    public string? CardLastFour { get; set; } // últimos 4 dígitos (ex.: "4242")
    public string? CardBrand { get; set; }    // bandeira (ex.: "visa")

    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
}
