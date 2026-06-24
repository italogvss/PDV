using FluentValidation;
using PDV.Application.DTOs.Expenses;
using PDV.Domain.Enums;

namespace PDV.Application.Validators;

public class CreateExpenseRequestValidator : AbstractValidator<CreateExpenseRequest>
{
    public CreateExpenseRequestValidator()
    {
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Category)
            .NotEmpty()
            .Must(c => Enum.TryParse<ExpenseCategory>(c, out _))
            .WithMessage("Categoria inválida.");
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.DueDate).NotEmpty();
        RuleFor(x => x.RepeatCount)
            .GreaterThan(0).When(x => x.RepeatCount.HasValue)
            .WithMessage("Número de repetições deve ser maior que zero.");
    }
}
