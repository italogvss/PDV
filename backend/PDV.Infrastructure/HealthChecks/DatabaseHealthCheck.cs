using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.HealthChecks;

// Saúde do MySQL: a aplicação inteira depende dele, então Unhealthy aqui = API fora.
public class DatabaseHealthCheck(AppDbContext context) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context_, CancellationToken cancellationToken = default)
    {
        try
        {
            return await context.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy("Conexão com o MySQL OK.")
                : HealthCheckResult.Unhealthy("Não foi possível conectar ao MySQL.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Falha ao consultar o MySQL.", ex);
        }
    }
}
