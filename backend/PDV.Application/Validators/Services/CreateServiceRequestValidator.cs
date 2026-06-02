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
    }
}
