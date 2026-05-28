using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByExternalAuthAsync(string provider, string providerId);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByRefreshTokenAsync(string hashedRefreshToken);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
}
