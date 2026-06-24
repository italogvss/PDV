using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

// Cria automaticamente as próximas entradas de despesas recorrentes infinitas (sem repeatCount).
// Garante que sempre haverá entradas disponíveis até 2 meses à frente.
// Séries finitas (com repeatCount) são pré-criadas inteiramente no CreateAsync — este serviço não as toca.
public class RecurringExpenseRenewalService(
    IServiceScopeFactory scopeFactory,
    ILogger<RecurringExpenseRenewalService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RunOnceAsync(stoppingToken);
        using var timer = new PeriodicTimer(Interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await RunOnceAsync(stoppingToken);
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IExpenseRepository>();

            var horizon = DateTime.UtcNow.AddMonths(2);
            var latestEntries = await repo.GetInfiniteSeriesLatestEntriesAsync();
            var created = 0;

            foreach (var latest in latestEntries)
            {
                var current = latest;
                while (current.DueDate < horizon)
                {
                    var next = new Expense
                    {
                        Id = Guid.NewGuid(),
                        TenantId = current.TenantId,
                        RecurringSeriesId = current.RecurringSeriesId,
                        Description = current.Description,
                        Category = current.Category,
                        Amount = current.Amount,
                        IsRecurring = true,
                        RepeatCount = null,
                        DueDate = current.DueDate.AddMonths(1),
                        IsPaid = false,
                        PaidAt = null,
                        CreatedAt = DateTime.UtcNow,
                    };
                    await repo.AddAsync(next);
                    current = next;
                    created++;
                }
            }

            if (created > 0)
                logger.LogInformation("Despesas recorrentes criadas automaticamente: {Count}", created);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao renovar despesas recorrentes.");
        }
    }
}
