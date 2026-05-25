using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class UserRepository(AppDbContext context) : IUserRepository
{
    private IQueryable<User> WithTenants() =>
        context.Users
        .Include(u => u.Settings)
            .Include(u => u.UserTenants)
                .ThenInclude(ut => ut.Tenant)
                    .ThenInclude(t => t.Settings);
                    

    public Task<User?> GetByIdAsync(Guid id) =>
        WithTenants().FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByGoogleIdAsync(string googleId) =>
        WithTenants().FirstOrDefaultAsync(u => u.GoogleId == googleId);

    public Task<User?> GetByEmailAsync(string email) =>
        WithTenants().FirstOrDefaultAsync(u => u.Email == email);

    public Task<User?> GetByRefreshTokenAsync(string hashedRefreshToken) =>
        WithTenants().FirstOrDefaultAsync(u => u.RefreshToken == hashedRefreshToken);

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
