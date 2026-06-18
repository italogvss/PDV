using Microsoft.EntityFrameworkCore;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class UserTenantRepository(AppDbContext context) : IUserTenantRepository
{
    public async Task<Guid?> GetOwnerUserIdAsync(Guid tenantId)
    {
        // UserTenant não tem query filter — busca direta pelo vínculo Owner do tenant.
        var ownerId = await context.UserTenants
            .Where(ut => ut.TenantId == tenantId && ut.Role == UserRole.Owner)
            .Select(ut => (Guid?)ut.UserId)
            .FirstOrDefaultAsync();

        return ownerId;
    }
}
