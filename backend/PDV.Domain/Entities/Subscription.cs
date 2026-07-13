using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Assinatura do Owner (UserId) — fonte do plano e das cobranças. Uma assinatura viva por User
// cobre todas as lojas dele. NÃO é tenant-scoped (sem query filter) — filtrada por UserId.
public class Subscription : BaseEntity
{
    public Guid UserId { get; set; }

    // Plano VIGENTE — o que o usuário está pagando agora e cujos entitlements valem.
    public Guid PlanId { get; set; }
    public Plan Plan { get; set; } = null!;

    // Troca AGENDADA para a virada do ciclo (downgrade, ou encurtamento do ciclo de cobrança).
    // Até a virada valem os entitlements de `PlanId` — o usuário já pagou por eles. No gateway o
    // agendamento vive num subscription schedule (`GatewayScheduleId`); quem promove
    // `PendingPlanId` → `PlanId` é o reconciliador, quando o preço vigente muda.
    public Guid? PendingPlanId { get; set; }

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Pending;
    public GatewayPaymentMethod Method { get; set; }

    // Assinatura paga por cartão renova sozinha; o trial PDV-side não.
    public bool IsRenewable { get; set; }

    public string Provider { get; set; } = string.Empty;
    public string? GatewaySubscriptionId { get; set; } // sub_...
    public string? GatewayCustomerId { get; set; }     // cus_...

    // Agendamento anexado à assinatura no gateway (sub_sched_...). Enquanto existe, o gateway não
    // aceita alterar os itens da assinatura direto — libere-o antes de qualquer upgrade.
    public string? GatewayScheduleId { get; set; }

    // Data do último evento de assinatura APLICADO (event.created do gateway). Descarta reentregas
    // e webhooks fora de ordem: um evento mais velho que este não pode reescrever o estado.
    // Zerado numa reativação — a assinatura no gateway passa a ser outra, com linha do tempo nova.
    public DateTime? GatewaySyncedAt { get; set; }

    // Momento em que a assinatura PAGA passou a valer. Âncora da janela de reembolso — renovações
    // não a movem, uma reativação sim (nova assinatura, nova janela). Nulo = nunca foi paga.
    public DateTime? StartedAt { get; set; }

    public DateTime? TrialEndsAt { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime? CanceledAt { get; set; }

    // Tem direito ao plano enquanto: em trial não expirado; ou ativo/cancelado dentro do período pago
    // (cancelar só interrompe as próximas faturas). Pending, RefundRequested e Expired não dão direito.
    // Um Active com período vencido também não — a renovação falhou e o acesso cai sem depender do job.
    public bool IsEntitledAt(DateTime now) => Status switch
    {
        SubscriptionStatus.Trialing => TrialEndsAt is null || TrialEndsAt > now,
        SubscriptionStatus.Active or SubscriptionStatus.Canceled => CurrentPeriodEnd is null || CurrentPeriodEnd > now,
        _ => false,
    };

    // Momento em que o acesso caiu (ou vai cair). null enquanto a assinatura ainda dá direito ao plano.
    public DateTime? AccessLostAt(DateTime now) =>
        IsEntitledAt(now) ? null : CurrentPeriodEnd ?? TrialEndsAt ?? UpdatedAt;
}
