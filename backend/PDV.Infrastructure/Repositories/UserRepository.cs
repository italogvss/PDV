using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class UserRepository(AppDbContext context) : IUserRepository
{
    private IQueryable<User> WithIncludes() =>
        context.Users
            .AsSplitQuery()
            .Include(u => u.ExternalLogins)
            .Include(u => u.LocalAuth)
            .Include(u => u.Settings)
            .Include(u => u.UserTenants)
                .ThenInclude(ut => ut.Tenant)
                    .ThenInclude(t => t.Settings);

    public Task<User?> GetByIdAsync(Guid id) =>
        WithIncludes().FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByExternalAuthAsync(string provider, string providerId) =>
        WithIncludes().FirstOrDefaultAsync(u =>
            u.ExternalLogins.Any(e => e.Provider == provider && e.ProviderId == providerId));

    public Task<User?> GetByEmailAsync(string email) =>
        WithIncludes().FirstOrDefaultAsync(u => u.Email == email);

    public Task<User?> GetByRefreshTokenAsync(string hashedRefreshToken) =>
        WithIncludes().FirstOrDefaultAsync(u => u.RefreshToken == hashedRefreshToken);

    public async Task AddAsync(User user)
    {
        context.Users.Add(user);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
         context.Entry(user).State = EntityState.Modified;
        await context.SaveChangesAsync();
    }
}
