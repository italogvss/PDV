using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface ICustomerRepository
{
    Task<Customer?> GetByIdAsync(Guid id);
    Task<(IEnumerable<Customer> Data, int TotalCount)> GetAllAsync(int page, int pageSize, string? search);
    Task AddAsync(Customer customer);
    Task UpdateAsync(Customer customer);
}
