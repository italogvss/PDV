using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class ContactMessageRepository(AppDbContext context) : IContactMessageRepository
{
    public async Task AddAsync(ContactMessage message)
    {
        await context.ContactMessages.AddAsync(message);
        await context.SaveChangesAsync();
    }
}
