using FluentValidation;
using PDV.Application.DTOs.Auth;

namespace PDV.Application.Validators.Auth;

public class LocalLoginRequestValidator : AbstractValidator<LocalLoginRequest>
{
    public LocalLoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}
