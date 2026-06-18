namespace PDV.Domain.Interfaces;

public interface IUserTenantRepository
{
    // UserId do Owner de um tenant (para resolver o entitlement da loja). Null se não houver.
    Task<Guid?> GetOwnerUserIdAsync(Guid tenantId);
}
