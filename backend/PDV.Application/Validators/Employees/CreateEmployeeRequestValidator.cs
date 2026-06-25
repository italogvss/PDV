using FluentValidation;
using PDV.Application.DTOs.Employees;

namespace PDV.Application.Validators.Employees;

public class CreateEmployeeRequestValidator : AbstractValidator<CreateEmployeeRequest>
{
    public CreateEmployeeRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Username)
            .NotEmpty()
            .MaximumLength(50)
            .Matches(@"^[a-zA-Z0-9_.]+$").WithMessage("Nome de usuário deve conter apenas letras, números, ponto e underscore.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.TemporaryPassword)
            .NotEmpty()
            .MinimumLength(8).WithMessage("A senha deve ter no mínimo 8 caracteres.")
            .Matches(@"\d").WithMessage("A senha deve conter pelo menos um número.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("A senha deve conter pelo menos um caractere especial.");
        RuleFor(x => x.RoleId).NotEmpty().WithMessage("RoleId é obrigatório.");
        RuleFor(x => x.Phone).MaximumLength(20).When(x => x.Phone is not null);

        When(x => x.AutoCreateSalaryExpense, () =>
        {
            RuleFor(x => x.Salary)
                .NotNull().WithMessage("Informe o salário.")
                .GreaterThan(0).WithMessage("O salário deve ser maior que zero.");
            RuleFor(x => x.PaymentDay)
                .NotNull().WithMessage("Informe o dia de pagamento.")
                .InclusiveBetween(1, 28).WithMessage("O dia de pagamento deve estar entre 1 e 28.");
        });
    }
}
