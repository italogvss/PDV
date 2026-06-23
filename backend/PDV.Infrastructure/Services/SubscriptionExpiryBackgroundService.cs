using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

// Varre periodicamente as assinaturas canceladas cujo período já terminou e as marca como Expired.
// Resolve o repositório num scope próprio (BackgroundService é singleton; o repo/DbContext é scoped).
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

            var expired = await repo.ExpireCanceledPastPeriodAsync(DateTime.UtcNow);
            if (expired > 0)
                logger.LogInformation("Assinaturas expiradas por vencimento: {Count}", expired);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao expirar assinaturas vencidas.");
        }
    }
}
