using FluentValidation;
using PDV.Application.DTOs.Services;

namespace PDV.Application.Validators.Services;

public class CreateServiceRequestValidator : AbstractValidator<CreateServiceRequest>
{
    public CreateServiceRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Description).MaximumLength(300).When(x => x.Description is not null);
        RuleFor(x => x.DurationMinutes).GreaterThan(0).When(x => x.DurationMinutes is not null);
        RuleFor(x => x.CostPrice).GreaterThan(0).When(x => x.CostPrice is not null);
        RuleForEach(x => x.Products).ChildRules(p =>
            p.RuleFor(x => x.Quantity).GreaterThanOrEqualTo(1))
            .When(x => x.Products is not null);
    }
}
