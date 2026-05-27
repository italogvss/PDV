namespace PDV.Application.DTOs.Expenses;

public record UpdateExpenseRequest(
    string Description,
    string Category,
    decimal Amount,
    bool IsRecurring,
    DateTime DueDate,
    bool IsPaid
);
