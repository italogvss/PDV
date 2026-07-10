using Microsoft.Extensions.Logging;
using PDV.Application.DTOs.Payments;
using PDV.Application.DTOs.Subscriptions;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Application.Interfaces.Payments;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class SubscriptionService(
    IUserContext userContext,
    IEntitlementService entitlementService,
    IPlanRepository planRepository,
    ISubscriptionRepository subscriptionRepository,
    IGatewayCustomerRepository gatewayCustomerRepository,
    IPaymentRepository paymentRepository,
    IUserRepository userRepository,
    IPaymentGateway gateway,
    ILogger<SubscriptionService> logger) : ISubscriptionService
{
    public async Task<SubscriptionResponse> GetMineAsync()
    {
        var resolved = await entitlementService.ResolveForCurrentTenantAsync();
        var sub = resolved.Subscription;

        var user = await userRepository.GetByIdAsync(userContext.UserId);

        var pendingPlan = sub?.PendingPlanId is Guid pendingId
            ? await planRepository.GetByIdAsync(pendingId)
            : null;

        // A última cobrança da assinatura. Se ela foi recusada, o dunning está em curso: o gateway
        // ainda retenta, e o usuário precisa saber que o cartão falhou. Uma retentativa bem-sucedida
        // registra um Payment `Paid` mais novo, então basta olhar a mais recente.
        var lastCharge = sub is null ? null : await paymentRepository.GetLatestBySubscriptionIdAsync(sub.Id);
        var failedCharge = lastCharge?.Status == PaymentStatus.Failed ? lastCharge : null;

        return new SubscriptionResponse(
            PlanId: sub?.PlanId,
            PlanName: sub?.Plan.Name,
            Status: sub is null ? "None" : sub.Status.ToString(),
            Method: sub?.Method.ToString(),
            IsRenewable: sub?.IsRenewable ?? false,
            TrialEndsAt: sub?.TrialEndsAt,
            CurrentPeriodEnd: sub?.CurrentPeriodEnd,
            CanceledAt: sub?.CanceledAt,
            RefundEligibleUntil: sub is null ? null : RefundDeadlineOf(sub),
            PendingPlanId: pendingPlan?.Id,
            PendingPlanName: pendingPlan?.Name,
            // A troca agendada entra em vigor na virada do ciclo.
            PendingPlanStartsAt: pendingPlan is null ? null : sub?.CurrentPeriodEnd,
            LastPaymentFailedAt: failedCharge?.UpdatedAt,
            PaymentRetryNumber: failedCharge?.RetryNumber,
            Entitlements: resolved.Entitlements,
            Limits: resolved.Limits,
            HasUsedTrial: user?.HasUsedTrial ?? false);
    }

    public async Task<IReadOnlyList<PlanResponse>> GetPlansAsync()
    {
        var plans = await planRepository.GetActiveAsync();
        return plans.Select(MapPlan).ToList();
    }

    public async Task<StartCheckoutResponse> StartCheckoutAsync(StartCheckoutRequest request)
    {
        var userId = userContext.UserId;
        var plan = await planRepository.GetByIdAsync(request.PlanId)
            ?? throw new NotFoundException("Plano não encontrado.");

        if (!await gateway.CheckIfPlanExistsAsync(plan.ExternalProductId))
            throw new NotFoundException("Plano não encontrado.");

        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var existingSub = await subscriptionRepository.GetByUserIdAsync(userId);
        EnsureCanCheckout(existingSub);

        var customer = await EnsureCustomerAsync(userId, user);

        // Reassinar cria uma assinatura NOVA no gateway. Se a anterior ainda estiver viva lá (ex.: a
        // renovação falhou e o dunning segue tentando cobrar), o usuário acabaria com duas.
        if (existingSub is not null) await DiscardGatewaySubscriptionAsync(existingSub);

        // Uma assinatura por usuário — reaproveita a linha existente (reativação/retry).
        var sub = existingSub ?? new Subscription { UserId = userId };
        var isNew = existingSub is null;
        sub.Provider = gateway.Provider;
        sub.PlanId = plan.Id;
        sub.PendingPlanId = null;
        sub.Method = GatewayPaymentMethod.Card;
        sub.IsRenewable = true;
        sub.GatewayCustomerId = customer.GatewayCustomerId;
        sub.Status = SubscriptionStatus.Pending;
        sub.CanceledAt = null;
        // Uma contratação nova abre uma janela de reembolso nova — o webhook subscription.completed
        // grava o StartedAt. TrialEndsAt some: quem paga não carrega data de teste.
        sub.StartedAt = null;
        sub.TrialEndsAt = null;
        // Marca o início da espera pelo gateway: é daqui que ExpireStalePendingAsync conta o TTL.
        // Sem isto, uma reativação nasceria "velha" e o job a expiraria no meio do checkout.
        sub.UpdatedAt = DateTime.UtcNow;

        var metadata = new Dictionary<string, string>
        {
            ["userId"] = userId.ToString(),
            ["planId"] = plan.Id.ToString(),
            ["subscriptionId"] = sub.Id.ToString(),
        };

        var checkout = await gateway.CreateSubscriptionCheckoutAsync(new SubscriptionCheckoutRequest(
            plan.ExternalProductId, customer.GatewayCustomerId, sub.Id.ToString(),
            request.CouponCode, request.ReturnUrl, request.CompletionUrl, metadata));

        if (isNew) await subscriptionRepository.AddAsync(sub);
        else await subscriptionRepository.UpdateAsync(sub);

        await paymentRepository.AddAsync(new Payment
        {
            UserId = userId,
            SubscriptionId = sub.Id,
            PlanId = plan.Id,
            Provider = gateway.Provider,
            GatewayChargeId = checkout.CheckoutId,
            Kind = PaymentKind.CardSubscription,
            Method = GatewayPaymentMethod.Card,
            AmountCents = plan.PriceCents,
            Status = PaymentStatus.Pending,
            CouponCode = request.CouponCode,
        });

        // Ativação vem por webhook (subscription.completed), nunca desta resposta.
        return new StartCheckoutResponse(checkout.Url);
    }

    // Encerra a recorrência anterior no gateway antes de abrir uma nova. Best-effort: se a assinatura
    // já tiver sido cancelada lá (cancelamento voluntário, esgotamento de tentativas, estorno), a
    // chamada falha e não há nada a fazer — o que não pode é ficar uma recorrência viva cobrando.
    // Zerar o GatewaySubscriptionId também libera o índice único para o subs_ novo.
    private async Task DiscardGatewaySubscriptionAsync(Subscription sub)
    {
        if (string.IsNullOrEmpty(sub.GatewaySubscriptionId)) return;

        try
        {
            await gateway.CancelSubscriptionAsync(sub.GatewaySubscriptionId);
        }
        catch (PaymentGatewayException ex)
        {
            logger.LogWarning(ex, "Assinatura {GatewaySubscriptionId} não pôde ser cancelada no gateway antes do novo checkout.",
                sub.GatewaySubscriptionId);
        }

        sub.GatewaySubscriptionId = null;
    }

    // Bloqueia a cobrança dupla: assinatura viva e vigente não contrata de novo. Canceled/Expired/
    // Pending liberam (reativação/retry). RefundRequested aguarda o estorno ser aprovado no painel —
    // reassinar antes disso faria o checkout.refunded derrubar a assinatura nova.
    private void EnsureCanCheckout(Subscription? sub)
    {
        if (sub is null) return;

        if (sub.Status == SubscriptionStatus.RefundRequested)
            throw new BusinessException(
                "Sua solicitação de reembolso está em análise. " +
                "Assim que ela for concluída você poderá assinar novamente.");

        if (sub.Status is SubscriptionStatus.Active or SubscriptionStatus.Trialing
            && entitlementService.IsEntitled(sub))
        {
            var until = (sub.TrialEndsAt ?? sub.CurrentPeriodEnd)?.ToString("dd/MM/yyyy") ?? "breve";
            throw new BusinessException(
                $"Sua assinatura está ativa até {until}. " +
                "Aguarde o fim desse período para contratar novamente.");
        }
    }

    // Troca de plano. O gateway troca o produto da assinatura na hora, sem calcular diferença: o
    // valor novo só é cobrado na próxima renovação. O que decidimos aqui é QUANDO os recursos do
    // plano novo passam a valer no PDV:
    //
    //   upgrade   → imediato. Ele ganha os recursos agora e paga por eles na renovação.
    //   downgrade → agendado (PendingPlanId). Ele já pagou o plano maior por este ciclo; tirar
    //               recursos agora seria cobrar por algo que não entregamos. ApplyRenewed promove.
    //
    // No trial PDV-side não há assinatura no gateway nem cobrança: a troca é sempre imediata, e a
    // escolha definitiva fica para a hora de assinar.
    public async Task<ChangePlanResult> ChangePlanAsync(ChangePlanRequest request)
    {
        var sub = await subscriptionRepository.GetByUserIdAsync(userContext.UserId)
            ?? throw new BusinessException("Nenhuma assinatura ativa para trocar.");

        // Troca só vale para assinatura viva — uma cancelada deve reativar via novo checkout.
        if (sub.Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing))
            throw new BusinessException("Nenhuma assinatura ativa para trocar.");

        var newPlan = await planRepository.GetByIdAsync(request.PlanId)
            ?? throw new NotFoundException("Plano não encontrado.");

        var now = DateTime.UtcNow;

        // Escolher de novo o plano vigente com um downgrade agendado = desistir da troca. O gateway
        // precisa voltar a apontar para o produto atual, senão a próxima fatura viria com o valor menor.
        if (newPlan.Id == sub.PlanId)
        {
            if (sub.PendingPlanId is null)
                throw new BusinessException("Você já está neste plano.");

            if (!string.IsNullOrEmpty(sub.GatewaySubscriptionId))
                await gateway.ChangeSubscriptionPlanAsync(sub.GatewaySubscriptionId, newPlan.ExternalProductId, 1);

            sub.PendingPlanId = null;
            sub.UpdatedAt = now;
            await subscriptionRepository.UpdateAsync(sub);

            logger.LogInformation("Assinatura {SubscriptionId}: troca agendada cancelada.", sub.Id);
            return new ChangePlanResult(newPlan.Name, Scheduled: false, EffectiveAt: null, NextChargeAt: null);
        }

        // Trial PDV-side: o gateway não conhece esta assinatura. Nenhuma regra de upgrade/downgrade
        // se aplica — não há nada pago a preservar. As datas do trial ficam intactas.
        if (string.IsNullOrEmpty(sub.GatewaySubscriptionId))
        {
            if (sub.Status != SubscriptionStatus.Trialing)
                throw new BusinessException("Troca de plano disponível apenas para assinaturas já ativadas no gateway.");

            sub.PlanId = newPlan.Id;
            sub.UpdatedAt = now;
            await subscriptionRepository.UpdateAsync(sub);
            return new ChangePlanResult(newPlan.Name, Scheduled: false, EffectiveAt: null, NextChargeAt: null);
        }

        if (newPlan.Id == sub.PendingPlanId)
            throw new BusinessException("A troca para este plano já está agendada.");

        // O gateway troca o produto agora e não emite fatura. Reenviar é seguro: a chamada é idempotente
        // do ponto de vista do resultado (o produto da assinatura passa a ser o novo).
        await gateway.ChangeSubscriptionPlanAsync(sub.GatewaySubscriptionId, newPlan.ExternalProductId, 1);

        var scheduled = PlanChange.IsDowngrade(sub.Plan, newPlan);

        if (scheduled)
        {
            sub.PendingPlanId = newPlan.Id;
        }
        else
        {
            sub.PlanId = newPlan.Id;
            // Subir de plano cancela um downgrade que estivesse agendado — o gateway também só
            // guarda um produto por assinatura, e é o que acabamos de gravar lá.
            sub.PendingPlanId = null;
        }

        sub.UpdatedAt = now;
        await subscriptionRepository.UpdateAsync(sub);

        logger.LogInformation(
            "Assinatura {SubscriptionId}: troca para o plano {PlanName} ({Kind}).",
            sub.Id, newPlan.Name, scheduled ? "agendada" : "imediata");

        return new ChangePlanResult(
            newPlan.Name,
            Scheduled: scheduled,
            EffectiveAt: scheduled ? sub.CurrentPeriodEnd : now,
            NextChargeAt: sub.CurrentPeriodEnd);
    }

    public async Task<CancelSubscriptionResult> CancelAsync()
    {
        var userId = userContext.UserId;
        var sub = await subscriptionRepository.GetByUserIdAsync(userId)
            ?? throw new BusinessException("Nenhuma assinatura ativa para cancelar.");

        if (sub.Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing))
            throw new BusinessException("Nenhuma assinatura ativa para cancelar.");

        // Encerra a recorrência no gateway antes de qualquer coisa — impede a cobrança do próximo
        // ciclo mesmo que a persistência local falhe (o webhook subscription.cancelled reconcilia).
        if (!string.IsNullOrEmpty(sub.GatewaySubscriptionId))
            await gateway.CancelSubscriptionAsync(sub.GatewaySubscriptionId);

        var now = DateTime.UtcNow;
        var result = sub.Status == SubscriptionStatus.Trialing
            ? CancelTrial(sub, now)
            : IsWithinRefundWindow(sub, now) ? RequestRefund(sub, now) : CancelAtPeriodEnd(sub, now);

        sub.UpdatedAt = now;
        await subscriptionRepository.UpdateAsync(sub);
        return result;
    }

    // Trial cancelado: o acesso ao plano cai na hora, mas a conta e as lojas continuam de pé para
    // exportar os dados ou assinar de novo. HasUsedTrial permanece true — trial é único por usuário.
    private static CancelSubscriptionResult CancelTrial(Subscription sub, DateTime now)
    {
        sub.Status = SubscriptionStatus.Expired;
        sub.CanceledAt = now;
        sub.TrialEndsAt = now;
        sub.CurrentPeriodEnd = now;
        return new CancelSubscriptionResult("Expired", RefundRequested: false, AccessUntil: null,
            DataAvailableUntil: now.AddDays(RetentionDefaults.DaysAfterAccessLoss));
    }

    // Dentro da janela de arrependimento: a assinatura termina agora e abre-se uma solicitação de
    // reembolso. O estorno NÃO tem endpoint na API — é aprovado manualmente no painel do AbacatePay,
    // e o webhook checkout.refunded fecha o ciclo (Payment=Refunded, Subscription=Expired).
    private static CancelSubscriptionResult RequestRefund(Subscription sub, DateTime now)
    {
        sub.Status = SubscriptionStatus.RefundRequested;
        sub.CanceledAt = now;
        sub.CurrentPeriodEnd = now;
        return new CancelSubscriptionResult("RefundRequested", RefundRequested: true, AccessUntil: null,
            DataAvailableUntil: now.AddDays(RetentionDefaults.DaysAfterAccessLoss));
    }

    // Fora da janela: só as próximas faturas são canceladas. O período já pago é honrado até o fim
    // (CurrentPeriodEnd preservado) e o job de expiração o move para Expired depois.
    private static CancelSubscriptionResult CancelAtPeriodEnd(Subscription sub, DateTime now)
    {
        sub.Status = SubscriptionStatus.Canceled;
        sub.CanceledAt = now;
        var accessUntil = sub.CurrentPeriodEnd ?? now;
        return new CancelSubscriptionResult("Canceled", RefundRequested: false, AccessUntil: accessUntil,
            DataAvailableUntil: accessUntil.AddDays(RetentionDefaults.DaysAfterAccessLoss));
    }

    // Janela contada a partir do momento em que a assinatura paga passou a valer. Renovações não a
    // reabrem; uma reativação sim, porque grava um StartedAt novo.
    private static bool IsWithinRefundWindow(Subscription sub, DateTime now) =>
        RefundDeadlineOf(sub) is DateTime deadline && now <= deadline;

    private static DateTime? RefundDeadlineOf(Subscription sub) =>
        sub.StartedAt?.AddDays(RefundDefaults.WindowDays);

    private async Task<GatewayCustomer> EnsureCustomerAsync(Guid userId, User user)
    {
        var existing = await gatewayCustomerRepository.GetByUserIdAsync(userId, gateway.Provider);
        if (existing is not null) return existing;

        var result = await gateway.EnsureCustomerAsync(new CustomerInfo(user.Email, user.Name, user.Document, user.Phone));

        var customer = new GatewayCustomer
        {
            UserId = userId,
            Provider = gateway.Provider,
            GatewayCustomerId = result.CustomerId,
            Email = result.Email,
            Name = result.Name ?? user.Name,
            TaxId = result.TaxId ?? user.Document,
            Cellphone = result.Cellphone ?? user.Phone,
        };
        await gatewayCustomerRepository.AddAsync(customer);

        // Sincroniza dados do cliente de volta no usuário (preenche o que estiver vazio).
        await SyncUserFromCustomerAsync(user, result);

        return customer;
    }

    private async Task SyncUserFromCustomerAsync(User user, GatewayCustomerResult result)
    {
        var changed = false;
        if (string.IsNullOrWhiteSpace(user.Document) && !string.IsNullOrWhiteSpace(result.TaxId))
        {
            user.Document = result.TaxId;
            changed = true;
        }
        if (string.IsNullOrWhiteSpace(user.Phone) && !string.IsNullOrWhiteSpace(result.Cellphone))
        {
            user.Phone = result.Cellphone;
            changed = true;
        }
        if (!changed) return;

        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);
    }

    private static PlanResponse MapPlan(Plan p) => new(
        p.Id,
        p.Name,
        p.Description,
        p.PriceCents / 100m,
        PlanJson.ReadEntitlements(p.EntitledModulesJson),
        PlanJson.ReadLimits(p.LimitsJson),
        p.Slug);
}
