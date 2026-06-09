using FluentValidation;
using PDV.Application.DTOs.Employees;

namespace PDV.Application.Validators.Employees;

public class UpdateEmployeeRequestValidator : AbstractValidator<UpdateEmployeeRequest>
{
    public UpdateEmployeeRequestValidator()
    {
        RuleFor(x => x.RoleId).NotEmpty().WithMessage("RoleId é obrigatório.");
        RuleFor(x => x.Position).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Salary).GreaterThan(0).When(x => x.Salary.HasValue);
        RuleFor(x => x.Phone).MaximumLength(20).When(x => x.Phone is not null);
    }
}
