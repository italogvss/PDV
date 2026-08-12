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
        RuleFor(x => x.Credit).SetValidator(new CreditSettingsDtoValidator());

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

public class CreditSettingsDtoValidator : AbstractValidator<CreditSettingsDto>
{
    public CreditSettingsDtoValidator()
    {
        // 60 é o teto absoluto do crediário (mesmo do CreateCreditAccountRequestValidator).
        RuleFor(c => c.MaxInstallments)
            .InclusiveBetween(1, 60)
            .WithMessage("O máximo de parcelas do crediário deve ficar entre 1 e 60.");

        RuleFor(c => c.FirstDueDays)
            .InclusiveBetween(0, 180)
            .WithMessage("O prazo do primeiro vencimento deve ficar entre 0 e 180 dias.");

        RuleFor(c => c.MinDownPaymentPercent)
            .InclusiveBetween(0m, 100m)
            .WithMessage("A entrada mínima deve ficar entre 0% e 100%.");
    }
}
