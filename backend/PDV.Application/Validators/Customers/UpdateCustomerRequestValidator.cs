using FluentValidation;
using PDV.Application.DTOs.Customers;

namespace PDV.Application.Validators.Customers;

public class UpdateCustomerRequestValidator : AbstractValidator<UpdateCustomerRequest>
{
    public UpdateCustomerRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Nome é obrigatório.")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres.");

        RuleFor(x => x.Phone)
            .MaximumLength(20).WithMessage("Telefone deve ter no máximo 20 caracteres.")
            .When(x => x.Phone is not null);

        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("E-mail inválido.")
            .MaximumLength(200).WithMessage("E-mail deve ter no máximo 200 caracteres.")
            .When(x => !string.IsNullOrEmpty(x.Email));

        RuleFor(x => x.Document)
            .MaximumLength(20).WithMessage("Documento deve ter no máximo 20 caracteres.")
            .When(x => x.Document is not null);

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Observação deve ter no máximo 500 caracteres.")
            .When(x => x.Note is not null);

        When(x => x.Address is not null, () =>
        {
            RuleFor(x => x.Address!.Street).MaximumLength(200).When(x => x.Address!.Street is not null);
            RuleFor(x => x.Address!.Number).MaximumLength(10).When(x => x.Address!.Number is not null);
            RuleFor(x => x.Address!.City).MaximumLength(100).When(x => x.Address!.City is not null);
            RuleFor(x => x.Address!.State).MaximumLength(2).When(x => x.Address!.State is not null);
            RuleFor(x => x.Address!.ZipCode).MaximumLength(9).When(x => x.Address!.ZipCode is not null);
        });
    }
}
