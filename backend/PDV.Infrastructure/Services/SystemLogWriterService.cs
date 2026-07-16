using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PDV.Domain.Entities;
using PDV.Infrastructure.Logging;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Consome a SystemLogQueue e grava os logs no banco em lote. Roda fora do pipeline de log de
// propósito: gravar no EF de dentro do sink causaria reentrância (o próprio EF loga).
//
// Acorda assim que chega o primeiro evento e drena o que já estiver na fila — sem timer, então um
// log solitário não fica preso esperando o próximo. Falha de escrita é engolida: logar o erro aqui
// realimentaria a fila, e perder log de diagnóstico nunca pode derrubar a aplicação.
public class SystemLogWriterService(IServiceScopeFactory scopeFactory, SystemLogQueue queue) : BackgroundService
{
    private const int BatchSize = 50;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var batch = new List<SystemLog>(BatchSize);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!await queue.WaitToReadAsync(stoppingToken)) break;

                while (batch.Count < BatchSize && queue.TryRead(out var log))
                    batch.Add(log);

                if (batch.Count == 0) continue;

                await FlushAsync(batch, stoppingToken);
                batch.Clear();
            }
            catch (OperationCanceledException)
            {
                break; // Shutdown normal.
            }
        }
    }

    private async Task FlushAsync(List<SystemLog> batch, CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.SystemLogs.AddRange(batch);
            await context.SaveChangesAsync(ct);
        }
        catch
        {
            // Silencioso por design (ver comentário da classe).
        }
    }
}
