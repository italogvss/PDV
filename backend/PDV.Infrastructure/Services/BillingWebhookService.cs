using Microsoft.Extensions.Logging;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

// Aplica um evento de webhook (já verificado e normalizado) ao estado de assinatura/pagamento.
// Resolve a assinatura/pagamento por metadata.userId + gateway-ids — sem tenant/user context.
public class BillingWebhookService(IBillingWebhookRepository repo, ILogger<BillingWebhookService> logger) : IBillingWebhookService
{
    public async Task ProcessAsync(PaymentWebhookEvent evt)
    {
        var sub = await ResolveSubscriptionAsync(evt);
        var payment = await ResolvePaymentAsync(evt);

        logger.LogInformation("Assinatura resolvida {SubscriptionId} (status {Status}) para evento {EventType}",
            sub?.Id, sub?.Status, evt.Type);
        logger.LogInformation("Pagamento resolvido {PaymentId} (status {Status}) para evento {EventType}",
            payment?.Id, payment?.Status, evt.Type);

        switch (evt.Type)
        {
            // Baixa de pagamento (cartão) — o lifecycle da assinatura vem dos eventos subscription.*.
            case PaymentWebhookType.CheckoutCompleted:
                await ApplyCheckoutCompletedAsync(sub, payment, evt);
                break;

            // PIX é pagamento único e não gera evento subscription.* → ativa a sub E dá baixa.
            case PaymentWebhookType.TransparentCompleted:
                await ApplyPixCompletedAsync(sub, payment, evt);
                break;

            // Eventos subscription.* só sincronizam o estado da assinatura (sem tocar em pagamento).
            case PaymentWebhookType.SubscriptionCompleted:
                ApplySubscriptionActive(sub, evt);
                break;

            case PaymentWebhookType.SubscriptionTrialStarted:
                await ApplyTrialStarted(sub, evt);
                break;

            case PaymentWebhookType.SubscriptionRenewed:
                ApplyRenewed(sub, evt);
                break;

            case PaymentWebhookType.SubscriptionCancelled:
                ApplyCancelled(sub);
                break;

            case PaymentWebhookType.CheckoutRefunded:
            case PaymentWebhookType.CheckoutDisputed:
            case PaymentWebhookType.TransparentRefunded:
            case PaymentWebhookType.TransparentDisputed:
                ApplyReversed(sub, payment, evt);
                break;

            case PaymentWebhookType.SubscriptionPlanChanged:
                await ApplyPlanChangedAsync(sub, payment, evt);
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

    // Os payloads do gateway não carregam metadata; a correlação confiável vem do externalId (= nossa
    // Subscription.Id, definida ao criar a cobrança) e, em último caso, do cliente no gateway (cust_).
    private async Task<Subscription?> ResolveSubscriptionAsync(PaymentWebhookEvent evt)
    {
        if (evt.Metadata.TryGetValue("subscriptionId", out var sid) && Guid.TryParse(sid, out var metaSubId))
        {
            var byMeta = await repo.GetSubscriptionByIdAsync(metaSubId);
            if (byMeta is not null) return byMeta;
        }

        // ExternalId = nossa Subscription.Id — chave primária para checkout.* e transparent.*.
        if (Guid.TryParse(evt.ExternalId, out var externalSubId))
        {
            var byExternal = await repo.GetSubscriptionByIdAsync(externalSubId);
            if (byExternal is not null) return byExternal;
        }

        // Id da assinatura no gateway (subs_) — eventos subscription.* após a 1ª ativação.
        if (!string.IsNullOrEmpty(evt.SubscriptionId))
        {
            var byGateway = await repo.GetSubscriptionByGatewayIdAsync(evt.SubscriptionId);
            if (byGateway is not null) return byGateway;
        }

        if (evt.Metadata.TryGetValue("userId", out var uid) && Guid.TryParse(uid, out var userId))
        {
            var byUser = await repo.GetLiveSubscriptionByUserIdAsync(userId);
            if (byUser is not null) return byUser;
        }

        // Cliente no gateway (cust_) — eventos subscription.* na 1ª ativação e renovações sem externalId.
        if (!string.IsNullOrEmpty(evt.CustomerId))
            return await repo.GetLiveSubscriptionByGatewayCustomerIdAsync(evt.Provider, evt.CustomerId);

        return null;
    }

    // Resolve o Payment desta cobrança estritamente pelo id no gateway (bill_/pix_char_), que é o que
    // gravamos em GatewayChargeId ao criar o checkout/PIX. Sem fallback por "pendente mais recente":
    // numa renovação não há Payment pré-criado e CompleteChargeAsync deve criar um novo — não marcar
    // por engano um pendente avulso de um checkout anterior.
    private async Task<Payment?> ResolvePaymentAsync(PaymentWebhookEvent evt) =>
        string.IsNullOrEmpty(evt.ChargeId)
            ? null
            : await repo.GetPaymentByGatewayChargeIdAsync(evt.ChargeId);

    // subscription.completed — a assinatura ficou ativa após o checkout. Só sincroniza o estado e captura
    // o id da assinatura no gateway (subs_, necessário para change-plan/cancel). A baixa vem do checkout.
    private static void ApplySubscriptionActive(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)) sub.GatewaySubscriptionId = evt.SubscriptionId;

        sub.Status = SubscriptionStatus.Active;
        sub.CurrentPeriodEnd = NextPeriodEnd(DateTime.UtcNow, sub.Plan);
        sub.UpdatedAt = DateTime.UtcNow;
    }

