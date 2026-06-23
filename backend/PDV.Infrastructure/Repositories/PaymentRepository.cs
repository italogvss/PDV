using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
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

    // Remoção FÍSICA (não soft delete) dos pagamentos da assinatura — cancelamento em trial,
    // onde não há cobrança paga e o histórico não precisa ser preservado.
    public async Task DeleteBySubscriptionIdAsync(Guid subscriptionId) =>
        await context.Payments
            .Where(p => p.SubscriptionId == subscriptionId)
            .ExecuteDeleteAsync();

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
}
