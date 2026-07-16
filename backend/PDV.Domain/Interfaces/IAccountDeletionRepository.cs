using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

// Ledger de encerramento de conta/loja. Scoped por UserId — sem query filter de tenant.
public interface IAccountDeletionRepository
{
    Task AddAsync(AccountDeletion entry);
    Task UpdateAsync(AccountDeletion entry);

    // Pedido de conta em curso do Owner (Status = Requested, escopo Account). null se não houver.
    Task<AccountDeletion?> GetActiveAccountRequestAsync(Guid userId);
}
