using FluentValidation;
using PDV.Application.DTOs.Products;

namespace PDV.Application.Validators.Products;

public class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Stock).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Barcode).MaximumLength(50).When(x => x.Barcode is not null);
        RuleFor(x => x.Ncm).MaximumLength(10).When(x => x.Ncm is not null);
        RuleFor(x => x.PurchasePrice).GreaterThanOrEqualTo(0).When(x => x.PurchasePrice is not null);
        RuleFor(x => x.MinStock).GreaterThanOrEqualTo(0).When(x => x.MinStock is not null);
        RuleFor(x => x.MinCriticalStock).GreaterThanOrEqualTo(0).When(x => x.MinCriticalStock is not null);
    }
}
