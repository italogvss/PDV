namespace PDV.Application.DTOs.Expenses;

public record ExpenseResponse(
    Guid Id,
    string Description,
    decimal Amount,
    bool IsRecurring,
    DateTime DueDate,
    bool IsPaid,
    DateTime? PaidAt,
    DateTime CreatedAt
);
