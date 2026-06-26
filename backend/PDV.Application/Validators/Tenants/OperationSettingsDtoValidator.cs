using FluentValidation;
using PDV.Application.DTOs.Tenants;

namespace PDV.Application.Validators.Tenants;

public class OperationSettingsDtoValidator : AbstractValidator<OperationSettingsDto>
{
    public OperationSettingsDtoValidator()
    {
        RuleFor(x => x.DiscountLimitPercent).InclusiveBetween(0, 100);

        RuleFor(x => x.DefaultMinStock).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DefaultCriticalStock).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DefaultCriticalStock)
            .LessThanOrEqualTo(x => x.DefaultMinStock)
            .WithMessage("Estoque crítico padrão deve ser menor ou igual ao estoque mínimo padrão.")
            .When(x => x.InventoryControlEnabled);
    }
}
