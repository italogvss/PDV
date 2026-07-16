using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Pipeline de exclusão em duas etapas (LGPD). Serviço scoped, usado pelos jobs de background.
//   STRIP  (fim da carência): hard-delete do que não tem base legal + limpeza física da mídia +
//          anonimização do cadastro mínimo (Customer/Employee/User). Mantém o Tenant e os dados
//          fiscais/transacionais como legal-hold. Como Sale/Expense/Customer/Employee têm FK CASCADE
//          para Tenant, o Tenant NÃO pode ser apagado aqui.
//   PURGE  (fim do legal-hold, 5 anos): hard-delete definitivo do que sobrou, inclusive o Tenant e o
//          User + cobrança.
public class DataDeletionService(
    AppDbContext db,
    IStorageService storage,
    ILogger<DataDeletionService> logger)
{
    // ---------------------------------------------------------------------
    // STRIP
    // ---------------------------------------------------------------------

    public async Task StripTenantAsync(Guid tenantId, DateTime now, CancellationToken ct)
    {
        // 1. Limpeza física da mídia (MinIO) antes de apagar as linhas MediaFile.
        await DeletePhysicalMediaAsync(tenantId, ct);

        // 2. Hard-delete do que não tem base de retenção. IgnoreQueryFilters: registros inativos/
        //    soft-deleted ficam ocultos pelos filtros globais.
        var appointmentIds = await db.Appointments.IgnoreQueryFilters()
            .Where(a => a.TenantId == tenantId).Select(a => a.Id).ToListAsync(ct);
        if (appointmentIds.Count > 0)
            await db.AppointmentServiceItems.Where(x => appointmentIds.Contains(x.AppointmentId)).ExecuteDeleteAsync(ct);
        await db.Appointments.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);

        await db.Products.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.ProductCategories.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Services.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.ServiceCategories.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Suppliers.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);

        var roleIds = await db.TenantRoles.IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantId).Select(r => r.Id).ToListAsync(ct);
        if (roleIds.Count > 0)
            await db.TenantRolePermissions.Where(x => roleIds.Contains(x.TenantRoleId)).ExecuteDeleteAsync(ct);
        await db.TenantRoles.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);

        await db.MediaFiles.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.UserTenants.Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);

        // 3. Anonimizar o cadastro mínimo retido (referenciado pelos registros fiscais). Mantém
        //    nome+documento; remove contato/endereço.
        await db.Customers.IgnoreQueryFilters().Where(c => c.TenantId == tenantId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.Phone, (string?)null)
                .SetProperty(c => c.Email, (string?)null)
                .SetProperty(c => c.Note, string.Empty)
                .SetProperty(c => c.AddressStreet, (string?)null)
                .SetProperty(c => c.AddressNumber, (string?)null)
                .SetProperty(c => c.AddressCity, (string?)null)
                .SetProperty(c => c.AddressState, (string?)null)
                .SetProperty(c => c.AddressZipCode, (string?)null)
                .SetProperty(c => c.UpdatedAt, now), ct);

        await db.Employees.IgnoreQueryFilters().Where(e => e.TenantId == tenantId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.UserEmail, string.Empty)
                .SetProperty(e => e.Phone, (string?)null)
                .SetProperty(e => e.ImageUrl, (string?)null)
                .SetProperty(e => e.UpdatedAt, now), ct);

        // 4. Legal-hold: retém Sale/SaleItem/Expense/EmployeeSalaryLink/TenantSettings + a linha do
        //    Tenant por 5 anos. Zera ScheduledDeletionAt (não reprocessar) e desativa a loja.
        var legalHoldUntil = now.Add(RetentionPolicy.RetentionFor(RetentionCategory.Transactional));
        await db.Tenants.IgnoreQueryFilters().Where(t => t.Id == tenantId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.ScheduledDeletionAt, (DateTime?)null)
                .SetProperty(t => t.LegalHoldUntil, legalHoldUntil)
                .SetProperty(t => t.IsActive, false)
                .SetProperty(t => t.UpdatedAt, now), ct);
    }

    public async Task StripAccountAsync(AccountDeletion ledger, IReadOnlyCollection<Guid> tenantIds, DateTime now, CancellationToken ct)
    {
        var userId = ledger.UserId;

        // Anonimiza o User in-place (mantém nome+documento — âncora dos registros fiscais retidos).
        // Não hard-delete: Payment tem FK Restrict para User; a linha só cai no purge de 5 anos.
        await db.Users.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Email, $"deleted+{userId}@deleted.invalid")
                .SetProperty(u => u.Username, (string?)null)
                .SetProperty(u => u.Phone, (string?)null)
                .SetProperty(u => u.ImageUrl, (string?)null)
                .SetProperty(u => u.BirthDate, (DateOnly?)null)
                .SetProperty(u => u.RefreshToken, (string?)null)
                .SetProperty(u => u.RefreshTokenExpiry, (DateTime?)null)
                .SetProperty(u => u.UpdatedAt, now), ct);

        // Credenciais e preferências: sem base de retenção → hard-delete.
        await db.LocalAuths.Where(x => x.UserId == userId).ExecuteDeleteAsync(ct);
        await db.ExternalAuths.Where(x => x.UserId == userId).ExecuteDeleteAsync(ct);
        await db.UserSettings.Where(x => x.UserId == userId).ExecuteDeleteAsync(ct);
        await db.UserSeenMarkers.Where(x => x.UserId == userId).ExecuteDeleteAsync(ct);

        // ContactMessages: mantém a mensagem p/ suporte, remove o vínculo pessoal (UserId).
        await db.ContactMessages.IgnoreQueryFilters().Where(x => x.UserId == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.UserId, Guid.Empty)
                .SetProperty(x => x.UpdatedAt, now), ct);

        // Ledger → Effected + prazo do expurgo final (5 anos). Atualização rastreada (Status tem
        // conversor enum→string).
        ledger.Status = AccountDeletionStatus.Effected;
        ledger.EffectedAt = now;
        ledger.PurgeAfter = now.Add(RetentionPolicy.RetentionFor(RetentionCategory.MinimalCadastral));
        ledger.TenantIdsJson = System.Text.Json.JsonSerializer.Serialize(tenantIds);
        ledger.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
    }

    // ---------------------------------------------------------------------
    // PURGE (fim do legal-hold, 5 anos)
    // ---------------------------------------------------------------------

    // Hard-delete definitivo de tudo o que sobrou do tenant + a própria linha do Tenant, em ordem
    // reversa de dependência FK. ContactMessages permanecem (anonimizados, suporte).
    public async Task PurgeTenantAsync(Guid tenantId, CancellationToken ct)
    {
        var saleIds = await db.Sales.IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId).Select(s => s.Id).ToListAsync(ct);
        if (saleIds.Count > 0)
            await db.SaleItems.Where(x => saleIds.Contains(x.SaleId)).ExecuteDeleteAsync(ct);
        await db.Sales.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);

        await db.Expenses.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.EmployeeSalaryLinks.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.AuditLogs.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Customers.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Employees.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.UserTenants.Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.TenantSettings.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Tenants.IgnoreQueryFilters().Where(x => x.Id == tenantId).ExecuteDeleteAsync(ct);
    }

    // Hard-delete do User + cobrança. Payment tem FK Restrict → apagar ANTES do User.
    public async Task PurgeAccountAsync(AccountDeletion ledger, DateTime now, CancellationToken ct)
    {
        var userId = ledger.UserId;
        await db.Payments.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await db.Subscriptions.Where(s => s.UserId == userId).ExecuteDeleteAsync(ct);
        await db.GatewayCustomers.Where(g => g.UserId == userId).ExecuteDeleteAsync(ct);
        await db.Users.Where(u => u.Id == userId).ExecuteDeleteAsync(ct);

        ledger.Status = AccountDeletionStatus.Purged;
        ledger.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
    }

    // ---------------------------------------------------------------------

    private async Task DeletePhysicalMediaAsync(Guid tenantId, CancellationToken ct)
    {
        var files = await db.MediaFiles.IgnoreQueryFilters()
            .Where(m => m.TenantId == tenantId)
            .Select(m => new { m.Category, m.RelativePath })
            .ToListAsync(ct);

        foreach (var f in files)
        {
            // URLs absolutas (ex.: avatar do Google) não são objetos do MinIO.
            if (string.IsNullOrWhiteSpace(f.RelativePath) || MediaPathHelper.IsAbsoluteUrl(f.RelativePath))
                continue;
            try
            {
                await storage.DeleteAsync(MediaPathHelper.GetBucket(f.Category), f.RelativePath, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Falha ao apagar mídia {Path} do tenant {TenantId}.", f.RelativePath, tenantId);
            }
        }
    }
}
