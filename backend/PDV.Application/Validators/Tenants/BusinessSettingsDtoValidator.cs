using FluentValidation;
using PDV.Application.DTOs.Tenants;

namespace PDV.Application.Validators.Tenants;

public class BusinessSettingsDtoValidator : AbstractValidator<BusinessSettingsDto>
{
    public BusinessSettingsDtoValidator()
    {
        RuleFor(x => x.FantasyName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CompanyName).MaximumLength(300).When(x => x.CompanyName is not null);
        RuleFor(x => x.StateRegistration).MaximumLength(50).When(x => x.StateRegistration is not null);
        RuleFor(x => x.Segment).MaximumLength(50).When(x => x.Segment is not null);
        RuleFor(x => x.Phone).MaximumLength(20).When(x => x.Phone is not null);
        RuleFor(x => x.LogoUrl).MaximumLength(500).When(x => x.LogoUrl is not null);
        RuleFor(x => x.TaxRegime).NotEmpty().MaximumLength(20);

        RuleFor(x => x.Address.State).MaximumLength(2).When(x => x.Address.State is not null);
        RuleFor(x => x.Address.City).MaximumLength(100).When(x => x.Address.City is not null);
        RuleFor(x => x.Address.Neighborhood).MaximumLength(100).When(x => x.Address.Neighborhood is not null);
        RuleFor(x => x.Address.Street).MaximumLength(200).When(x => x.Address.Street is not null);
        RuleFor(x => x.Address.Complement).MaximumLength(100).When(x => x.Address.Complement is not null);
        RuleFor(x => x.Address.Number).MaximumLength(20).When(x => x.Address.Number is not null);
    }
}
