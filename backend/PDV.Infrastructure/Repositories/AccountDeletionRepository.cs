using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class AccountDeletionRepository(AppDbContext context) : IAccountDeletionRepository
{
    public async Task AddAsync(AccountDeletion entry)
    {
        await context.AccountDeletions.AddAsync(entry);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(AccountDeletion entry)
    {
        context.AccountDeletions.Update(entry);
        await context.SaveChangesAsync();
    }

    public Task<AccountDeletion?> GetActiveAccountRequestAsync(Guid userId) =>
        context.AccountDeletions
            .Where(a => a.UserId == userId
                && a.Scope == AccountDeletionScope.Account
                && a.Status == AccountDeletionStatus.Requested)
            .OrderByDescending(a => a.RequestedAt)
            .FirstOrDefaultAsync();
}
