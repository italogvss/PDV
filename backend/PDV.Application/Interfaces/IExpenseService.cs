using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Expenses;

namespace PDV.Application.Interfaces;

public interface IExpenseService
{
    Task<PaginatedResponse<ExpenseResponse>> GetAllAsync(int page, int pageSize, int? month, int? year, bool? isPaid);
    Task<IEnumerable<ExpenseResponse>> GetRecurringUnpaidAsync();
    Task<List<ExpenseChartPoint>> GetChartAsync(DateTime startDate, DateTime endDate, string groupBy);
    Task<ExpenseResponse> GetByIdAsync(Guid id);
    Task<ExpenseResponse> CreateAsync(CreateExpenseRequest request);
    Task<ExpenseResponse> UpdateAsync(Guid id, UpdateExpenseRequest request);
    Task<ExpenseResponse> MarkAsPaidAsync(Guid id);
    Task DeleteAsync(Guid id);
}
