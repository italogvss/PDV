using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Remove periodicamente AuditLogs com mais de 6 meses para evitar crescimento indefinido do banco.
// Resolve o AppDbContext num scope próprio (BackgroundService é singleton; o DbContext é scoped).
public class AuditLogCleanupService(
    IServiceScopeFactory scopeFactory,
    ILogger<AuditLogCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
    private static readonly TimeSpan Retention = TimeSpan.FromDays(180);

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
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var cutoff = DateTime.UtcNow - Retention;

            // IgnoreQueryFilters: limpeza global — precisa acessar registros de todos os tenants
            var deleted = await db.AuditLogs
                .IgnoreQueryFilters()
                .Where(a => a.CreatedAt < cutoff)
                .ExecuteDeleteAsync(ct);

            if (deleted > 0)
                logger.LogInformation("AuditLogs removidos (>6 meses): {Count}", deleted);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao limpar AuditLogs antigos.");
        }
    }
}
