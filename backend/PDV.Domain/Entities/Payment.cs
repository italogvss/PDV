using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Histórico de cobranças do Owner (UserId). Scoped por UserId, não por tenant.
public class Payment : BaseEntity
{
    public Guid UserId { get; set; }

    public Guid? SubscriptionId { get; set; }
    public Guid? PlanId { get; set; }
    public string Provider { get; set; } = string.Empty;

    // Chave de idempotência da cobrança, e a única coisa que amarra os eventos entre si:
    //
    //   cobrança paga     → `pi_...` (PaymentIntent). É o único id que o evento de ESTORNO também
    //                       carrega — a fatura não aparece nele.
    //   cobrança recusada → `in_...` (fatura). Estável entre as retentativas da mesma parcela, que
    //                       só avançam o RetryNumber em vez de criar uma linha nova.
    //
    // Uma fatura quitada sem PaymentIntent (ex.: cupom de 100%) cai no `in_...` e não é estornável.
    public string GatewayChargeId { get; set; } = string.Empty;

    // Fatura que originou a cobrança (in_...) — sempre preenchida. Rastreabilidade e recibo.
    public string? GatewayInvoiceId { get; set; }

    public PaymentKind Kind { get; set; }
    public GatewayPaymentMethod Method { get; set; }
    public int AmountCents { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public string? CouponCode { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? ReceiptUrl { get; set; }

    // Tentativa da cobrança recusada (invoice.attempt_count). Só em Status = Failed.
    public int? RetryNumber { get; set; }

    // Cartão usado na cobrança (vem do evento charge.succeeded).
    public string? CardLastFour { get; set; } // últimos 4 dígitos (ex.: "4242")
    public string? CardBrand { get; set; }    // bandeira (ex.: "visa")

    // Período que ESTA cobrança custeia, derivado do evento. É o que decide se um estorno derruba
    // o acesso: estornar uma fatura já vencida não afeta quem está em dia (RF-42).
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
}
