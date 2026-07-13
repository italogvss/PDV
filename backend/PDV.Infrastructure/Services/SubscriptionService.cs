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
        // marca a mesma fatura como paga, então basta olhar a mais recente.
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

    // -----------------------------------------------------------------------
    // Checkout
    // -----------------------------------------------------------------------

    public async Task<StartCheckoutResponse> StartCheckoutAsync(StartCheckoutRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CompletionUrl) || string.IsNullOrWhiteSpace(request.ReturnUrl))
            throw new BusinessException("URLs de retorno do checkout não informadas.");

        var userId = userContext.UserId;
        var plan = await planRepository.GetByIdAsync(request.PlanId)
            ?? throw new NotFoundException("Plano não encontrado.");

        if (!await gateway.PriceExistsAsync(plan.ExternalProductId))
            throw new NotFoundException("Plano não encontrado.");

        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var existingSub = await subscriptionRepository.GetByUserIdAsync(userId);
        EnsureCanCheckout(existingSub);

        var customer = await EnsureCustomerAsync(userId, user);

        // Reassinar cria uma assinatura NOVA no gateway. Se a anterior ainda estiver viva lá (ex.: a
        // renovação falhou e o dunning segue tentando cobrar), o usuário acabaria com duas (RF-20).
        if (existingSub is not null) await DiscardGatewaySubscriptionAsync(existingSub);

        // Uma assinatura por usuário — reaproveita a linha existente (reativação/retry), RF-1/RF-21.
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
        // Uma contratação nova abre uma janela de reembolso nova — o webhook de ativação grava o
        // StartedAt. TrialEndsAt some: quem paga não carrega data de teste.
        sub.StartedAt = null;
        sub.TrialEndsAt = null;
        // A assinatura no gateway vai ser outra: a linha do tempo de eventos recomeça.
        sub.GatewaySyncedAt = null;
        // Marca o início da espera pelo gateway: é daqui que ExpireStalePendingAsync conta o TTL.
        // Sem isto, uma reativação nasceria "velha" e o job a expiraria no meio do checkout.
        sub.UpdatedAt = DateTime.UtcNow;

        var metadata = new Dictionary<string, string>
        {
            ["userId"] = userId.ToString(),
            ["planId"] = plan.Id.ToString(),
            ["subscriptionId"] = sub.Id.ToString(),
        };
        if (!string.IsNullOrWhiteSpace(request.CouponCode)) metadata["couponCode"] = request.CouponCode;

        var checkout = await gateway.CreateSubscriptionCheckoutAsync(new SubscriptionCheckoutRequest(
            plan.ExternalProductId, customer.GatewayCustomerId, sub.Id.ToString(),
            request.CouponCode, request.ReturnUrl, request.CompletionUrl, metadata));

        if (isNew) await subscriptionRepository.AddAsync(sub);
        else await subscriptionRepository.UpdateAsync(sub);

        // Nenhum Payment é criado aqui: o gateway só emite a fatura (e o id que a identifica) depois
        // que o pagamento acontece. O histórico nasce do webhook — e um checkout abandonado não
        // deixa lixo `Pending` para o job limpar.
        return new StartCheckoutResponse(checkout.Url);
    }

    // Encerra a recorrência anterior no gateway antes de abrir uma nova. Best-effort: se a assinatura
    // já tiver sido cancelada lá (cancelamento voluntário, esgotamento de tentativas, estorno), não
    // há nada a fazer — o que não pode é ficar uma recorrência viva cobrando.
    // Zerar o GatewaySubscriptionId também libera o índice único para o sub_ novo.
    private async Task DiscardGatewaySubscriptionAsync(Subscription sub)
    {
        if (!string.IsNullOrEmpty(sub.GatewaySubscriptionId))
        {
            try
            {
                await gateway.CancelSubscriptionAsync(sub.GatewaySubscriptionId);
            }
            catch (PaymentGatewayException ex)
            {
                logger.LogWarning(ex, "Assinatura {GatewaySubscriptionId} não pôde ser cancelada no gateway antes do novo checkout.",
                    sub.GatewaySubscriptionId);
            }
        }

        sub.GatewaySubscriptionId = null;
        // O agendamento morre com a assinatura que ele governava.
        sub.GatewayScheduleId = null;
    }

    // Bloqueia a cobrança dupla: assinatura viva e vigente não contrata de novo. Canceled/Expired/
    // Pending liberam (reativação/retry). RefundRequested aguarda o estorno se consumar — reassinar
    // antes disso faria o evento de estorno derrubar a assinatura nova (RF-19).
    private void EnsureCanCheckout(Subscription? sub)
    {
        if (sub is null) return;

        if (sub.Status == SubscriptionStatus.RefundRequested)
            throw new BusinessException(
                "Seu reembolso está sendo processado. " +
                "Assim que ele for concluído você poderá assinar novamente.");

        if (sub.Status is SubscriptionStatus.Active or SubscriptionStatus.Trialing
            && entitlementService.IsEntitled(sub))
        {
            var until = (sub.TrialEndsAt ?? sub.CurrentPeriodEnd)?.ToString("dd/MM/yyyy") ?? "breve";
            throw new BusinessException(
                $"Sua assinatura está ativa até {until}. " +
                "Aguarde o fim desse período para contratar novamente.");
        }
    }

    // -----------------------------------------------------------------------
    // Troca de plano
    // -----------------------------------------------------------------------

    // O que decide o comportamento de uma troca é uma única pergunta: o plano-alvo tira do usuário
    // algo que ele já pagou por este ciclo?
    //
    //   não  → upgrade. Vale agora, e o gateway cobra a diferença proporcional na hora.
    //   sim  → agendada. O plano vigente segue até a virada; lá o gateway começa a cobrar o novo.
    //
    // "Tirar algo" cobre dois casos (ver PlanChange): perder capability/limite, e encurtar o ciclo
    // de cobrança — trocar um anual já pago por um mensal hoje jogaria fora os meses restantes.
    private enum ChangeKind { Withdrawal, Trial, Upgrade, Scheduled }

    public async Task<ChangePlanResult> PreviewChangePlanAsync(ChangePlanRequest request)
    {
        var (sub, newPlan, kind) = await ResolveChangeAsync(request);

        return kind switch
        {
            ChangeKind.Withdrawal or ChangeKind.Trial =>
                new ChangePlanResult(newPlan.Name, Scheduled: false, EffectiveAt: null, NextChargeAt: null, AmountDueNowCents: 0),

            ChangeKind.Scheduled =>
                new ChangePlanResult(newPlan.Name, Scheduled: true, EffectiveAt: sub.CurrentPeriodEnd, NextChargeAt: sub.CurrentPeriodEnd, AmountDueNowCents: 0),

            _ => await PreviewUpgradeAsync(sub, newPlan),
        };
    }

    private async Task<ChangePlanResult> PreviewUpgradeAsync(Subscription sub, Plan newPlan)
    {
        var preview = await gateway.PreviewUpgradeAsync(sub.GatewaySubscriptionId!, newPlan.ExternalProductId);

        return new ChangePlanResult(
            newPlan.Name,
            Scheduled: false,
            EffectiveAt: DateTime.UtcNow,
            NextChargeAt: preview.NextChargeAt ?? sub.CurrentPeriodEnd,
            AmountDueNowCents: preview.AmountDueNowCents);
    }

    public async Task<ChangePlanResult> ChangePlanAsync(ChangePlanRequest request)
    {
        var (sub, newPlan, kind) = await ResolveChangeAsync(request);
        var now = DateTime.UtcNow;

        var result = kind switch
        {
            ChangeKind.Withdrawal => await WithdrawScheduledChangeAsync(sub, newPlan),
            ChangeKind.Trial => ChangePlanDuringTrial(sub, newPlan),
            ChangeKind.Scheduled => await ScheduleChangeAsync(sub, newPlan),
            _ => await UpgradeAsync(sub, newPlan, now),
        };

        sub.UpdatedAt = now;
        await subscriptionRepository.UpdateAsync(sub);

        logger.LogInformation("Assinatura {SubscriptionId}: troca para {PlanName} ({Kind}).", sub.Id, newPlan.Name, kind);
        return result;
    }

    // Valida uma vez as regras que preview e execução compartilham — assim o diálogo nunca oferece
    // uma troca que o POST recusaria.
    private async Task<(Subscription Sub, Plan NewPlan, ChangeKind Kind)> ResolveChangeAsync(ChangePlanRequest request)
    {
        var sub = await subscriptionRepository.GetByUserIdAsync(userContext.UserId)
            ?? throw new BusinessException("Nenhuma assinatura ativa para trocar.");

        // Troca só vale para assinatura viva — uma cancelada deve reativar via novo checkout (RF-32).
        if (sub.Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing))
            throw new BusinessException("Nenhuma assinatura ativa para trocar.");

        var newPlan = await planRepository.GetByIdAsync(request.PlanId)
            ?? throw new NotFoundException("Plano não encontrado.");

        // Reescolher o plano vigente com uma troca agendada = desistir dela (RF-35). Sem
        // agendamento, é erro.
        if (newPlan.Id == sub.PlanId)
        {
            if (sub.PendingPlanId is null) throw new BusinessException("Você já está neste plano.");
            return (sub, newPlan, ChangeKind.Withdrawal);
        }

        // Trial PDV-side: o gateway não conhece esta assinatura. Não há nada pago a preservar, então
        // nenhuma regra de upgrade/downgrade se aplica (RF-33).
        if (string.IsNullOrEmpty(sub.GatewaySubscriptionId))
        {
            if (sub.Status != SubscriptionStatus.Trialing)
                throw new BusinessException("Troca de plano disponível apenas para assinaturas já ativadas no gateway.");

            return (sub, newPlan, ChangeKind.Trial);
        }

        if (newPlan.Id == sub.PendingPlanId)
            throw new BusinessException("A troca para este plano já está agendada.");

        return (sub, newPlan, PlanChange.IsScheduled(sub.Plan, newPlan) ? ChangeKind.Scheduled : ChangeKind.Upgrade);
    }

    private async Task<ChangePlanResult> WithdrawScheduledChangeAsync(Subscription sub, Plan currentPlan)
    {
        await ReleaseScheduleAsync(sub);
        sub.PendingPlanId = null;

        logger.LogInformation("Assinatura {SubscriptionId}: troca agendada cancelada.", sub.Id);
        return new ChangePlanResult(currentPlan.Name, Scheduled: false, EffectiveAt: null, NextChargeAt: null, AmountDueNowCents: 0);
    }

    // As datas do trial ficam intactas e nada é cobrado — a escolha definitiva fica para a hora de
    // assinar (T6/P12).
    private static ChangePlanResult ChangePlanDuringTrial(Subscription sub, Plan newPlan)
    {
        sub.PlanId = newPlan.Id;
        return new ChangePlanResult(newPlan.Name, Scheduled: false, EffectiveAt: null, NextChargeAt: null, AmountDueNowCents: 0);
    }

    private async Task<ChangePlanResult> ScheduleChangeAsync(Subscription sub, Plan newPlan)
    {
        var scheduled = await gateway.ScheduleDowngradeAsync(sub.GatewaySubscriptionId!, newPlan.ExternalProductId);

        sub.PendingPlanId = newPlan.Id;
        sub.GatewayScheduleId = scheduled.ScheduleId;
        // O gateway é a fonte da data da virada — ele conhece o ciclo real da assinatura.
        sub.CurrentPeriodEnd = scheduled.EffectiveAt;

        return new ChangePlanResult(newPlan.Name, Scheduled: true, EffectiveAt: scheduled.EffectiveAt, NextChargeAt: scheduled.EffectiveAt, AmountDueNowCents: 0);
    }

    private async Task<ChangePlanResult> UpgradeAsync(Subscription sub, Plan newPlan, DateTime now)
    {
        // Subir de plano cancela a troca que estivesse agendada (RF-34) — e o gateway não altera os
        // itens de uma assinatura governada por um agendamento.
        await ReleaseScheduleAsync(sub);

        var upgraded = await gateway.UpgradeSubscriptionAsync(sub.GatewaySubscriptionId!, newPlan.ExternalProductId);

        sub.PlanId = newPlan.Id;
        sub.PendingPlanId = null;
        // Trocar para um plano de outro ciclo reancora o período: a resposta do gateway manda.
        sub.CurrentPeriodEnd = upgraded.CurrentPeriodEnd;

        return new ChangePlanResult(newPlan.Name, Scheduled: false, EffectiveAt: now, NextChargeAt: upgraded.CurrentPeriodEnd, AmountDueNowCents: upgraded.AmountDueNowCents);
    }

    // Best-effort: um agendamento já liberado (ou que virou sozinho) é o resultado desejado.
    private async Task ReleaseScheduleAsync(Subscription sub)
    {
        if (string.IsNullOrEmpty(sub.GatewayScheduleId)) return;

        try
        {
            await gateway.ReleaseScheduleAsync(sub.GatewayScheduleId);
        }
        catch (PaymentGatewayException ex)
        {
            logger.LogWarning(ex, "Agendamento {ScheduleId} não pôde ser liberado no gateway.", sub.GatewayScheduleId);
        }

        sub.GatewayScheduleId = null;
    }

    // -----------------------------------------------------------------------
    // Cancelamento
    // -----------------------------------------------------------------------

    public async Task<CancelSubscriptionResult> CancelAsync()
    {
        var userId = userContext.UserId;
        var sub = await subscriptionRepository.GetByUserIdAsync(userId)
            ?? throw new BusinessException("Nenhuma assinatura ativa para cancelar.");

        if (sub.Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing))
            throw new BusinessException("Nenhuma assinatura ativa para cancelar.");

        // Encerra a recorrência no gateway antes de qualquer coisa — impede a cobrança do próximo
        // ciclo mesmo que a persistência local falhe (RF-38). O webhook de cancelamento reconcilia.
        if (!string.IsNullOrEmpty(sub.GatewaySubscriptionId))
            await gateway.CancelSubscriptionAsync(sub.GatewaySubscriptionId);

        sub.GatewayScheduleId = null;
        sub.PendingPlanId = null;

        var now = DateTime.UtcNow;
        var result = sub.Status == SubscriptionStatus.Trialing
            ? CancelTrial(sub, now)
            : IsWithinRefundWindow(sub, now) ? await RequestRefundAsync(sub, now) : CancelAtPeriodEnd(sub, now);

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

    // Dentro da janela de arrependimento: a assinatura termina agora e o estorno é emitido. O estado
    // final (`Expired`) vem do webhook de estorno, quando o dinheiro efetivamente volta — até lá a
    // assinatura fica em `RefundRequested`, que bloqueia uma reassinatura (RF-19/RF-41).
    private async Task<CancelSubscriptionResult> RequestRefundAsync(Subscription sub, DateTime now)
    {
        sub.Status = SubscriptionStatus.RefundRequested;
        sub.CanceledAt = now;
        sub.CurrentPeriodEnd = now;

        await IssueRefundsAsync(sub);

        return new CancelSubscriptionResult("RefundRequested", RefundRequested: true, AccessUntil: null,
            DataAvailableUntil: now.AddDays(RetentionDefaults.DaysAfterAccessLoss));
    }

    // Estorna tudo o que entrou desde que ESTA assinatura passou a valer. Dentro de 7 dias não há
    // renovação, mas pode haver a fatura proporcional de um upgrade além da fatura inicial.
    //
    // Uma falha aqui não derruba o cancelamento: a recorrência já foi encerrada no gateway e a
    // assinatura fica em `RefundRequested` até alguém resolver o estorno — o log é o alarme.
    private async Task IssueRefundsAsync(Subscription sub)
    {
        if (sub.StartedAt is not DateTime startedAt) return;

        var charges = await paymentRepository.GetPaidBySubscriptionSinceAsync(sub.Id, startedAt);
        var refundable = charges.Where(c => c.AmountCents > 0).ToList();

        if (refundable.Count == 0)
        {
            logger.LogWarning(
                "Assinatura {SubscriptionId} cancelada dentro da janela de reembolso, mas nenhuma cobrança paga foi encontrada.",
                sub.Id);
            return;
        }

        foreach (var charge in refundable)
        {
            try
            {
                var refund = await gateway.RefundAsync(charge.GatewayChargeId);
                logger.LogInformation(
                    "Estorno {RefundId} ({Status}) emitido para a cobrança {ChargeId} da assinatura {SubscriptionId}.",
                    refund.RefundId, refund.Status, charge.GatewayChargeId, sub.Id);
            }
            catch (PaymentGatewayException ex)
            {
                logger.LogError(ex,
                    "Falha ao emitir o estorno da cobrança {ChargeId} (assinatura {SubscriptionId}). " +
                    "A assinatura segue em RefundRequested até o estorno ser resolvido no painel.",
                    charge.GatewayChargeId, sub.Id);
            }
        }
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
    // reabrem (X5); uma reativação sim, porque grava um StartedAt novo (X6).
    private static bool IsWithinRefundWindow(Subscription sub, DateTime now) =>
        RefundDeadlineOf(sub) is DateTime deadline && now <= deadline;

    private static DateTime? RefundDeadlineOf(Subscription sub) =>
        sub.StartedAt?.AddDays(RefundDefaults.WindowDays);

    // -----------------------------------------------------------------------
    // Cliente no gateway
    // -----------------------------------------------------------------------

    private async Task<GatewayCustomer> EnsureCustomerAsync(Guid userId, User user)
    {
        var existing = await gatewayCustomerRepository.GetByUserIdAsync(userId, gateway.Provider);
        if (existing is not null) return existing;

        var metadata = new Dictionary<string, string> { ["userId"] = userId.ToString() };
        var result = await gateway.EnsureCustomerAsync(
            new CustomerInfo(user.Email, user.Name, user.Document, user.Phone, metadata));

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

        // Sincroniza dados do cliente de volta no usuário (preenche o que estiver vazio) — RF-18.
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
