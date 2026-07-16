using Microsoft.Extensions.Logging;
using PDV.Application.DTOs.Account;
using PDV.Application.DTOs.Subscriptions;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class AccountDeletionService(
    IUserContext userContext,
    IUserRepository userRepository,
    ISubscriptionRepository subscriptionRepository,
    ISubscriptionService subscriptionService,
    IDataRetentionRepository retentionRepository,
    IAccountDeletionRepository accountDeletionRepository,
    ILogger<AccountDeletionService> logger) : IAccountDeletionService
{
    public async Task<AccountDeletionPreview> PreviewAsync()
    {
        var sub = await subscriptionRepository.GetByUserIdAsync(userContext.UserId);
        var now = DateTime.UtcNow;

        var isActive = sub?.Status == SubscriptionStatus.Active;
        var withinRefundWindow = isActive && IsWithinRefundWindow(sub!, now);
        var canScheduleAtPeriodEnd = isActive && !withinRefundWindow
            && sub!.CurrentPeriodEnd is DateTime end && end > now;

        return new AccountDeletionPreview(
            SubscriptionStatus: sub?.Status.ToString() ?? "None",
            CurrentPeriodEnd: sub?.CurrentPeriodEnd,
            WithinRefundWindow: withinRefundWindow,
            RefundInProgress: sub?.Status == SubscriptionStatus.RefundRequested,
            CanScheduleAtPeriodEnd: canScheduleAtPeriodEnd,
            GraceDays: RetentionDefaults.DeletionGraceDays);
    }

    public async Task<AccountDeletionResult> RequestAsync(RequestAccountDeletionRequest request)
    {
        var userId = userContext.UserId;
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        if (user.AccountDeletionRequestedAt is not null)
            throw new BusinessException("Já existe um pedido de exclusão de conta em andamento.");

        var sub = await subscriptionRepository.GetByUserIdAsync(userId);
        var now = DateTime.UtcNow;

        // Estorno em curso de um cancelamento anterior: bloquear até liquidar (lacuna #10).
        if (sub?.Status == SubscriptionStatus.RefundRequested)
            throw new BusinessException(
                "Há um reembolso em processamento. Aguarde a confirmação do estorno ou fale com o suporte antes de encerrar a conta.");

        // Cancela a assinatura viva reusando a matriz de cancelamento (trial / estorno em 7 dias / fim
        // do período). Assinatura já sem acesso (Expired/Canceled/None) não tem o que cancelar.
        CancelSubscriptionResult? cancelResult = null;
        if (sub is not null && sub.Status is SubscriptionStatus.Active or SubscriptionStatus.Trialing)
            cancelResult = await subscriptionService.CancelAsync();

        // Início da carência: "agendar p/ fim do plano" só vale quando o cancelamento preservou acesso
        // futuro (fora da janela de 7 dias). Trial e estorno cortam o acesso agora → só "excluir agora".
        var effectiveAt = now;
        if (request.Path == AccountDeletionPath.AtPeriodEnd)
        {
            if (cancelResult?.AccessUntil is DateTime accessUntil && accessUntil > now)
                effectiveAt = accessUntil;
            else
                throw new BusinessException("Não há período pago em vigência para agendar. Escolha excluir agora.");
        }

        var scheduledDeletionAt = effectiveAt.AddDays(RetentionDefaults.DeletionGraceDays);

        // Discriminador ANTES de agendar as lojas: a partir daqui o reconciliador de retenção respeita
        // o prazo explícito em vez de recalculá-lo pela assinatura.
        user.AccountDeletionRequestedAt = now;
        user.AccountDeletionEffectiveAt = effectiveAt;
        user.UpdatedAt = now;
        await userRepository.UpdateAsync(user);

        await retentionRepository.ScheduleAccountDeletionForOwnerAsync(userId, scheduledDeletionAt);

        var ledger = new AccountDeletion
        {
            UserId = userId,
            Scope = AccountDeletionScope.Account,
            Path = request.Path,
            Status = AccountDeletionStatus.Requested,
            RequestedAt = now,
            CarencyStartsAt = effectiveAt,
            ScheduledDeletionAt = scheduledDeletionAt,
            SubscriptionCanceled = cancelResult is not null,
            RefundRequested = cancelResult?.RefundRequested ?? false,
        };
        await accountDeletionRepository.AddAsync(ledger);

        logger.LogInformation(
            "Encerramento de conta solicitado: user {UserId}, path {Path}, carência inicia {EffectiveAt:o}, exclusão em {ScheduledDeletionAt:o}.",
            userId, request.Path, effectiveAt, scheduledDeletionAt);

        return new AccountDeletionResult(effectiveAt, scheduledDeletionAt, ledger.SubscriptionCanceled, ledger.RefundRequested);
    }

    public async Task CancelAsync()
    {
        var userId = userContext.UserId;
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        if (user.AccountDeletionRequestedAt is null)
            throw new BusinessException("Não há pedido de exclusão de conta para reverter.");

        var ledger = await accountDeletionRepository.GetActiveAccountRequestAsync(userId);
        var now = DateTime.UtcNow;
        if (ledger is null || ledger.ScheduledDeletionAt <= now)
            throw new BusinessException("O prazo de reversão da exclusão já venceu.");

        await retentionRepository.ClearAccountDeletionForOwnerAsync(userId);

        user.AccountDeletionRequestedAt = null;
        user.AccountDeletionEffectiveAt = null;
        user.UpdatedAt = now;
        await userRepository.UpdateAsync(user);

        ledger.Status = AccountDeletionStatus.Cancelled;
        ledger.UpdatedAt = now;
        await accountDeletionRepository.UpdateAsync(ledger);

        logger.LogInformation("Encerramento de conta revertido: user {UserId}.", userId);
    }

    public async Task<AccountDeletionStatusResponse> GetStatusAsync()
    {
        var userId = userContext.UserId;
        var user = await userRepository.GetByIdAsync(userId);
        var now = DateTime.UtcNow;

        var pending = user?.AccountDeletionRequestedAt is not null;
        var blocked = user?.AccountDeletionEffectiveAt is DateTime eff && eff <= now;
        var ledger = pending ? await accountDeletionRepository.GetActiveAccountRequestAsync(userId) : null;

        return new AccountDeletionStatusResponse(
            Pending: pending,
            RequestedAt: user?.AccountDeletionRequestedAt,
            EffectiveAt: user?.AccountDeletionEffectiveAt,
            ScheduledDeletionAt: ledger?.ScheduledDeletionAt,
            Blocked: blocked);
    }

    // Janela de arrependimento contada de StartedAt (o momento em que a assinatura paga passou a valer).
    private static bool IsWithinRefundWindow(Subscription sub, DateTime now) =>
        sub.StartedAt is DateTime started && now <= started.AddDays(RefundDefaults.WindowDays);
}
