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

        RuleFor(x => x.Discount)
            .GreaterThanOrEqualTo(0).WithMessage("Desconto não pode ser negativo.");

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

        When(x => x.Credit is not null, () =>
        {
            // Fiado exige cliente identificado — um CPF solto não basta (docs/crediario.md §1).
            RuleFor(x => x.CustomerId)
                .NotNull()
                .WithMessage("Venda no crediário exige um cliente cadastrado.");

            // Parcelamento de cartão e carnê de crediário são coisas diferentes: o primeiro é
            // informativo (a loja recebe tudo), o segundo é o cronograma real de recebimento.
            RuleFor(x => x.IsInstallment)
                .Equal(false)
                .WithMessage("Venda no crediário não usa parcelamento de cartão.");

            RuleFor(x => x.Credit!.InstallmentCount)
                .InclusiveBetween(1, 60)
                .WithMessage("O crediário deve ter entre 1 e 60 parcelas.");

            RuleFor(x => x.Credit!.FirstDueDate)
                .NotEmpty()
                .WithMessage("Informe a data do primeiro vencimento.");

            RuleFor(x => x.Credit!.DownPayment)
                .GreaterThanOrEqualTo(0)
                .WithMessage("A entrada não pode ser negativa.");

            RuleFor(x => x.Credit!.Note)
                .MaximumLength(500);
        });
    }
}