    // Fim do próximo período conforme o ciclo do plano (cartão mensal/anual).
    private static DateTime NextPeriodEnd(DateTime from, Plan? plan) =>
        plan?.BillingPeriod == BillingPeriod.Annual ? from.AddYears(1) : from.AddMonths(1);

    private async Task ApplyTrialStarted(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)) sub.GatewaySubscriptionId = evt.SubscriptionId;

        sub.Status = SubscriptionStatus.Trialing;
        sub.TrialEndsAt = evt.TrialEndsAt
            ?? (sub.Plan?.TrialDays is int days ? DateTime.UtcNow.AddDays(days) : sub.TrialEndsAt);
        sub.CurrentPeriodEnd = sub.TrialEndsAt;
        sub.UpdatedAt = DateTime.UtcNow;

        await repo.MarkTrialUsedAsync(sub.UserId);
    }

    // subscription.renewed — só estende o ciclo. O pagamento da renovação chega por
    // checkout.completed/transparent.completed (não é registrado aqui).
    private static void ApplyRenewed(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)) sub.GatewaySubscriptionId = evt.SubscriptionId;

        sub.Status = SubscriptionStatus.Active;
        sub.CurrentPeriodEnd = NextPeriodEnd(DateTime.UtcNow, sub.Plan);
        sub.UpdatedAt = DateTime.UtcNow;
    }

    // transparent.completed — PIX é pagamento único sem evento subscription.*, então ativa a sub aqui.
    private async Task ApplyPixCompletedAsync(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        var annual = evt.Metadata.TryGetValue("period", out var period)
            && string.Equals(period, BillingPeriod.Annual.ToString(), StringComparison.OrdinalIgnoreCase);

        sub.Status = SubscriptionStatus.Active;
        sub.IsRenewable = false;
        sub.CurrentPeriodEnd = annual ? DateTime.UtcNow.AddYears(1) : DateTime.UtcNow.AddMonths(1);
        sub.UpdatedAt = DateTime.UtcNow;

        await CompleteChargeAsync(sub, payment, evt, PaymentKind.PixSubscription, GatewayPaymentMethod.Pix);
    }

    // checkout.completed reaproveitado para trial E cobrança real. No trial chega PENDING/amount 0 (sem
    // cobrança) — só captura o cartão no Payment pendente; o lifecycle vem de subscription.trial_started.
    // Numa cobrança real (PAID) dá a baixa normalmente.
    private async Task ApplyCheckoutCompletedAsync(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (evt.Status != GatewayChargeStatus.Paid)
        {
            ApplyCard(payment, evt);
            return;
        }

        await CompleteChargeAsync(sub, payment, evt, PaymentKind.CardSubscription, GatewayPaymentMethod.Card);
    }

    // subscription.plan_changed — a troca já foi aplicada de imediato no ChangePlanAsync. Aqui é apenas
    // confirmação idempotente: captura o id da assinatura, garante o PlanId (mapeado pelo produto) e
    // registra a cobrança aprovada do payload. NÃO altera datas (preserva o período do ciclo atual).
    private async Task ApplyPlanChangedAsync(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)) sub.GatewaySubscriptionId = evt.SubscriptionId;

        if (!string.IsNullOrEmpty(evt.ProductId))
        {
            var planId = (await repo.GetPlanByExternalProductIdAsync(evt.ProductId))?.Id;
            if (planId is Guid pid && pid != sub.PlanId) sub.PlanId = pid;
        }

        sub.UpdatedAt = DateTime.UtcNow;

        // Registra a cobrança da troca (presente só quando há cobrança real, fora de trial).
        if (evt.Status == GatewayChargeStatus.Paid)
            await CompleteChargeAsync(sub, payment, evt, PaymentKind.CardSubscription, GatewayPaymentMethod.Card);
    }

    // Dá baixa na cobrança: marca o Payment pré-existente como pago ou, se não houver (renovação),
    // registra um novo já pago (idempotente pelo ChargeId). Retorna o Payment afetado (ou null).
    private async Task<Payment?> CompleteChargeAsync(
        Subscription? sub, Payment? payment, PaymentWebhookEvent evt, PaymentKind kind, GatewayPaymentMethod method)
    {
        if (payment is not null)
        {
            MarkPaid(payment, evt);
            SetPeriod(payment, sub);
            return payment;
        }

        if (sub is null || string.IsNullOrEmpty(evt.ChargeId)) return null;
        if (await repo.GetPaymentByGatewayChargeIdAsync(evt.ChargeId) is not null) return null;

        var created = new Payment
        {
            UserId = sub.UserId,
            SubscriptionId = sub.Id,
            PlanId = sub.PlanId,
            Provider = sub.Provider,
            GatewayChargeId = evt.ChargeId,
            Kind = kind,
            Method = method,
            AmountCents = evt.AmountCents ?? sub.Plan?.PriceCents ?? 0,
            Status = PaymentStatus.Paid,
            PaidAt = evt.PaidAt ?? DateTime.UtcNow,
            ReceiptUrl = evt.ReceiptUrl,
            CardLastFour = evt.CardLastFour,
            CardBrand = evt.CardBrand,
        };
        SetPeriod(created, sub);
        await repo.AddPaymentAsync(created);
        return created;
    }

    // Registra o período coberto pela cobrança no histórico (fim = fim do período corrente da assinatura).
    private static void SetPeriod(Payment payment, Subscription? sub)
    {
        payment.PeriodStart = DateTime.UtcNow;
        payment.PeriodEnd = sub?.CurrentPeriodEnd;
    }

    private static void ApplyCancelled(Subscription? sub)
    {
        if (sub is null) return;
        sub.Status = SubscriptionStatus.Canceled;
        sub.CanceledAt ??= DateTime.UtcNow;
        sub.UpdatedAt = DateTime.UtcNow;
    }

    private static void ApplyReversed(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (payment is not null)
        {
            payment.Status = evt.Type is PaymentWebhookType.CheckoutRefunded or PaymentWebhookType.TransparentRefunded
                ? PaymentStatus.Refunded
                : PaymentStatus.Disputed;
            payment.UpdatedAt = DateTime.UtcNow;
        }

        if (sub is not null)
        {
            sub.Status = SubscriptionStatus.Expired;
            sub.CurrentPeriodEnd = DateTime.UtcNow;
            sub.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static void MarkPaid(Payment? payment, PaymentWebhookEvent evt)
    {
        if (payment is null) return;
        payment.Status = PaymentStatus.Paid;
        payment.PaidAt = evt.PaidAt ?? DateTime.UtcNow;
        if (!string.IsNullOrEmpty(evt.ReceiptUrl)) payment.ReceiptUrl = evt.ReceiptUrl;
        if (evt.AmountCents is int amount) payment.AmountCents = amount;
        ApplyCard(payment, evt);
        payment.UpdatedAt = DateTime.UtcNow;
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
