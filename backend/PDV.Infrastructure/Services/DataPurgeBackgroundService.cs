using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PDV.Domain.Constants;
using PDV.Domain.Enums;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Etapa "purge" do pipeline de exclusão (fim do legal-hold). Varre diariamente e faz o hard-delete
// definitivo do que já cumpriu o prazo de guarda legal:
//   1. Lojas com Tenant.LegalHoldUntil vencido (5 anos) → apaga tudo, inclusive a linha do Tenant.
//   2. Contas com AccountDeletion.PurgeAfter vencido (5 anos) → apaga o User + cobrança.
//   3. Housekeeping: WebhookEvents com mais de 90 dias.
public class DataPurgeBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<DataPurgeBackgroundService> logger) : BackgroundService
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
            var pipeline = scope.ServiceProvider.GetRequiredService<DataDeletionService>();
            var now = DateTime.UtcNow;

            // 1. Lojas com legal-hold vencido → hard-delete definitivo.
            var tenantIds = await db.Tenants
                .IgnoreQueryFilters()
                .Where(t => t.LegalHoldUntil != null && t.LegalHoldUntil <= now)
                .Select(t => t.Id)
                .ToListAsync(ct);

            foreach (var tenantId in tenantIds)
            {
                await pipeline.PurgeTenantAsync(tenantId, ct);
                logger.LogInformation("Loja {TenantId} expurgada definitivamente (fim do legal-hold).", tenantId);
            }

            // 2. Contas com legal-hold vencido → hard-delete do User + cobrança.
            var accounts = await db.AccountDeletions
                .Where(a => a.Status == AccountDeletionStatus.Effected && a.PurgeAfter != null && a.PurgeAfter <= now)
                .ToListAsync(ct);

            foreach (var ledger in accounts)
            {
                await pipeline.PurgeAccountAsync(ledger, now, ct);
                logger.LogInformation("Conta {UserId} expurgada definitivamente (fim do legal-hold).", ledger.UserId);
            }

            // 3. Housekeeping: WebhookEvents antigos (independe de exclusão de conta).
            var webhookCutoff = now - RetentionPolicy.RetentionFor(RetentionCategory.Housekeeping);
            var webhooks = await db.WebhookEvents
                .Where(w => w.CreatedAt < webhookCutoff)
                .ExecuteDeleteAsync(ct);
            if (webhooks > 0)
                logger.LogInformation("WebhookEvents antigos removidos (>90 dias): {Count}", webhooks);

            // 4. Registros de acesso (Marco Civil) além do prazo mínimo de 6 meses.
            var accessCutoff = now - RetentionPolicy.RetentionFor(RetentionCategory.AccessLog);
            var accessLogs = await db.AccessLogs
                .Where(a => a.CreatedAt < accessCutoff)
                .ExecuteDeleteAsync(ct);
            if (accessLogs > 0)
                logger.LogInformation("AccessLogs antigos removidos (>6 meses): {Count}", accessLogs);

            // 5. Housekeeping: logs de sistema (Serilog) além do prazo de diagnóstico.
            var systemLogCutoff = now.AddDays(-RetentionDefaults.SystemLogDays);
            var systemLogs = await db.SystemLogs
                .Where(l => l.CreatedAt < systemLogCutoff)
                .ExecuteDeleteAsync(ct);
            if (systemLogs > 0)
                logger.LogInformation("SystemLogs antigos removidos (>{Days} dias): {Count}",
                    RetentionDefaults.SystemLogDays, systemLogs);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao executar o purge de legal-hold vencido.");
        }
    }
}
