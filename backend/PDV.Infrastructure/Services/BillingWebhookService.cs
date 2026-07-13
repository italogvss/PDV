using Microsoft.Extensions.Logging;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

// Aplica um evento de webhook (já autenticado e normalizado) ao estado de assinatura/pagamento.
// Resolve a assinatura pelos ids do gateway — sem tenant/user context.
//
// Duas regras governam tudo aqui:
//
//   1. **Toda data vem do evento.** Um webhook atrasado, reentregue ou retentado horas depois não
//      pode estender um ciclo a partir de `DateTime.UtcNow` (RF-26 / CG-15). `UtcNow` só aparece em
//      `UpdatedAt`, que é carimbo de escrita, não regra de negócio.
//
//   2. **Eventos de assinatura são reconciliação, não delta.** O gateway manda o objeto inteiro
//      (status, preço vigente, período, agendamento); aplicamos esse estado em vez de adivinhar o
//      que mudou. Com isso a ordem de entrega deixa de importar (CG-14), a reentrega vira no-op, a
//      renovação e a promoção de um downgrade agendado passam pelo mesmo caminho — e uma troca de
//      plano feita fora do app é reconciliada de graça.
public class BillingWebhookService(IBillingWebhookRepository repo, ILogger<BillingWebhookService> logger) : IBillingWebhookService
{
    public async Task ProcessAsync(PaymentWebhookEvent evt)
    {
        // A cobrança primeiro: um evento de estorno/disputa não traz assinatura, e a linha de
        // Payment é o que leva até ela.
        var payment = await ResolvePaymentAsync(evt);
        var sub = await ResolveSubscriptionAsync(evt, payment);

        logger.LogInformation(
            "Evento {EventType} ({EventId}): assinatura {SubscriptionId} (status {Status}), cobrança {PaymentId}",
            evt.RawEventType, evt.EventId, sub?.Id, sub?.Status, payment?.Id);

        switch (evt.Type)
        {
            case PaymentWebhookType.CheckoutCompleted:
                await ApplyInvoicePaidAsync(sub, payment, evt);
                break;

            case PaymentWebhookType.ChargeSucceeded:
                await ApplyChargeSucceededAsync(sub, payment, evt);
                break;

            case PaymentWebhookType.SubscriptionPaymentFailed:
                await ApplyInvoiceFailedAsync(sub, payment, evt);
                break;

            case PaymentWebhookType.SubscriptionCompleted:
            case PaymentWebhookType.SubscriptionUpdated:
                await ReconcileSubscriptionAsync(sub, evt);
                break;

            case PaymentWebhookType.SubscriptionCancelled:
                ApplyCancelled(sub, evt);
                break;

            case PaymentWebhookType.CheckoutRefunded:
            case PaymentWebhookType.CheckoutDisputed:
                ApplyReversed(sub, payment, evt);
                break;

            case PaymentWebhookType.Unknown:
                logger.LogInformation("Evento {EventType} não é tratado — registrado e ignorado.", evt.RawEventType);
                break;
        }

        // Registra o evento como processado na MESMA transação do estado aplicado (idempotência
        // atômica: se o SaveChanges falhar, nada é persistido e o gateway pode reenviar com
        // segurança) — CG-12.
        await repo.StageEventAsync(new WebhookEvent
        {
            Provider = evt.Provider,
            EventId = evt.EventId,
            EventType = evt.RawEventType,
            ProcessedAt = DateTime.UtcNow,
            Status = "Processed",
        });

        await repo.SaveChangesAsync();
    }

    // -----------------------------------------------------------------------
    // Resolução (CG-16 / CG-17)
    // -----------------------------------------------------------------------

