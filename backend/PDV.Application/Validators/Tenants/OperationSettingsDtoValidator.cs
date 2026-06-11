using FluentValidation;
using PDV.Application.DTOs.Tenants;

namespace PDV.Application.Validators.Tenants;

public class OperationSettingsDtoValidator : AbstractValidator<OperationSettingsDto>
{
    public OperationSettingsDtoValidator()
    {
        RuleFor(x => x.DiscountLimitPercent).InclusiveBetween(0, 100);
    }
}
