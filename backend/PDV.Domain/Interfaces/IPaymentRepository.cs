using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IPaymentRepository
{
    Task AddAsync(Payment payment);
    Task UpdateAsync(Payment payment);
    Task<(IEnumerable<Payment> Data, int TotalCount)> GetByUserIdAsync(Guid userId, int page, int pageSize);
}
