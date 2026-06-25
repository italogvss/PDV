using FluentValidation;
using PDV.Application.DTOs.Employees;

namespace PDV.Application.Validators.Employees;

public class UpdateEmployeeRequestValidator : AbstractValidator<UpdateEmployeeRequest>
{
    public UpdateEmployeeRequestValidator()
    {
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
