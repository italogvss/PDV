using FluentValidation;
using PDV.Application.DTOs.Tenants;

namespace PDV.Application.Validators.Tenants;

public class OperationSettingsDtoValidator : AbstractValidator<OperationSettingsDto>
{
    public OperationSettingsDtoValidator()
    {
        RuleFor(x => x.CashFundAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DiscountLimitPercent).InclusiveBetween(0, 100);
        RuleFor(x => x.InactivityLockMinutes).GreaterThanOrEqualTo(0);
    }
}
