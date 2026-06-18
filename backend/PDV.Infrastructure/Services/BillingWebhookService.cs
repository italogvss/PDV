using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

// Aplica um evento de webhook (já verificado e normalizado) ao estado de assinatura/pagamento.
// Resolve a assinatura/pagamento por metadata.userId + gateway-ids — sem tenant/user context.
public class BillingWebhookService(IBillingWebhookRepository repo) : IBillingWebhookService
{
    public async Task ProcessAsync(PaymentWebhookEvent evt)
    {
        var sub = await ResolveSubscriptionAsync(evt);
        var payment = await ResolvePaymentAsync(evt, sub);

        switch (evt.Type)
        {
            case PaymentWebhookType.CheckoutCompleted:
            case PaymentWebhookType.SubscriptionCompleted:
                ApplyCardActivated(sub, payment, evt);
                break;

            case PaymentWebhookType.SubscriptionTrialStarted:
                ApplyTrialStarted(sub, evt);
                break;

            case PaymentWebhookType.SubscriptionRenewed:
                await ApplyRenewedAsync(sub, evt);
                break;

            case PaymentWebhookType.TransparentCompleted:
                ApplyPixCompleted(sub, payment, evt);
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
                // A troca já foi registrada (PendingPlanId) ao solicitar; é aplicada no renewed.
                break;
        }

        await repo.SaveChangesAsync();
    }

    private async Task<Subscription?> ResolveSubscriptionAsync(PaymentWebhookEvent evt)
    {
        if (evt.Metadata.TryGetValue("subscriptionId", out var sid) && Guid.TryParse(sid, out var subId))
        {
            var byId = await repo.GetSubscriptionByIdAsync(subId);
            if (byId is not null) return byId;
        }

        if (!string.IsNullOrEmpty(evt.SubscriptionId))
        {
            var byGateway = await repo.GetSubscriptionByGatewayIdAsync(evt.SubscriptionId);
            if (byGateway is not null) return byGateway;
        }

        if (evt.Metadata.TryGetValue("userId", out var uid) && Guid.TryParse(uid, out var userId))
            return await repo.GetLiveSubscriptionByUserIdAsync(userId);

        return null;
    }

    private async Task<Payment?> ResolvePaymentAsync(PaymentWebhookEvent evt, Subscription? sub)
    {
        if (!string.IsNullOrEmpty(evt.ChargeId))
        {
            var byCharge = await repo.GetPaymentByGatewayChargeIdAsync(evt.ChargeId);
            if (byCharge is not null) return byCharge;
        }

        return sub is null ? null : await repo.GetLatestPendingPaymentBySubscriptionIdAsync(sub.Id);
    }

    private static void ApplyCardActivated(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        // O id da assinatura (subs_...) chega no webhook — necessário para change-plan/cancel.
        if (!string.IsNullOrEmpty(evt.SubscriptionId)) sub.GatewaySubscriptionId = evt.SubscriptionId;

        sub.Status = SubscriptionStatus.Active;
        sub.CurrentPeriodEnd = DateTime.UtcNow.AddMonths(1);
        sub.UpdatedAt = DateTime.UtcNow;
        MarkPaid(payment, evt);
    }

    private static void ApplyTrialStarted(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        if (!string.IsNullOrEmpty(evt.SubscriptionId)) sub.GatewaySubscriptionId = evt.SubscriptionId;

        sub.Status = SubscriptionStatus.Trialing;
        sub.TrialEndsAt = sub.Plan?.TrialDays is int days ? DateTime.UtcNow.AddDays(days) : sub.TrialEndsAt;
        sub.CurrentPeriodEnd = sub.TrialEndsAt;
        sub.UpdatedAt = DateTime.UtcNow;
    }

    private async Task ApplyRenewedAsync(Subscription? sub, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        // Aplica a troca de plano agendada (se houver) ao iniciar o novo ciclo.
        if (sub.PendingPlanId is Guid pendingPlanId)
        {
            sub.PlanId = pendingPlanId;
            sub.PendingPlanId = null;
            sub.PendingChangeExternalId = null;
        }

        sub.Status = SubscriptionStatus.Active;
        sub.CurrentPeriodEnd = DateTime.UtcNow.AddMonths(1);
        sub.UpdatedAt = DateTime.UtcNow;

        // Registra a cobrança da renovação (idempotente pelo id da cobrança).
        if (string.IsNullOrEmpty(evt.ChargeId)) return;
        if (await repo.GetPaymentByGatewayChargeIdAsync(evt.ChargeId) is not null) return;

        await repo.AddPaymentAsync(new Payment
        {
            UserId = sub.UserId,
            SubscriptionId = sub.Id,
            PlanId = sub.PlanId,
            Provider = sub.Provider,
            GatewayChargeId = evt.ChargeId,
            Kind = PaymentKind.CardSubscription,
            Method = GatewayPaymentMethod.Card,
            AmountCents = evt.AmountCents ?? sub.Plan?.PriceMonthlyCents ?? 0,
            Status = PaymentStatus.Paid,
            PaidAt = evt.PaidAt ?? DateTime.UtcNow,
            ReceiptUrl = evt.ReceiptUrl,
        });
    }

    private static void ApplyPixCompleted(Subscription? sub, Payment? payment, PaymentWebhookEvent evt)
    {
        if (sub is null) return;

        var annual = evt.Metadata.TryGetValue("period", out var period)
            && string.Equals(period, BillingPeriod.Annual.ToString(), StringComparison.OrdinalIgnoreCase);

        sub.Status = SubscriptionStatus.Active;
        sub.IsRenewable = false;
        sub.CurrentPeriodEnd = annual ? DateTime.UtcNow.AddYears(1) : DateTime.UtcNow.AddMonths(1);
        sub.UpdatedAt = DateTime.UtcNow;

        MarkPaid(payment, evt);
        if (payment is not null)
        {
            payment.PeriodStart = DateTime.UtcNow;
            payment.PeriodEnd = sub.CurrentPeriodEnd;
        }
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
        payment.UpdatedAt = DateTime.UtcNow;
    }
}
