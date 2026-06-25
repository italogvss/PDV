using FluentValidation;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Expenses;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class ExpenseService(
    IExpenseRepository repository,
    ITenantContext tenantContext,
    IValidator<CreateExpenseRequest> createValidator,
    IValidator<UpdateExpenseRequest> updateValidator) : IExpenseService
{
    public async Task<PaginatedResponse<ExpenseResponse>> GetAllAsync(
        int page, int pageSize, int? month, int? year, bool? isPaid)
    {
        var (data, totalCount) = await repository.GetAllAsync(page, pageSize, month, year, isPaid);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        return new PaginatedResponse<ExpenseResponse>(data.Select(Map), page, pageSize, totalCount, totalPages);
    }

    public async Task<IEnumerable<ExpenseResponse>> GetRecurringUnpaidAsync()
    {
        var data = await repository.GetRecurringUnpaidAsync();
        return data.Select(Map);
    }

    public async Task<List<ExpenseChartPoint>> GetChartAsync(DateTime startDate, DateTime endDate, string groupBy)
    {
        var start = startDate.Date;
        var end   = endDate.Date.AddDays(1).AddTicks(-1);

        var expenses = await repository.GetInRangeAsync(start, end);

        return groupBy.ToLower() switch
        {
            "day" => FillDays(
                expenses.GroupBy(e => e.DueDate.Date)
                        .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount)),
                startDate.Date, endDate.Date),

            "week" => FillWeeks(
                expenses.GroupBy(e => GetMonday(e.DueDate))
                        .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount)),
                GetMonday(startDate), GetMonday(endDate)),

            "month" => FillMonths(
                expenses.GroupBy(e => new DateTime(e.DueDate.Year, e.DueDate.Month, 1))
                        .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount)),
                new DateTime(startDate.Year, startDate.Month, 1),
                new DateTime(endDate.Year, endDate.Month, 1)),

            "year" => FillYears(
                expenses.GroupBy(e => e.DueDate.Year)
                        .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount)),
                startDate.Year, endDate.Year),

            _ => throw new BusinessException("Parâmetro groupBy inválido. Use: day, week, month ou year.")
        };
    }

    public async Task<ExpenseResponse> GetByIdAsync(Guid id)
    {
        var expense = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Despesa não encontrada.");
        return Map(expense);
    }

    public async Task<ExpenseResponse> CreateAsync(CreateExpenseRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var dueDate = DateTime.SpecifyKind(request.DueDate, DateTimeKind.Utc);
        var seriesId = request.IsRecurring ? Guid.NewGuid() : (Guid?)null;

        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            TenantId = tenantContext.TenantId,
            Description = request.Description,
            Category = Enum.Parse<ExpenseCategory>(request.Category),
            Amount = request.Amount,
            IsRecurring = request.IsRecurring,
            RepeatCount = request.RepeatCount,
            RecurringSeriesId = seriesId,
            DueDate = dueDate,
            IsPaid = request.IsPaid,
            PaidAt = request.IsPaid ? DateTime.UtcNow : null,
            CreatedAt = DateTime.UtcNow
        };

        await repository.AddAsync(expense);

        // Pré-criar todas as entradas futuras para séries finitas
        if (request.IsRecurring && request.RepeatCount.HasValue && request.RepeatCount.Value > 0)
        {
            var futures = Enumerable.Range(1, request.RepeatCount.Value).Select(i => new Expense
            {
                Id = Guid.NewGuid(),
                TenantId = expense.TenantId,
                RecurringSeriesId = seriesId,
                Description = expense.Description,
                Category = expense.Category,
                Amount = expense.Amount,
                IsRecurring = true,
                RepeatCount = request.RepeatCount.Value - i,
                DueDate = dueDate.AddMonths(i),
                IsPaid = false,
                PaidAt = null,
                CreatedAt = DateTime.UtcNow,
            }).ToList();
            await repository.AddRangeAsync(futures);
        }

        return Map(expense);
    }

    public async Task<ExpenseResponse> UpdateAsync(Guid id, UpdateExpenseRequest request)
    {
        await updateValidator.ValidateAndThrowAsync(request);

        var expense = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Despesa não encontrada.");

        expense.Description = request.Description;
        expense.Category = Enum.Parse<ExpenseCategory>(request.Category);
        expense.Amount = request.Amount;
        expense.IsRecurring = request.IsRecurring;
        expense.RepeatCount = request.RepeatCount;
        expense.DueDate = DateTime.SpecifyKind(request.DueDate, DateTimeKind.Utc);
        // RecurringSeriesId nunca é alterado por update — pertence à série original

        if (!expense.IsPaid && request.IsPaid)
            expense.PaidAt = DateTime.UtcNow;
        else if (!request.IsPaid)
            expense.PaidAt = null;

        expense.IsPaid = request.IsPaid;

        await repository.UpdateAsync(expense);
        return Map(expense);
    }

    public async Task<ExpenseResponse> MarkAsPaidAsync(Guid id)
    {
        var expense = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Despesa não encontrada.");

        if (expense.IsPaid)
            throw new BusinessException("Despesa já está marcada como paga.");

        expense.IsPaid = true;
        expense.PaidAt = DateTime.UtcNow;
        await repository.UpdateAsync(expense);

        return Map(expense);
    }

    public async Task DeleteAsync(Guid id, string scope = "single")
    {
        var expense = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Despesa não encontrada.");

        if (expense.EmployeeId != null)
            throw new BusinessException("Esta despesa está vinculada ao salário de um funcionário e não pode ser excluída manualmente.");

        switch (scope.ToLowerInvariant())
        {
            case "future":
                if (expense.RecurringSeriesId == null)
                    throw new BusinessException("Esta despesa não pertence a uma série recorrente.");
                var future = await repository.GetSeriesFutureAsync(expense.RecurringSeriesId.Value, expense.DueDate);
                await repository.DeleteRangeAsync(future);
                break;
            case "all":
                if (expense.RecurringSeriesId == null)
                    throw new BusinessException("Esta despesa não pertence a uma série recorrente.");
                var all = await repository.GetAllInSeriesAsync(expense.RecurringSeriesId.Value);
                await repository.DeleteRangeAsync(all);
                break;
            default:
                await repository.DeleteAsync(expense);
                break;
        }
    }

    public Task<int> PurgeAllAsync() => repository.PurgeAllAsync();

    private static ExpenseResponse Map(Expense e) =>
        new(e.Id, e.Description, e.Category.ToString(), e.Amount, e.IsRecurring, e.DueDate, e.IsPaid, e.PaidAt, e.CreatedAt, e.RepeatCount, e.RecurringSeriesId, e.EmployeeId);

    // ─── Chart helpers ────────────────────────────────────────────────────────

    private static List<ExpenseChartPoint> FillDays(
        Dictionary<DateTime, decimal> data, DateTime start, DateTime end)
    {
        var result = new List<ExpenseChartPoint>();
        for (var d = start; d <= end; d = d.AddDays(1))
            result.Add(new(d.ToString("dd/MM/yy"), data.GetValueOrDefault(d)));
        return result;
    }

    private static List<ExpenseChartPoint> FillWeeks(
        Dictionary<DateTime, decimal> data, DateTime start, DateTime end)
    {
        var result = new List<ExpenseChartPoint>();
        for (var d = start; d <= end; d = d.AddDays(7))
            result.Add(new(d.ToString("dd/MM/yy"), data.GetValueOrDefault(d)));
        return result;
    }

    private static List<ExpenseChartPoint> FillMonths(
        Dictionary<DateTime, decimal> data, DateTime start, DateTime end)
    {
        string[] months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                           "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        var result = new List<ExpenseChartPoint>();
        for (var d = start; d <= end; d = d.AddMonths(1))
            result.Add(new($"{months[d.Month - 1]}/{d.Year}", data.GetValueOrDefault(d)));
        return result;
    }

    private static List<ExpenseChartPoint> FillYears(
        Dictionary<int, decimal> data, int start, int end) =>
        Enumerable.Range(start, end - start + 1)
            .Select(y => new ExpenseChartPoint(y.ToString(), data.GetValueOrDefault(y)))
            .ToList();

    private static DateTime GetMonday(DateTime date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-diff).Date;
    }
}
