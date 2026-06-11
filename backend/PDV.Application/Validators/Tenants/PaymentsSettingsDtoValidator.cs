using FluentValidation;
using PDV.Application.DTOs.Tenants;

namespace PDV.Application.Validators.Tenants;

public class PaymentsSettingsDtoValidator : AbstractValidator<PaymentsSettingsDto>
{
    public PaymentsSettingsDtoValidator()
    {
        RuleFor(x => x.Pix).SetValidator(new PaymentMethodDtoValidator());
        RuleFor(x => x.CardCredit).SetValidator(new PaymentMethodDtoValidator());
        RuleFor(x => x.CardDebit).SetValidator(new PaymentMethodDtoValidator());
        RuleFor(x => x.Cash).SetValidator(new PaymentMethodDtoValidator());

        // Deve sempre haver ao menos uma forma de pagamento habilitada.
        RuleFor(x => x)
            .Must(x => x.Pix.Enabled || x.CardCredit.Enabled || x.CardDebit.Enabled || x.Cash.Enabled)
            .OverridePropertyName("Payments")
            .WithMessage("É necessário manter ao menos uma forma de pagamento ativa.");
    }
}

public class PaymentMethodDtoValidator : AbstractValidator<PaymentMethodDto>
{
    public PaymentMethodDtoValidator()
    {
        RuleFor(m => m.Fee).InclusiveBetween(0m, 100m);
    }
}
