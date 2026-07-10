using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class PaymentRepository(AppDbContext context) : IPaymentRepository
{
    public async Task AddAsync(Payment payment)
    {
        await context.Payments.AddAsync(payment);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Payment payment)
    {
        context.Payments.Update(payment);
        await context.SaveChangesAsync();
    }

    public async Task<Payment?> GetLatestBySubscriptionIdAsync(Guid subscriptionId) =>
        await context.Payments
            .Where(p => p.SubscriptionId == subscriptionId)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

    public async Task<(IEnumerable<Payment> Data, int TotalCount)> GetByUserIdAsync(Guid userId, int page, int pageSize)
    {
        var query = context.Payments.Where(p => p.UserId == userId).OrderByDescending(p => p.CreatedAt);

        var totalCount = await query.CountAsync();
        var data = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, totalCount);
    }

    // Cancela cobranças Pending órfãs (checkout iniciado e nunca confirmado pelo gateway).
    public async Task<int> ExpireStalePendingAsync(DateTime cutoff)
    {
        var due = await context.Payments
            .Where(p => p.Status == PaymentStatus.Pending && p.CreatedAt < cutoff)
            .ToListAsync();

        foreach (var payment in due)
        {
            payment.Status = PaymentStatus.Cancelled;
            payment.UpdatedAt = DateTime.UtcNow;
        }

        if (due.Count > 0) await context.SaveChangesAsync();
        return due.Count;
    }
}
