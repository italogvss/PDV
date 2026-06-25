using FluentValidation;
using PDV.Application.DTOs.Auth;

namespace PDV.Application.Validators.Auth;

public class LocalLoginRequestValidator : AbstractValidator<LocalLoginRequest>
{
    public LocalLoginRequestValidator()
    {
        RuleFor(x => x.Username).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}
