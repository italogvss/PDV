using FluentValidation;
using PDV.Application.DTOs.Expenses;
using PDV.Domain.Enums;

namespace PDV.Application.Validators;

public class UpdateExpenseRequestValidator : AbstractValidator<UpdateExpenseRequest>
{
    public UpdateExpenseRequestValidator()
    {
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Category)
            .NotEmpty()
            .Must(c => Enum.TryParse<ExpenseCategory>(c, out _))
            .WithMessage("Categoria inválida.");
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.DueDate).NotEmpty();
    }
}
