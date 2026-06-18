using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IGatewayCustomerRepository
{
    Task<GatewayCustomer?> GetByUserIdAsync(Guid userId, string provider);
    Task AddAsync(GatewayCustomer customer);
    Task UpdateAsync(GatewayCustomer customer);
}
