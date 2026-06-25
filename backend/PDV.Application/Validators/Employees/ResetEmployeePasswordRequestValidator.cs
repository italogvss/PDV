using FluentValidation;
using PDV.Application.DTOs.Employees;

namespace PDV.Application.Validators.Employees;

public class ResetEmployeePasswordRequestValidator : AbstractValidator<ResetEmployeePasswordRequest>
{
    public ResetEmployeePasswordRequestValidator()
    {
        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(8).WithMessage("A senha deve ter no mínimo 8 caracteres.")
            .Matches(@"\d").WithMessage("A senha deve conter pelo menos um número.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("A senha deve conter pelo menos um caractere especial.");
    }
}
