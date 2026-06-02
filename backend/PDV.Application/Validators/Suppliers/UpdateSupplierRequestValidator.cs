using FluentValidation;
using PDV.Application.DTOs.Suppliers;

namespace PDV.Application.Validators.Suppliers;

public class UpdateSupplierRequestValidator : AbstractValidator<UpdateSupplierRequest>
{
    public UpdateSupplierRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Nome é obrigatório.")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres.");

        RuleFor(x => x.Phone)
            .MaximumLength(20).WithMessage("Telefone deve ter no máximo 20 caracteres.")
            .When(x => x.Phone is not null);
    }
}
