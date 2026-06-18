using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class GatewayCustomerRepository(AppDbContext context) : IGatewayCustomerRepository
{
    public async Task<GatewayCustomer?> GetByUserIdAsync(Guid userId, string provider) =>
        await context.GatewayCustomers
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Provider == provider && c.IsActive);

    public async Task AddAsync(GatewayCustomer customer)
    {
        await context.GatewayCustomers.AddAsync(customer);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(GatewayCustomer customer)
    {
        context.GatewayCustomers.Update(customer);
        await context.SaveChangesAsync();
    }
}
