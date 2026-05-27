using FluentValidation;
using PDV.Application.DTOs.Expenses;

namespace PDV.Application.Validators;

public class UpdateExpenseRequestValidator : AbstractValidator<UpdateExpenseRequest>
{
    private static readonly string[] ValidCategories =
    [
        "Aluguel", "Fornecedor", "Energia", "Agua", "Internet",
        "Salários", "Marketing", "Impostos", "Manutenção", "Outros"
    ];

    public UpdateExpenseRequestValidator()
    {
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Category)
            .NotEmpty()
            .Must(c => ValidCategories.Contains(c))
            .WithMessage("Categoria inválida.");
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.DueDate).NotEmpty();
    }
}
