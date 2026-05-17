namespace PDV.Application.DTOs.Expenses;

public record CreateExpenseRequest(
    string Description,
    decimal Amount,
    bool IsRecurring,
    DateTime DueDate,
    bool IsPaid
);
