using FluentValidation;
using PDV.Application.DTOs.Credit;
using PDV.Domain.Enums;

namespace PDV.Application.Validators;

public class ReceiveInstallmentRequestValidator : AbstractValidator<ReceiveInstallmentRequest>
{
    public ReceiveInstallmentRequestValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("O valor recebido deve ser maior que zero.");

        RuleFor(x => x.Method)
            .NotEmpty()
            .Must(m => Enum.TryParse<PaymentMethod>(m, out _))
            .WithMessage("Forma de pagamento inválida.");

        RuleFor(x => x.ReceivedAt).NotEmpty().WithMessage("Informe a data do recebimento.");

        RuleFor(x => x.Note).MaximumLength(500);
    }
}
