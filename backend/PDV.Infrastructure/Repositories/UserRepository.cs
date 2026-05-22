using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class UserRepository(AppDbContext context) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id) =>
        context.Users
            .Include(u => u.UserTenants)
                .ThenInclude(ut => ut.Tenant)
            .FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByGoogleIdAsync(string googleId) =>
        context.Users
            .Include(u => u.UserTenants)
                .ThenInclude(ut => ut.Tenant)
            .FirstOrDefaultAsync(u => u.GoogleId == googleId);

    public Task<User?> GetByEmailAsync(string email) =>
        context.Users
            .Include(u => u.UserTenants)
                .ThenInclude(ut => ut.Tenant)
            .FirstOrDefaultAsync(u => u.Email == email);

    public Task<User?> GetByRefreshTokenAsync(string hashedRefreshToken) =>
        context.Users
            .Include(u => u.UserTenants)
                .ThenInclude(ut => ut.Tenant)
            .FirstOrDefaultAsync(u => u.RefreshToken == hashedRefreshToken);

    public async Task AddAsync(User user)
    {
        context.Users.Add(user);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
        context.Users.Update(user);
        await context.SaveChangesAsync();
    }
}
