using Microsoft.Extensions.Diagnostics.HealthChecks;
using PDV.Application.Interfaces;

namespace PDV.Infrastructure.HealthChecks;

// Saúde do storage (MinIO/S3). Degraded, não Unhealthy: sem storage o app segue vendendo — só o
// upload/exibição de imagem quebra.
public class StorageHealthCheck(IStorageService storage) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            await storage.PingAsync(cancellationToken);
            return HealthCheckResult.Healthy("Storage acessível.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Degraded("Storage inacessível — uploads e imagens vão falhar.", ex);
        }
    }
}
