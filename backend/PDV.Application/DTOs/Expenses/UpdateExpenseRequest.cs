namespace PDV.Application.DTOs.Expenses;

public record UpdateExpenseRequest(
    string Description,
    decimal Amount,
    bool IsRecurring,
    DateTime DueDate,
    bool IsPaid
);
