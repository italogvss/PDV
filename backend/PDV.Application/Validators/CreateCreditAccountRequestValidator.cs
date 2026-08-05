using FluentValidation;
using PDV.Application.DTOs.Credit;

namespace PDV.Application.Validators;

public class CreateCreditAccountRequestValidator : AbstractValidator<CreateCreditAccountRequest>
{
    public CreateCreditAccountRequestValidator()
    {
        RuleFor(x => x.SaleId).NotEmpty().WithMessage("Informe a venda de origem.");

        RuleFor(x => x.InstallmentCount)
            .InclusiveBetween(1, 60)
            .WithMessage("O número de parcelas deve estar entre 1 e 60.");

        RuleFor(x => x.FirstDueDate).NotEmpty().WithMessage("Informe a data do primeiro vencimento.");

        RuleFor(x => x.DownPayment)
            .GreaterThanOrEqualTo(0)
            .WithMessage("A entrada não pode ser negativa.");

        RuleFor(x => x.Note).MaximumLength(500);
    }
}
