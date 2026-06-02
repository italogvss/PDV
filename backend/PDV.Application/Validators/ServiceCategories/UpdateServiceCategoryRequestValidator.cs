using FluentValidation;
using PDV.Application.DTOs.ServiceCategories;

namespace PDV.Application.Validators.ServiceCategories;

public class UpdateServiceCategoryRequestValidator : AbstractValidator<UpdateServiceCategoryRequest>
{
    public UpdateServiceCategoryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Color).NotEmpty().MaximumLength(7)
            .Matches("^#[0-9A-Fa-f]{6}$").WithMessage("Cor deve ser um valor HEX válido (ex: #FF5733).");
    }
}
