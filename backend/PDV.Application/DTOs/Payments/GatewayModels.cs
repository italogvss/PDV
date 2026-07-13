namespace PDV.Application.DTOs.Payments;

// Modelos NEUTROS de gateway (sem tipos do Stripe) — contrato entre a orquestração de negócio e
// qualquer implementação de IPaymentGateway. Valores monetários em centavos, inteiros.

public record CustomerInfo(
    string Email,
    string? Name,
    string? TaxId,
    string? Cellphone,
    IReadOnlyDictionary<string, string>? Metadata = null);

public record GatewayCustomerResult(
    string CustomerId,
    string Email,
    string? Name,
    string? TaxId,
    string? Cellphone);

// PriceExternalId = Plan.ExternalProductId (no Stripe, um `price_...` recorrente).
// ExternalId = nossa Subscription.Id; volta nos eventos como chave de correlação primária.
public record SubscriptionCheckoutRequest(
    string PriceExternalId,
    string CustomerId,
    string ExternalId,
    string? CouponCode,
    string? ReturnUrl,
    string? CompletionUrl,
    IReadOnlyDictionary<string, string> Metadata);

public record HostedCheckoutResult(
    string CheckoutId,
    string Url);

// Upgrade: o preço troca agora e o gateway cobra a diferença proporcional imediatamente.
// CurrentPeriodEnd vem da assinatura já atualizada — a troca de ciclo (mensal→anual) a move.
public record PlanUpgradeResult(
    DateTime CurrentPeriodEnd,
    int AmountDueNowCents);

// Downgrade: a troca é agendada para a virada do ciclo. Nada é cobrado nem creditado agora.
public record PlanDowngradeResult(
    string ScheduleId,
    DateTime EffectiveAt);

// Simulação do upgrade — nada é cobrado. NextChargeAt é o fim do período que a fatura
// proporcional custeia (já com o ciclo do plano novo). `AmountDueNowCents` nulo = o gateway não
// soube simular; a UI cai numa mensagem genérica em vez de mostrar um valor inventado.
public record PlanUpgradePreview(
    int? AmountDueNowCents,
    DateTime? NextChargeAt);

public record RefundResult(
    string RefundId,
    string Status,
    int AmountCents);

// Tipo normalizado de evento de webhook.
//
// Não há `SubscriptionTrialStarted`: o trial é PDV-side e o gateway nunca o conhece.
//
// `SubscriptionUpdated` cobre, com um único reconciliador, o que a especificação chamava de
// `SubscriptionRenewed` + `SubscriptionPlanChanged`: o Stripe manda a assinatura inteira em
// `customer.subscription.updated` (preço vigente, período, agendamento), então aplicar o estado do
// evento é mais simples e mais correto do que adivinhar o que mudou. Ordem de entrega e
// reentregas deixam de importar — ver BillingWebhookService.ReconcileSubscriptionAsync.
public enum PaymentWebhookType
{
    // invoice.paid — dá baixa/cria a fatura com o período que ela custeia.
    CheckoutCompleted,
    // charge.succeeded — só enriquece o histórico (cartão + recibo). Nunca muda assinatura.
    ChargeSucceeded,
    // charge.refunded
    CheckoutRefunded,
    // charge.dispute.created
    CheckoutDisputed,
    // customer.subscription.created
    SubscriptionCompleted,
    // customer.subscription.updated — renovação, ativação, troca de plano, virada de agendamento.
    SubscriptionUpdated,
    // invoice.payment_failed
    SubscriptionPaymentFailed,
    // customer.subscription.deleted
    SubscriptionCancelled,
    Unknown,
}

// Motivo do cancelamento informado pelo gateway (subscription.cancellation_details.reason).
// Um cancelamento involuntário (a cobrança esgotou as tentativas) não ganha o período de
// cortesia do voluntário — ver RF-28.
public static class CancelReasons
{
    public const string PaymentFailed = "payment_failed";
}

// Status da assinatura no gateway (subscription.status do Stripe), repassado cru para o
// reconciliador — a tradução para SubscriptionStatus é regra de negócio, não de transporte.
public static class GatewaySubscriptionStatuses
{
    public const string Active = "active";
    public const string Trialing = "trialing";
    public const string PastDue = "past_due";
    public const string Unpaid = "unpaid";
    public const string Paused = "paused";
    public const string Incomplete = "incomplete";
    public const string IncompleteExpired = "incomplete_expired";
    public const string Canceled = "canceled";
}

// Evento de webhook já autenticado e traduzido para o domínio. Todas as datas vêm do evento —
// nenhum handler lê o relógio local para calcular período (CG-15 / RF-26).
public record PaymentWebhookEvent(
    PaymentWebhookType Type,
    string Provider,
    string RawEventType,
    // Id estável do evento no gateway (`evt_...`) — chave de idempotência (CG-11).
    string EventId,
    // Quando o gateway produziu o evento. Âncora de tudo: um webhook atrasado ou reentregue não
    // pode estender o ciclo a partir de "agora".
    DateTime EventCreatedAt,

    // ---- Correlação (CG-16), do identificador mais específico ao mais genérico ----------------
    IReadOnlyDictionary<string, string> Metadata,
    // checkout.session.client_reference_id = nossa Subscription.Id.
    string? ExternalId = null,
    // Id da assinatura no gateway (`sub_...`).
    string? SubscriptionId = null,
    // Id do cliente no gateway (`cus_...`).
    string? CustomerId = null,

    // ---- Cobrança -----------------------------------------------------------------------------
    // Chave de idempotência do Payment. Numa fatura paga é o PaymentIntent (`pi_...`), porque é o
    // único identificador que o evento de estorno também carrega. Numa fatura recusada é a própria
    // fatura (`in_...`), que é estável entre as retentativas da mesma parcela (RF-27 / R4).
    string? ChargeId = null,
    string? InvoiceId = null,
    int? AmountCents = null,
    DateTime? PaidAt = null,
    string? ReceiptUrl = null,
    string? CardLastFour = null,
    string? CardBrand = null,
    // Período que ESTA fatura custeia (invoice.lines[].period) — não o da assinatura.
    DateTime? PeriodStart = null,
    DateTime? PeriodEnd = null,
    // invoice.attempt_count na cobrança recusada.
    int? RetryNumber = null,
    // Estorno/disputa que reverte a cobrança inteira. Um estorno parcial não derruba o acesso de
    // quem está em dia (RF-42).
    bool ReversedInFull = false,

    // ---- Assinatura (eventos customer.subscription.*) -----------------------------------------
    // Status cru do gateway — ver GatewaySubscriptionStatuses.
    string? SubscriptionStatus = null,
    // Preço vigente na assinatura (`price_...`) → resolve o Plan local. É daqui que sai a
    // reconciliação de plano, inclusive de trocas feitas fora do app.
    string? CurrentPriceId = null,
    DateTime? CurrentPeriodEnd = null,
    // Agendamento anexado à assinatura (`sub_sched_...`). null = nenhum (ou recém-liberado).
    string? ScheduleId = null,
    DateTime? CanceledAt = null,
    // Ver CancelReasons.
    string? CancelledDueTo = null);
