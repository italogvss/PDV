using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IContactMessageRepository
{
    Task AddAsync(ContactMessage message);
}
