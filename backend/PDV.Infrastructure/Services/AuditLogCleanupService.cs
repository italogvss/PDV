using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PDV.Domain.Constants;
using PDV.Domain.Enums;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Limpeza da trilha de auditoria por CATEGORIA de retenção (RetentionPolicy), não por um prazo único:
//   - Registros de acesso (login/logout, Marco Civil art. 15) → 6 meses.
//   - Ações financeiras/destrutivas (SensitiveAudit) → 5 anos.
// Sem isso, um prazo único apagaria a auditoria sensível cedo demais (ou os registros de acesso
// tarde demais). Resolve o AppDbContext num scope próprio (BackgroundService é singleton).
public class AuditLogCleanupService(
    IServiceScopeFactory scopeFactory,
    ILogger<AuditLogCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

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
            var now = DateTime.UtcNow;

            // Agrupa as AuditActions por categoria de retenção e apaga cada grupo além do seu prazo.
            var byCategory = Enum.GetValues<AuditAction>()
                .GroupBy(RetentionPolicy.CategoryOf);

            var totalDeleted = 0;
            foreach (var group in byCategory)
            {
                var cutoff = now - RetentionPolicy.RetentionFor(group.Key);
                var actions = group.ToList();

                // IgnoreQueryFilters: limpeza global — registros de todos os tenants.
                var deleted = await db.AuditLogs
                    .IgnoreQueryFilters()
                    .Where(a => a.CreatedAt < cutoff && actions.Contains(a.Action))
                    .ExecuteDeleteAsync(ct);

                totalDeleted += deleted;
            }

            if (totalDeleted > 0)
                logger.LogInformation("AuditLogs expirados removidos: {Count}", totalDeleted);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao limpar AuditLogs antigos.");
        }
    }
}
