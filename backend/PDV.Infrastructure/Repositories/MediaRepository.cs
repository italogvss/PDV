using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class MediaRepository(AppDbContext context, ITenantContext tenantContext) : IMediaRepository
{
    public async Task<MediaFile?> GetActiveAsync(MediaCategory category, Guid entityId) =>
        await context.MediaFiles
            .FirstOrDefaultAsync(m => m.Category == category && m.EntityId == entityId);

    public async Task AddAsync(MediaFile media)
    {
        await context.MediaFiles.AddAsync(media);
        await context.SaveChangesAsync();
    }

    public async Task SoftDeleteAsync(MediaFile media)
    {
        media.IsActive = false;
        media.UpdatedAt = DateTime.UtcNow;
        context.MediaFiles.Update(media);
        await context.SaveChangesAsync();
    }

    public async Task<bool> SetEntityImageAsync(MediaCategory category, Guid entityId, string? relativePath)
    {
        var now = DateTime.UtcNow;

        switch (category)
        {
            case MediaCategory.Product:
                var product = await context.Products.FirstOrDefaultAsync(p => p.Id == entityId);
                if (product is null) return false;
                product.ImageUrl = relativePath;
                product.UpdatedAt = now;
                break;

            case MediaCategory.Service:
                var service = await context.Services.FirstOrDefaultAsync(s => s.Id == entityId);
                if (service is null) return false;
                service.ImageUrl = relativePath;
                service.UpdatedAt = now;
                break;

            case MediaCategory.Tenant:
                // entityId é o próprio tenantId. TenantSettings não tem query filter global —
                // restringe explicitamente ao tenant atual para isolar entre tenants.
                if (entityId != tenantContext.TenantId) return false;
                var settings = await context.TenantSettings.FirstOrDefaultAsync(t => t.TenantId == entityId);
                if (settings is null) return false;
                settings.LogoUrl = relativePath;
                settings.UpdatedAt = now;
                break;

            case MediaCategory.Profile:
                // GUIDs não colidem entre tabelas: tenta Employee (isolado por query filter)
                // e, se não houver, o avatar do próprio usuário (exige vínculo com o tenant atual).
                var employee = await context.Employees.FirstOrDefaultAsync(e => e.Id == entityId);
                if (employee is not null)
                {
                    employee.ImageUrl = relativePath;
                    employee.UpdatedAt = now;
                    break;
                }

                var user = await context.Users.FirstOrDefaultAsync(u =>
                    u.Id == entityId &&
                    u.UserTenants.Any(ut => ut.TenantId == tenantContext.TenantId));
                if (user is null) return false;
                user.ImageUrl = relativePath;
                user.UpdatedAt = now;
                break;

            default:
                return false;
        }

        await context.SaveChangesAsync();
        return true;
    }
}
