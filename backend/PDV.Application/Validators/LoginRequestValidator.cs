using FluentValidation;
using PDV.Application.DTOs.Auth;

namespace PDV.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.UserName).NotEmpty().MinimumLength(5);
        RuleFor(x => x.Password).NotEmpty();
    }
}
