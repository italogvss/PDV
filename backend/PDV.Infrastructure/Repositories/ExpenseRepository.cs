using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class ExpenseRepository(AppDbContext context, ITenantContext tenantContext) : IExpenseRepository
{
    public async Task<Expense?> GetByIdAsync(Guid id) =>
        await context.Expenses.FirstOrDefaultAsync(e => e.Id == id);

    public async Task<(IEnumerable<Expense> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize, int? month, int? year, bool? isPaid)
    {
        var query = context.Expenses.AsQueryable();

        if (month.HasValue)
            query = query.Where(e => e.DueDate.Month == month.Value);

        if (year.HasValue)
            query = query.Where(e => e.DueDate.Year == year.Value);

        if (isPaid.HasValue)
            query = query.Where(e => e.IsPaid == isPaid.Value);

        var total = await query.CountAsync();
        var data = await query
            .OrderByDescending(e => e.DueDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, total);
    }

    public async Task<IEnumerable<Expense>> GetInRangeAsync(DateTime start, DateTime end) =>
        await context.Expenses
            .Where(e => e.DueDate >= start && e.DueDate <= end)
            .ToListAsync();

    public async Task<IEnumerable<Expense>> GetRecurringUnpaidAsync() =>
        await context.Expenses
            .Where(e => e.IsRecurring && !e.IsPaid && e.DueDate <= DateTime.UtcNow.AddMonths(3))
            .OrderBy(e => e.DueDate)
            .ToListAsync();

    public async Task AddAsync(Expense expense)
    {
        await context.Expenses.AddAsync(expense);
        await context.SaveChangesAsync();
    }

    public async Task AddRangeAsync(IEnumerable<Expense> expenses)
    {
        await context.Expenses.AddRangeAsync(expenses);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Expense expense)
    {
        context.Expenses.Update(expense);
        await context.SaveChangesAsync();
    }

    // pode deletar, não precisa de historico
    public async Task DeleteAsync(Expense expense)
    {
        context.Expenses.Remove(expense);
        await context.SaveChangesAsync();
    }

    public async Task DeleteRangeAsync(IEnumerable<Expense> expenses)
    {
        context.Expenses.RemoveRange(expenses);
        await context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Expense>> GetSeriesFutureAsync(Guid seriesId, DateTime afterDueDate) =>
        await context.Expenses
            .Where(e => e.RecurringSeriesId == seriesId && e.DueDate > afterDueDate)
            .ToListAsync();

    public async Task<IEnumerable<Expense>> GetAllInSeriesAsync(Guid seriesId) =>
        await context.Expenses
            .Where(e => e.RecurringSeriesId == seriesId)
            .ToListAsync();

    // IgnoreQueryFilters: cross-tenant — necessário para o background service processar todos os tenants.
    public async Task<IEnumerable<Expense>> GetInfiniteSeriesLatestEntriesAsync()
    {
        var groups = await context.Expenses
            .IgnoreQueryFilters()
            .Where(e => e.IsRecurring && e.RepeatCount == null && e.RecurringSeriesId != null)
            .GroupBy(e => e.RecurringSeriesId)
            .Select(g => g.OrderByDescending(e => e.DueDate).First())
            .ToListAsync();
        return groups;
    }

    // IgnoreQueryFilters: remove TUDO do tenant (Expense usa hard-delete; não há soft-delete).
    // O filtro de TenantId é reaplicado manualmente para não vazar exclusão entre tenants.
    public Task<int> PurgeAllAsync() =>
        context.Expenses
            .IgnoreQueryFilters()
            .Where(e => e.TenantId == tenantContext.TenantId)
            .ExecuteDeleteAsync();

    // Remove a referência ao funcionário de todas as despesas vinculadas a ele — libera a
    // restrição FK antes do hard-delete do Employee e transforma as despesas em registros comuns.
    public Task ClearEmployeeReferenceAsync(Guid employeeId) =>
        context.Expenses
            .Where(e => e.EmployeeId == employeeId)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.EmployeeId, (Guid?)null));
}
