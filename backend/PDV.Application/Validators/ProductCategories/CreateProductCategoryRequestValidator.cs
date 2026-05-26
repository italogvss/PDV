using FluentValidation;
using PDV.Application.DTOs.ProductCategories;

namespace PDV.Application.Validators.ProductCategories;

public class CreateProductCategoryRequestValidator : AbstractValidator<CreateProductCategoryRequest>
{
    public CreateProductCategoryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Color).NotEmpty().MaximumLength(7)
            .Matches("^#[0-9A-Fa-f]{6}$").WithMessage("Cor deve ser um valor HEX válido (ex: #FF5733).");
    }
}