    // Cada usuário tem no máximo UMA assinatura (índice único em Subscription.UserId), então basta
    // chegar ao usuário certo por qualquer identificador do evento — do mais específico ao mais
    // genérico. Eventos de cobrança (charge.*) não trazem metadata: caem no cliente ou na própria
    // linha de Payment já registrada.
    private async Task<Subscription?> ResolveSubscriptionAsync(PaymentWebhookEvent evt, Payment? payment)
    {
        if (evt.Metadata.TryGetValue("subscriptionId", out var sid) && Guid.TryParse(sid, out var metaSubId)
            && await repo.GetSubscriptionByIdAsync(metaSubId) is { } byMeta)
            return byMeta;

        if (Guid.TryParse(evt.ExternalId, out var externalSubId)
            && await repo.GetSubscriptionByIdAsync(externalSubId) is { } byExternal)
            return byExternal;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)
            && await repo.GetSubscriptionByGatewayIdAsync(evt.SubscriptionId) is { } byGateway)
            return byGateway;

        if (evt.Metadata.TryGetValue("userId", out var uid) && Guid.TryParse(uid, out var userId)
            && await repo.GetSubscriptionByUserIdAsync(userId) is { } byUser)
            return byUser;

        if (!string.IsNullOrEmpty(evt.CustomerId)
            && await repo.GetSubscriptionByGatewayCustomerIdAsync(evt.Provider, evt.CustomerId) is { } byCustomer)
            return byCustomer;

        // Última cartada, para a disputa: ela só carrega o PaymentIntent.
        return payment?.SubscriptionId is Guid paymentSubId
            ? await repo.GetSubscriptionByIdAsync(paymentSubId)
            : null;
    }

    // Estritamente pelo id da cobrança (CG-17). Sem fallback por "pendente mais recente": numa
    // renovação não há Payment pré-criado, e marcar um pendente avulso corromperia o histórico.
    private async Task<Payment?> ResolvePaymentAsync(PaymentWebhookEvent evt) =>
        string.IsNullOrEmpty(evt.ChargeId)
            ? null
            : await repo.GetPaymentByGatewayChargeIdAsync(evt.ChargeId);

    // -----------------------------------------------------------------------
    // Assinatura — reconciliação
    // -----------------------------------------------------------------------

    private async Task ReconcileSubscriptionAsync(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null)
        {
            logger.LogWarning("Evento {EventType} não resolveu assinatura (gateway {SubscriptionId}, cliente {CustomerId}).",
                evt.RawEventType, evt.SubscriptionId, evt.CustomerId);
            return;
        }

        if (IsStale(sub, evt)) return;
        sub.GatewaySyncedAt = evt.EventCreatedAt;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)) sub.GatewaySubscriptionId = evt.SubscriptionId;

        ApplySchedule(sub, evt);
        await ReconcilePlanAsync(sub, evt.CurrentPriceId);

        switch (evt.SubscriptionStatus)
        {
            case GatewaySubscriptionStatuses.Active:
            case GatewaySubscriptionStatuses.Trialing:
                Activate(sub, evt);
                break;

            // RF-27: a falha de cobrança não muda o estado da assinatura. O acesso já caiu sozinho,
            // porque o gateway não estendeu `current_period_end` — e a assinatura pode se recuperar
            // numa retentativa bem-sucedida.
            case GatewaySubscriptionStatuses.PastDue:
            case GatewaySubscriptionStatuses.Unpaid:
            case GatewaySubscriptionStatuses.Paused:
                break;

            // O primeiro pagamento ainda não confirmou (3DS, por exemplo): segue Pending.
            case GatewaySubscriptionStatuses.Incomplete:
                break;

            // O primeiro pagamento nunca confirmou e a janela fechou.
            case GatewaySubscriptionStatuses.IncompleteExpired:
                sub.Status = SubscriptionStatus.Expired;
                sub.CurrentPeriodEnd = evt.EventCreatedAt;
                break;

            case GatewaySubscriptionStatuses.Canceled:
                ApplyCancelledCore(sub, evt);
                break;

            default:
                logger.LogWarning("Status {Status} desconhecido na assinatura {SubscriptionId}.", evt.SubscriptionStatus, sub.Id);
                break;
        }

        sub.UpdatedAt = DateTime.UtcNow;
    }

    // Reentregas e entregas fora de ordem: um evento mais velho que o último aplicado não pode
    // reescrever o estado. É o que faz R7 (duplicado) e R8 (atrasado) serem no-ops seguros.
    private bool IsStale(Subscription sub, PaymentWebhookEvent evt)
    {
        if (sub.GatewaySyncedAt is not DateTime synced || evt.EventCreatedAt >= synced) return false;

        logger.LogInformation(
            "Evento {EventType} ({EventId}) é anterior ao último estado aplicado ({SyncedAt}) — ignorado.",
            evt.RawEventType, evt.EventId, synced);
        return true;
    }

    // O agendamento é sempre o que o gateway diz. Ele sumir (liberado por nós, liberado no painel,
    // ou cancelado junto com a assinatura) significa que não há mais troca pendente.
    private void ApplySchedule(Subscription sub, PaymentWebhookEvent evt)
    {
        sub.GatewayScheduleId = evt.ScheduleId;

        if (evt.ScheduleId is not null || sub.PendingPlanId is null) return;

        logger.LogInformation("Assinatura {SubscriptionId}: agendamento removido no gateway — troca pendente descartada.", sub.Id);
        sub.PendingPlanId = null;
    }

    // O preço vigente no gateway é a verdade sobre qual plano está sendo cobrado. Reconciliar a
    // partir dele resolve três coisas de uma vez: a virada de um downgrade agendado (P9), uma troca
    // feita direto no painel, e a promoção acontecer ANTES de qualquer cálculo de período (R2) —
    // porque o período vem do mesmo evento, não do ciclo do plano.
    private async Task ReconcilePlanAsync(Subscription sub, string? priceId)
    {
        if (string.IsNullOrEmpty(priceId)) return;

        var plan = await repo.GetPlanByExternalProductIdAsync(priceId);
        if (plan is null)
        {
            logger.LogWarning(
                "Preço {PriceId} não corresponde a nenhum plano do catálogo; assinatura {SubscriptionId} mantém o plano atual.",
                priceId, sub.Id);
            return;
        }

        if (sub.PlanId != plan.Id)
        {
            logger.LogInformation("Assinatura {SubscriptionId}: plano vigente agora é {PlanName}.", sub.Id, plan.Name);
            sub.PlanId = plan.Id;
            sub.Plan = plan;
        }

        // A troca agendada se consumou no instante em que o preço vigente virou o dela.
        if (sub.PendingPlanId == plan.Id) sub.PendingPlanId = null;
    }

    private static void Activate(Subscription sub, PaymentWebhookEvent evt)
    {
        sub.Status = SubscriptionStatus.Active;
        // Âncora da janela de reembolso. StartCheckoutAsync zera StartedAt, então uma reativação
        // passa por aqui e abre uma janela nova (X6); uma renovação não passa e preserva a
        // original (RF-25 / X5).
        sub.StartedAt ??= evt.EventCreatedAt;
        sub.TrialEndsAt = null;   // assinatura paga não carrega data de teste
        sub.CanceledAt = null;

        if (evt.CurrentPeriodEnd is DateTime periodEnd) sub.CurrentPeriodEnd = periodEnd;
    }

    // -----------------------------------------------------------------------
    // Cancelamento
    // -----------------------------------------------------------------------

    // customer.subscription.deleted — idempotente com o cancelamento manual, que já pode ter
    // aplicado o estado. NÃO toca no Payment: a fatura do período está paga, e marcá-la como
    // cancelada reescreveria uma linha legítima do histórico (RF-44).
    private void ApplyCancelled(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null) return;
        if (IsStale(sub, evt)) return;

        sub.GatewaySyncedAt = evt.EventCreatedAt;
        ApplyCancelledCore(sub, evt);
        sub.UpdatedAt = DateTime.UtcNow;
    }

    private static void ApplyCancelledCore(Subscription sub, PaymentWebhookEvent evt)
    {
        sub.CanceledAt ??= evt.CanceledAt ?? evt.EventCreatedAt;
        // O agendamento morre com a assinatura (P10).
        sub.PendingPlanId = null;
        sub.GatewayScheduleId = null;

        // Involuntário (a cobrança esgotou as tentativas): não há período pago a honrar (RF-28).
        if (evt.CancelledDueTo == CancelReasons.PaymentFailed)
        {
            sub.Status = SubscriptionStatus.Expired;
            sub.CurrentPeriodEnd = evt.EventCreatedAt;
            return;
        }

        // Nunca chegou a valer (checkout abandonado, cartão recusado): também não há período pago.
        // Sem isto um `Canceled` com `CurrentPeriodEnd` nulo daria acesso para sempre (RF-10).
        if (sub.StartedAt is null)
        {
            sub.Status = SubscriptionStatus.Expired;
            sub.CurrentPeriodEnd = evt.EventCreatedAt;
            return;
        }

        // Cancelamento dentro da janela de reembolso: o estado final é ditado pelo evento de
        // estorno. Este aqui é só o eco do cancelamento no gateway (X9).
        if (sub.Status == SubscriptionStatus.RefundRequested) return;

        // Voluntário: acesso preservado até o fim do período já pago.
        sub.Status = SubscriptionStatus.Canceled;
        sub.CurrentPeriodEnd ??= evt.EventCreatedAt;
    }

    // -----------------------------------------------------------------------
    // Estorno e disputa
    // -----------------------------------------------------------------------

    private void ApplyReversed(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (payment is not null)
        {
            payment.Status = evt.Type is PaymentWebhookType.CheckoutRefunded
                ? PaymentStatus.Refunded
                : PaymentStatus.Disputed;
            payment.UpdatedAt = DateTime.UtcNow;
        }

        if (sub is null || !RevokesAccess(sub, payment, evt)) return;

        sub.Status = SubscriptionStatus.Expired;
        sub.CurrentPeriodEnd = evt.EventCreatedAt;
        sub.PendingPlanId = null;
        sub.UpdatedAt = DateTime.UtcNow;
    }

    // Estornar uma cobrança antiga de quem hoje tem assinatura válida não pode derrubar o acesso
    // (X8). Derruba quando a assinatura aguarda o estorno, quando a cobrança revertida por inteiro
    // é a que custeia o período corrente, ou quando não dá para saber qual foi (chargeback de uma
    // cobrança que não está no histórico → conservador).
    private static bool RevokesAccess(Subscription sub, Payment? payment, PaymentWebhookEvent evt) =>
        sub.Status == SubscriptionStatus.RefundRequested
        || payment is null
        || (evt.ReversedInFull && (payment.PeriodEnd is null || payment.PeriodEnd > evt.EventCreatedAt));

    // -----------------------------------------------------------------------
    // Cobranças
    // -----------------------------------------------------------------------

    // invoice.paid — o único evento que registra dinheiro que entrou. Cria a linha quando ela ainda
    // não existe (renovação: não há Payment pré-criado) ou completa a que charge.succeeded abriu.
    private async Task ApplyInvoicePaidAsync(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (string.IsNullOrEmpty(evt.ChargeId)) return;

        if (payment is null)
        {
            if (sub is null)
            {
                // CG-18: entrou dinheiro que não foi registrado. Nunca deve acontecer.
                logger.LogWarning(
                    "Fatura {InvoiceId} paga não pôde ser registrada: assinatura não resolvida (cliente {CustomerId}).",
                    evt.InvoiceId, evt.CustomerId);
                return;
            }

            payment = NewPayment(sub, evt);
            await repo.AddPaymentAsync(payment);
        }

        payment.Status = PaymentStatus.Paid;
        payment.PaidAt = evt.PaidAt ?? evt.EventCreatedAt;
        payment.GatewayInvoiceId = evt.InvoiceId;
        // O período que ESTA fatura custeia vem das linhas dela, não da assinatura: o evento de
        // pagamento pode chegar antes do de renovação, e ler `sub.CurrentPeriodEnd` aqui gravaria o
        // período anterior no histórico.
        payment.PeriodStart = evt.PeriodStart;
        payment.PeriodEnd = evt.PeriodEnd;

        if (evt.AmountCents is int amount) payment.AmountCents = amount;
        if (!string.IsNullOrEmpty(evt.ReceiptUrl)) payment.ReceiptUrl = evt.ReceiptUrl;

        payment.UpdatedAt = DateTime.UtcNow;
    }

    // charge.succeeded — só o cartão. Cria a linha se chegar antes de invoice.paid, para que a
    // ordem de entrega dos dois não decida se o histórico mostra o cartão usado (CG-14).
    private async Task ApplyChargeSucceededAsync(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (string.IsNullOrEmpty(evt.ChargeId)) return;

        if (payment is null)
        {
            // Cobrança que não pertence a nenhuma assinatura nossa — não é do nosso histórico.
            if (sub is null) return;

            payment = NewPayment(sub, evt);
            await repo.AddPaymentAsync(payment);
        }

        if (!string.IsNullOrEmpty(evt.CardLastFour)) payment.CardLastFour = evt.CardLastFour;
        if (!string.IsNullOrEmpty(evt.CardBrand)) payment.CardBrand = evt.CardBrand;
        // A URL da fatura hospedada (invoice.paid) é melhor que a do recibo da cobrança — não a
        // sobrescreve.
        payment.ReceiptUrl ??= evt.ReceiptUrl;

        payment.UpdatedAt = DateTime.UtcNow;
    }

    // invoice.payment_failed — a cobrança da renovação foi recusada e o gateway vai retentar
    // conforme a própria política. Não mexe no Status da assinatura (RF-27): o acesso já está
    // barrado porque o período venceu. Registra a falha para o usuário saber que o cartão falhou.
    private async Task ApplyInvoiceFailedAsync(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (sub is null || string.IsNullOrEmpty(evt.ChargeId)) return;

        logger.LogWarning(
            "Cobrança recusada na assinatura {SubscriptionId}: fatura {InvoiceId}, tentativa {RetryNumber}",
            sub.Id, evt.InvoiceId, evt.RetryNumber);

        // Retentativas da mesma fatura reusam o id dela — só avança o contador, sem linha nova (R4).
        if (payment is not null)
        {
            payment.Status = PaymentStatus.Failed;
            payment.RetryNumber = evt.RetryNumber;
            payment.UpdatedAt = DateTime.UtcNow;
            return;
        }

        var created = NewPayment(sub, evt);
        created.Status = PaymentStatus.Failed;
        created.RetryNumber = evt.RetryNumber;
        await repo.AddPaymentAsync(created);
    }

    private static Payment NewPayment(Subscription sub, PaymentWebhookEvent evt) => new()
    {
        UserId = sub.UserId,
        SubscriptionId = sub.Id,
        PlanId = sub.PlanId,
        Provider = evt.Provider,
        GatewayChargeId = evt.ChargeId!,
        GatewayInvoiceId = evt.InvoiceId,
        Kind = PaymentKind.CardSubscription,
        Method = GatewayPaymentMethod.Card,
        AmountCents = evt.AmountCents ?? sub.Plan?.PriceCents ?? 0,
        Status = PaymentStatus.Pending,
        CouponCode = evt.Metadata.GetValueOrDefault("couponCode"),
        CardLastFour = evt.CardLastFour,
        CardBrand = evt.CardBrand,
    };
}
