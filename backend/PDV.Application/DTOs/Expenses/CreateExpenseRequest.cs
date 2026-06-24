namespace PDV.Application.DTOs.Expenses;

public record CreateExpenseRequest(
    string Description,
    string Category,
    decimal Amount,
    bool IsRecurring,
    DateTime DueDate,
    bool IsPaid,
    int? RepeatCount = null
);
