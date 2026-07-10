using Microsoft.Extensions.Logging;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

// Aplica um evento de webhook (já verificado e normalizado) ao estado de assinatura/pagamento.
// Resolve a assinatura pelos ids do gateway — sem tenant/user context.
public class BillingWebhookService(IBillingWebhookRepository repo, ILogger<BillingWebhookService> logger) : IBillingWebhookService
{
    public async Task ProcessAsync(PaymentWebhookEvent evt)
    {
        var sub = await ResolveSubscriptionAsync(evt);
        var payment = await ResolvePaymentAsync(evt);

        logger.LogInformation(
            "Evento {EventType}: assinatura {SubscriptionId} (status {Status}), cobrança {PaymentId}",
            evt.RawEventType, sub?.Id, sub?.Status, payment?.Id);

        switch (evt.Type)
        {
            // Baixa de pagamento — o lifecycle da assinatura vem dos eventos subscription.*.
            case PaymentWebhookType.CheckoutCompleted:
                await ApplyCheckoutCompletedAsync(sub, payment, evt);
                break;

            case PaymentWebhookType.SubscriptionCompleted:
                ApplyActivated(sub, evt);
                break;

            case PaymentWebhookType.SubscriptionRenewed:
                await ApplyRenewedAsync(sub, evt);
                break;

            case PaymentWebhookType.SubscriptionPaymentFailed:
                await ApplyPaymentFailedAsync(sub, evt);
                break;

            case PaymentWebhookType.SubscriptionCancelled:
                ApplyCancelled(sub, evt);
                break;

            case PaymentWebhookType.CheckoutRefunded:
            case PaymentWebhookType.CheckoutDisputed:
                ApplyReversed(sub, payment, evt);
                break;
        }

        // Registra o evento como processado na MESMA transação do estado aplicado (idempotência atômica:
        // se o SaveChanges falhar, nada é persistido e o gateway pode reenviar com segurança).
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

    // Cada usuário tem no máximo UMA assinatura (índice único em Subscription.UserId), então basta
    // chegar ao usuário certo por qualquer identificador do evento — do mais específico ao mais
    // genérico. Renovações não trazem externalId nem metadata; caem no cust_.
    private async Task<Subscription?> ResolveSubscriptionAsync(PaymentWebhookEvent evt)
    {
        if (evt.Metadata.TryGetValue("subscriptionId", out var sid) && Guid.TryParse(sid, out var metaSubId)
            && await repo.GetSubscriptionByIdAsync(metaSubId) is { } byMeta)
            return byMeta;

        // ExternalId = nossa Subscription.Id — chave primária para checkout.*.
        if (Guid.TryParse(evt.ExternalId, out var externalSubId)
            && await repo.GetSubscriptionByIdAsync(externalSubId) is { } byExternal)
            return byExternal;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)
            && await repo.GetSubscriptionByGatewayIdAsync(evt.SubscriptionId) is { } byGateway)
            return byGateway;

        if (evt.Metadata.TryGetValue("userId", out var uid) && Guid.TryParse(uid, out var userId)
            && await repo.GetSubscriptionByUserIdAsync(userId) is { } byUser)
            return byUser;

