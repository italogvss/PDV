using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

// Announcement é GLOBAL (sem query filter); UserSeenMarker é scoped por UserId — filtro explícito.
public class AnnouncementRepository(AppDbContext context) : IAnnouncementRepository
{
    public async Task<IReadOnlyList<Announcement>> GetActiveAsync(DateTime now) =>
        await context.Announcements
            .AsNoTracking()
            .Where(a => a.IsActive
                && (a.PublishAt == null || a.PublishAt <= now)
                && (a.ExpiresAt == null || a.ExpiresAt > now))
            .OrderByDescending(a => a.Priority)
            .ThenByDescending(a => a.PublishAt ?? a.CreatedAt)
            .ToListAsync();

    public async Task<IReadOnlyList<string>> GetSeenKeysAsync(Guid userId) =>
        await context.UserSeenMarkers
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => m.Key)
            .ToListAsync();

    public async Task AddSeenMarkerAsync(Guid userId, string key)
    {
        var exists = await context.UserSeenMarkers
            .AnyAsync(m => m.UserId == userId && m.Key == key);
        if (exists) return;

        await context.UserSeenMarkers.AddAsync(new UserSeenMarker
        {
            UserId = userId,
            Key = key,
            SeenAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();
    }
}
