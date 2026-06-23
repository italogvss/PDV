using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Assinatura do Owner (UserId) — fonte do plano e das cobranças. Uma assinatura viva por User
// cobre todas as lojas dele. NÃO é tenant-scoped (sem query filter) — filtrada por UserId.
public class Subscription : BaseEntity
{
    public Guid UserId { get; set; }

    public Guid PlanId { get; set; }
    public Plan Plan { get; set; } = null!;

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Pending;
    public GatewayPaymentMethod Method { get; set; }

    // Cartão = renovável automaticamente; PIX (pagamento único mensal/anual) = não-renovável.
    public bool IsRenewable { get; set; }

    public string Provider { get; set; } = string.Empty;
    public string? GatewaySubscriptionId { get; set; } // subs_... (apenas cartão)
    public string? GatewayCustomerId { get; set; }     // cust_...

    public DateTime? TrialEndsAt { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime? CanceledAt { get; set; }
}
