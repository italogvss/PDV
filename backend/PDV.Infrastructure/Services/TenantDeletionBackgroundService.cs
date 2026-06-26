using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Varre diariamente os tenants com exclusão agendada vencida e apaga permanentemente todos
// os seus dados, exceto ContactMessages (preservados para suporte).
// IgnoreQueryFilters é obrigatório em todas as queries: o tenant está com IsActive = false
// e os registros de entidades com soft-delete ficam ocultos pelos filtros globais.
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

            // IgnoreQueryFilters: tenants inativos são ocultos pelos query filters globais
            var due = await db.Tenants
                .IgnoreQueryFilters()
                .Where(t => !t.IsActive && t.ScheduledDeletionAt != null && t.ScheduledDeletionAt <= DateTime.UtcNow)
                .Select(t => t.Id)
                .ToListAsync(ct);

            foreach (var tenantId in due)
            {
                await DeleteTenantDataAsync(db, tenantId, ct);
                logger.LogInformation("Tenant {TenantId} excluído permanentemente.", tenantId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao executar exclusão de tenants agendados.");
        }
    }

    private static async Task DeleteTenantDataAsync(AppDbContext db, Guid tenantId, CancellationToken ct)
    {
        // Deleção em ordem reversa de dependência FK.
        // IgnoreQueryFilters necessário em cada query — registros inativos são invisíveis pelos filtros globais.

        // AppointmentServiceItem não tem TenantId direto — filtra via AppointmentId
        var appointmentIds = await db.Appointments
            .IgnoreQueryFilters()
            .Where(a => a.TenantId == tenantId)
            .Select(a => a.Id)
            .ToListAsync(ct);

        if (appointmentIds.Count > 0)
        {
            await db.AppointmentServiceItems
                .Where(x => appointmentIds.Contains(x.AppointmentId))
                .ExecuteDeleteAsync(ct);
        }

        await db.Appointments
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        // SaleItem não tem TenantId direto — filtra via SaleId
        var saleIds = await db.Sales
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId)
            .Select(s => s.Id)
            .ToListAsync(ct);

        if (saleIds.Count > 0)
        {
            await db.SaleItems
                .Where(x => saleIds.Contains(x.SaleId))
                .ExecuteDeleteAsync(ct);
        }

        await db.Sales
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.Expenses
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.EmployeeSalaryLinks
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.MediaFiles
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.AuditLogs
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.Products
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.ProductCategories
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.Services
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.ServiceCategories
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.Customers
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.Suppliers
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        // TenantRolePermission não tem TenantId direto — filtra via TenantRoleId
        var roleIds = await db.TenantRoles
            .IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantId)
            .Select(r => r.Id)
            .ToListAsync(ct);

        if (roleIds.Count > 0)
        {
            await db.TenantRolePermissions
                .Where(x => roleIds.Contains(x.TenantRoleId))
                .ExecuteDeleteAsync(ct);
        }

        await db.TenantRoles
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.Employees
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.UserTenants
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        await db.TenantSettings
            .IgnoreQueryFilters()
            .Where(x => x.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);

        // ContactMessages NÃO são deletados — preservados para suporte interno.

        await db.Tenants
            .IgnoreQueryFilters()
            .Where(x => x.Id == tenantId)
            .ExecuteDeleteAsync(ct);
    }
}
