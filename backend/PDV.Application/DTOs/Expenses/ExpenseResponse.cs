namespace PDV.Application.DTOs.Expenses;

public record ExpenseResponse(
    Guid Id,
    string Description,
    string Category,
    decimal Amount,
    bool IsRecurring,
    DateTime DueDate,
    bool IsPaid,
    DateTime? PaidAt,
    DateTime CreatedAt,
    int? RepeatCount = null,
    Guid? RecurringSeriesId = null
);
