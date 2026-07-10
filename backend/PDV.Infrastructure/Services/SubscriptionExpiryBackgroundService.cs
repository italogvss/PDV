using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PDV.Domain.Constants;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

// Varre periodicamente as assinaturas vencidas (canceladas pós-período, trials PDV-side expirados e
// checkouts Pending abandonados), marca-as como Expired e reconcilia a retenção de dados das lojas.
// Resolve os repositórios num scope próprio (BackgroundService é singleton; o repo/DbContext é scoped).
public class SubscriptionExpiryBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<SubscriptionExpiryBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            await RunOnceAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<ISubscriptionRepository>();
            var paymentRepo = scope.ServiceProvider.GetRequiredService<IPaymentRepository>();
            var retentionRepo = scope.ServiceProvider.GetRequiredService<IDataRetentionRepository>();

            var now = DateTime.UtcNow;

            var expiredCanceled = await repo.ExpireCanceledPastPeriodAsync(now);
            if (expiredCanceled > 0)
                logger.LogInformation("Assinaturas canceladas expiradas por vencimento: {Count}", expiredCanceled);

            var expiredTrials = await repo.ExpireTrialingPastEndAsync(now);
            if (expiredTrials > 0)
                logger.LogInformation("Trials expirados por vencimento: {Count}", expiredTrials);

            var pendingCutoff = now.AddHours(-CheckoutDefaults.PendingTtlHours);
            var expiredPending = await repo.ExpireStalePendingAsync(pendingCutoff);
            if (expiredPending > 0)
                logger.LogInformation("Checkouts Pending órfãos expirados: {Count}", expiredPending);

            var canceledPayments = await paymentRepo.ExpireStalePendingAsync(pendingCutoff);
            if (canceledPayments > 0)
                logger.LogInformation("Cobranças Pending órfãs canceladas: {Count}", canceledPayments);

            // Só depois de expirar o que venceu: quem ficou sem acesso ganha data de exclusão, quem
            // voltou a ter plano tem o agendamento cancelado.
            var (scheduled, cleared) = await retentionRepo.SyncScheduledDeletionAsync(now, RetentionDefaults.DaysAfterAccessLoss);
            if (scheduled > 0 || cleared > 0)
                logger.LogInformation("Retenção reconciliada: {Scheduled} loja(s) agendada(s), {Cleared} liberada(s)", scheduled, cleared);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao expirar assinaturas vencidas.");
        }
    }
}
