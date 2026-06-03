using FluentValidation;
using PDV.Application.DTOs.Sales;
using PDV.Domain.Enums;

namespace PDV.Application.Validators.Sales;

public class CreateSaleRequestValidator : AbstractValidator<CreateSaleRequest>
{
    public CreateSaleRequestValidator()
    {
        RuleFor(x => x)
            .Must(x => x.CustomerId == null || x.CustomerDocument == null)
            .WithMessage("Informe um cliente ou um CPF, não ambos.");

        RuleFor(x => x.PaymentMethod)
            .NotEmpty()
            .Must(m => Enum.TryParse<PaymentMethod>(m, out _))
            .WithMessage("Forma de pagamento inválida.");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("A venda deve ter ao menos um item.")
            .Must(items => items.All(i => i.Quantity > 0))
            .WithMessage("Quantidade de cada item deve ser maior que zero.")
            .Must(items => items.All(i =>
                (i.ProductId.HasValue && !i.ServiceId.HasValue) ||
                (!i.ProductId.HasValue && i.ServiceId.HasValue)))
            .WithMessage("Cada item deve referenciar um produto ou um serviço, nunca ambos.");

        RuleFor(x => x.AmountPaid)
            .GreaterThanOrEqualTo(0);

        When(x => x.IsInstallment, () =>
        {
            RuleFor(x => x.InstallmentCount)
                .NotNull()
                .GreaterThanOrEqualTo(2)
                .WithMessage("Parcelamento requer no mínimo 2 parcelas.");

            RuleFor(x => x.PaymentMethod)
                .Equal(nameof(PaymentMethod.CreditCard))
                .WithMessage("Parcelamento disponível apenas no cartão de crédito.");
        });
    }
}
