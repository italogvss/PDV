using FluentValidation;
using PDV.Application.DTOs.Auth;

namespace PDV.Application.Validators.Auth;

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(8).WithMessage("A nova senha deve ter no mínimo 8 caracteres.")
            .Matches(@"\d").WithMessage("A nova senha deve conter pelo menos um número.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("A nova senha deve conter pelo menos um caractere especial.");
    }
}
