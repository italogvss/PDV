using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByExternalAuthAsync(string provider, string providerId);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByRefreshTokenAsync(string hashedRefreshToken);

    // Projeção leve do início da carência de exclusão (sem carregar o User inteiro) — usada pelo
    // AccountDeletionBlockMiddleware em todo request autenticado. null = sem exclusão pendente.
    Task<DateTime?> GetAccountDeletionEffectiveAtAsync(Guid userId);

    Task AddAsync(User user);
    Task UpdateAsync(User user);
}
