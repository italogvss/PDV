using FluentValidation;
using PDV.Application.DTOs.Employees;

namespace PDV.Application.Validators.Employees;

public class CreateEmployeeRequestValidator : AbstractValidator<CreateEmployeeRequest>
{
    public CreateEmployeeRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.TemporaryPassword).NotEmpty().MinimumLength(6);
        RuleFor(x => x.EmployeeType).NotEmpty().Must(t => t == "Manager" || t == "Employee")
            .WithMessage("EmployeeType deve ser 'Manager' ou 'Employee'.");
        RuleFor(x => x.Position).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Salary).GreaterThan(0).When(x => x.Salary.HasValue);
        RuleFor(x => x.Phone).MaximumLength(20).When(x => x.Phone is not null);
    }
}