        return string.IsNullOrEmpty(evt.CustomerId)
            ? null
            : await repo.GetSubscriptionByGatewayCustomerIdAsync(evt.Provider, evt.CustomerId);
    }

    // Resolve o Payment estritamente pelo id da cobrança no gateway (bill_). Sem fallback por
    // "pendente mais recente": numa renovação não há Payment pré-criado e CompleteChargeAsync deve
    // criar um novo — não marcar por engano um pendente avulso de um checkout anterior.
    private async Task<Payment?> ResolvePaymentAsync(PaymentWebhookEvent evt) =>
        string.IsNullOrEmpty(evt.ChargeId)
            ? null
            : await repo.GetPaymentByGatewayChargeIdAsync(evt.ChargeId);

    // -----------------------------------------------------------------------
    // Datas: sempre derivadas do evento, nunca do relógio local
    // -----------------------------------------------------------------------

    // Instante em que o gateway processou o evento. Usar DateTime.UtcNow aqui estenderia o ciclo
    // indevidamente quando o webhook chega atrasado ou é retentado horas depois.
    private static DateTime AnchorOf(PaymentWebhookEvent evt) =>
        evt.SubscriptionUpdatedAt ?? evt.PaidAt ?? DateTime.UtcNow;

    // Fim do período que este evento inaugura. O gateway informa nextChargeAt quando sabe; senão,
    // soma o ciclo do plano à âncora.
    private static DateTime PeriodEndFor(PaymentWebhookEvent evt, Plan? plan) =>
        evt.NextChargeAt ?? NextPeriodEnd(AnchorOf(evt), plan);

    private static DateTime NextPeriodEnd(DateTime from, Plan? plan) =>
        plan?.BillingPeriod == BillingPeriod.Annual ? from.AddYears(1) : from.AddMonths(1);

    // -----------------------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------------------

    // subscription.completed — a assinatura ficou ativa após o checkout. Captura o subs_ (necessário
    // para change-plan/cancel) e define o período. A baixa da cobrança vem do checkout.completed.
    private static void ApplyActivated(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)) sub.GatewaySubscriptionId = evt.SubscriptionId;

        sub.Status = SubscriptionStatus.Active;
        // Âncora da janela de reembolso. StartCheckoutAsync zera StartedAt, então uma reativação
        // passa por aqui e abre uma janela nova; uma renovação não passa e preserva a original.
        sub.StartedAt ??= AnchorOf(evt);
        sub.CurrentPeriodEnd = PeriodEndFor(evt, sub.Plan);
        sub.TrialEndsAt = null;   // assinatura paga não carrega data de teste
        sub.CanceledAt = null;
        sub.UpdatedAt = DateTime.UtcNow;
    }

    // subscription.renewed — estende o ciclo. StartedAt fica intacto: renovar não reabre a janela de
    // reembolso. O pagamento da renovação chega no checkout.completed correspondente.
    //
    // É aqui que um DOWNGRADE agendado entra em vigor: o gateway já cobrou o valor do plano novo, e é
    // agora que o usuário deixa de ter os recursos do plano antigo. A promoção vem ANTES de calcular o
    // período — o plano novo pode ter outro ciclo (mensal → anual).
    private async Task ApplyRenewedAsync(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)) sub.GatewaySubscriptionId = evt.SubscriptionId;

        var plan = await PromotePendingPlanAsync(sub);

        sub.Status = SubscriptionStatus.Active;
        sub.CurrentPeriodEnd = PeriodEndFor(evt, plan);
        sub.UpdatedAt = DateTime.UtcNow;
    }

    // Promove o downgrade agendado e devolve o plano que passa a valer neste ciclo.
    private async Task<Plan?> PromotePendingPlanAsync(Subscription sub)
    {
        if (sub.PendingPlanId is not Guid pendingId) return sub.Plan;

        var pendingPlan = await repo.GetPlanByIdAsync(pendingId);
        sub.PendingPlanId = null;

        if (pendingPlan is null)
        {
            logger.LogWarning("Plano agendado {PlanId} não existe mais; assinatura {SubscriptionId} renovou no plano atual.",
                pendingId, sub.Id);
            return sub.Plan;
        }

        logger.LogInformation("Assinatura {SubscriptionId} renovou trocando para o plano {PlanName}.", sub.Id, pendingPlan.Name);
        sub.PlanId = pendingPlan.Id;
        return pendingPlan;
    }

    // subscription.payment_failed — a cobrança da renovação foi recusada e o gateway vai retentar
    // conforme a retryPolicy. Não mexe no Status da assinatura: o acesso já está barrado porque o
    // CurrentPeriodEnd venceu. Registra a falha no histórico (uma linha por parcela, idempotente
    // pelo installmentId) para o usuário saber que precisa atualizar o cartão.
    private async Task ApplyPaymentFailedAsync(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null || string.IsNullOrEmpty(evt.InstallmentId)) return;

        logger.LogWarning(
            "Cobrança recusada na assinatura {SubscriptionId}: parcela {InstallmentId}, tentativa {RetryNumber}",
            sub.Id, evt.InstallmentId, evt.RetryNumber);

        // Retentativas da mesma parcela reusam o installmentId — só avança o contador.
        if (await repo.GetPaymentByGatewayChargeIdAsync(evt.InstallmentId) is { } existing)
        {
            existing.RetryNumber = evt.RetryNumber;
            existing.UpdatedAt = DateTime.UtcNow;
            return;
        }

        await repo.AddPaymentAsync(new Payment
        {
            UserId = sub.UserId,
            SubscriptionId = sub.Id,
            PlanId = sub.PlanId,
            Provider = sub.Provider,
            GatewayChargeId = evt.InstallmentId,
            Kind = PaymentKind.CardSubscription,
            Method = GatewayPaymentMethod.Card,
            AmountCents = evt.AmountCents ?? sub.Plan?.PriceCents ?? 0,
            Status = PaymentStatus.Failed,
            RetryNumber = evt.RetryNumber,
        });
    }

    // subscription.cancelled — idempotente com o cancelamento manual, que já pode ter aplicado o
    // estado. NÃO toca no Payment: o payload traz o bill_ do checkout ORIGINAL, que está pago, e
    // marcá-lo como cancelado reescreveria uma fatura legítima do histórico.
    private static void ApplyCancelled(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        sub.CanceledAt ??= AnchorOf(evt);
        sub.UpdatedAt = DateTime.UtcNow;

        // Involuntário (a cobrança esgotou as tentativas): não há período pago a honrar, o acesso cai.
        if (evt.CancelledDueTo == CancelReasons.MaxPaymentRetriesExceeded)
        {
            sub.Status = SubscriptionStatus.Expired;
            sub.CurrentPeriodEnd = DateTime.UtcNow;
            return;
        }

        // Cancelamento dentro da janela de reembolso: o estado final é ditado pelo checkout.refunded,
        // quando o estorno for aprovado no painel. Este evento é só o eco do cancelamento no gateway.
        if (sub.Status == SubscriptionStatus.RefundRequested) return;

        // Voluntário: acesso preservado até o fim do período já pago (CurrentPeriodEnd intacto).
        sub.Status = SubscriptionStatus.Canceled;
    }

    // checkout.completed. PAID → dá baixa/cria a cobrança. Caso contrário só captura o cartão no
    // Payment pendente (o checkout foi criado, o dinheiro ainda não saiu).
    private async Task ApplyCheckoutCompletedAsync(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (evt.Status != GatewayChargeStatus.Paid)
        {
            ApplyCard(payment, evt);
            return;
        }

        if (await CompleteChargeAsync(sub, payment, evt) is null)
            logger.LogWarning(
                "Cobrança {ChargeId} paga não pôde ser registrada: assinatura não resolvida (externalId {ExternalId}, cliente {CustomerId})",
                evt.ChargeId, evt.ExternalId, evt.CustomerId);
    }

    // checkout.refunded / checkout.disputed. O estorno é aprovado manualmente no painel do AbacatePay
    // — este evento é a confirmação de que o dinheiro voltou.
    private static void ApplyReversed(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (payment is not null)
        {
            payment.Status = evt.Type is PaymentWebhookType.CheckoutRefunded
                ? PaymentStatus.Refunded
                : PaymentStatus.Disputed;
            payment.UpdatedAt = DateTime.UtcNow;
        }

        if (sub is null || !RevokesAccess(sub, payment)) return;

        sub.Status = SubscriptionStatus.Expired;
        sub.CurrentPeriodEnd = DateTime.UtcNow;
        sub.UpdatedAt = DateTime.UtcNow;
    }

    // Estornar uma cobrança antiga de quem hoje tem assinatura válida não pode derrubar o acesso.
    // Derruba quando a assinatura aguarda o estorno, quando a cobrança revertida é a que custeia o
    // período corrente, ou quando não dá para saber qual foi (chargeback → conservador).
    private static bool RevokesAccess(Subscription sub, Payment? payment) =>
        sub.Status == SubscriptionStatus.RefundRequested
        || payment?.PeriodEnd is null
        || payment.PeriodEnd > DateTime.UtcNow;

    // -----------------------------------------------------------------------
    // Cobranças
    // -----------------------------------------------------------------------

    // Dá baixa na cobrança: marca o Payment pré-existente como pago ou, se não houver (renovação),
    // registra um novo já pago (idempotente pelo ChargeId). Retorna o Payment afetado (ou null).
    private async Task<Payment?> CompleteChargeAsync(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (payment is not null)
        {
            MarkPaid(payment, evt);
            SetPeriod(payment, evt, sub?.Plan);
            return payment;
        }

        if (sub is null || string.IsNullOrEmpty(evt.ChargeId)) return null;

        var created = new Payment
        {
            UserId = sub.UserId,
            SubscriptionId = sub.Id,
            PlanId = sub.PlanId,
            Provider = sub.Provider,
            GatewayChargeId = evt.ChargeId,
            Kind = PaymentKind.CardSubscription,
            Method = GatewayPaymentMethod.Card,
            AmountCents = evt.AmountCents ?? sub.Plan?.PriceCents ?? 0,
            Status = PaymentStatus.Paid,
            PaidAt = evt.PaidAt ?? DateTime.UtcNow,
            ReceiptUrl = evt.ReceiptUrl,
            CardLastFour = evt.CardLastFour,
            CardBrand = evt.CardBrand,
        };
        SetPeriod(created, evt, sub.Plan);
        await repo.AddPaymentAsync(created);
        return created;
    }

    // Período que ESTA cobrança custeia, derivado do evento — não de sub.CurrentPeriodEnd. A
    // assinatura só é estendida no subscription.completed/renewed, que pode chegar depois deste
    // checkout.completed: ler a data da assinatura aqui gravaria o período anterior no histórico.
    private static void SetPeriod(Payment payment, PaymentWebhookEvent evt, Plan? plan)
    {
        var start = evt.PaidAt ?? AnchorOf(evt);
        payment.PeriodStart = start;
        payment.PeriodEnd = evt.NextChargeAt ?? NextPeriodEnd(start, plan);
    }

    private static void MarkPaid(Payment payment, PaymentWebhookEvent evt)
    {
        payment.Status = PaymentStatus.Paid;
        payment.PaidAt = evt.PaidAt ?? DateTime.UtcNow;
        if (!string.IsNullOrEmpty(evt.ReceiptUrl)) payment.ReceiptUrl = evt.ReceiptUrl;
        if (evt.AmountCents is int amount) payment.AmountCents = amount;
        ApplyCard(payment, evt);
    }

    // Captura o cartão (últimos 4 + bandeira) no histórico de cobrança quando o webhook o traz.
    private static void ApplyCard(Payment? payment, PaymentWebhookEvent evt)
    {
        if (payment is null) return;
        if (!string.IsNullOrEmpty(evt.CardLastFour)) payment.CardLastFour = evt.CardLastFour;
        if (!string.IsNullOrEmpty(evt.CardBrand)) payment.CardBrand = evt.CardBrand;
        payment.UpdatedAt = DateTime.UtcNow;
    }
}
