using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IExpenseRepository
{
    Task<Expense?> GetByIdAsync(Guid id);
    Task<(IEnumerable<Expense> Data, int TotalCount)> GetAllAsync(int page, int pageSize, int? month, int? year, bool? isPaid);
    Task<IEnumerable<Expense>> GetRecurringUnpaidAsync();
    Task<IEnumerable<Expense>> GetInRangeAsync(DateTime start, DateTime end);
    Task AddAsync(Expense expense);
    Task AddRangeAsync(IEnumerable<Expense> expenses);
    Task UpdateAsync(Expense expense);
    Task DeleteAsync(Expense expense);
    Task DeleteRangeAsync(IEnumerable<Expense> expenses);
    Task<IEnumerable<Expense>> GetSeriesFutureAsync(Guid seriesId, DateTime afterDueDate);
    Task<IEnumerable<Expense>> GetAllInSeriesAsync(Guid seriesId);
    Task<IEnumerable<Expense>> GetInfiniteSeriesLatestEntriesAsync();
    Task<int> PurgeAllAsync();
    Task ClearEmployeeReferenceAsync(Guid employeeId);
}
