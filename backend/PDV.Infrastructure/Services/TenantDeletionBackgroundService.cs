using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PDV.Domain.Enums;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Etapa "strip" do pipeline de exclusão (fim da carência). Varre diariamente:
//   1. Contas com exclusão vencida (AccountDeletion.Requested, ScheduledDeletionAt <= now) → anonimiza
//      o User e faz o strip de todas as lojas do Owner.
//   2. Lojas restantes com ScheduledDeletionAt vencido (retenção passiva / encerramento de loja
//      avulsa) → strip da loja.
// O strip NÃO apaga o Tenant nem os dados fiscais: eles ficam em legal-hold (Tenant.LegalHoldUntil)
// por 5 anos, e o DataPurgeBackgroundService faz o hard-delete definitivo depois.
public class TenantDeletionBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<TenantDeletionBackgroundService> logger) : BackgroundService
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

            // 1. Encerramento de conta: anonimiza o User + strip de todas as lojas do Owner.
            var dueAccounts = await db.AccountDeletions
                .Where(a => a.Status == AccountDeletionStatus.Requested && a.ScheduledDeletionAt <= now)
                .ToListAsync(ct);

            foreach (var ledger in dueAccounts)
            {
                // Captura as lojas ANTES do strip (que apaga os vínculos UserTenant).
                var tenantIds = await db.UserTenants
                    .Where(ut => ut.UserId == ledger.UserId && ut.Role == UserRole.Owner)
                    .Select(ut => ut.TenantId)
                    .ToListAsync(ct);

                foreach (var tenantId in tenantIds)
                    await pipeline.StripTenantAsync(tenantId, now, ct);

                await pipeline.StripAccountAsync(ledger, tenantIds, now, ct);
                logger.LogInformation(
                    "Encerramento de conta efetivado: user {UserId} anonimizado; {Count} loja(s) em legal-hold.",
                    ledger.UserId, tenantIds.Count);
            }

            // 2. Lojas restantes (o strip acima já zerou o ScheduledDeletionAt das lojas de conta).
            var dueTenants = await db.Tenants
                .IgnoreQueryFilters()
                .Where(t => t.ScheduledDeletionAt != null && t.ScheduledDeletionAt <= now)
                .Select(t => t.Id)
                .ToListAsync(ct);

            foreach (var tenantId in dueTenants)
            {
                await pipeline.StripTenantAsync(tenantId, now, ct);
                logger.LogInformation("Loja {TenantId} em legal-hold (dados fiscais retidos por 5 anos).", tenantId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao executar o strip de exclusão agendada.");
        }
    }
}
