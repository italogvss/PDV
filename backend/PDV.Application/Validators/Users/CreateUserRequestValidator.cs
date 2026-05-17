using FluentValidation;
using PDV.Application.DTOs.Users;

namespace PDV.Application.Validators.Users;

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Username).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(4).MaximumLength(100);
        RuleFor(x => x.Role).NotEmpty().Must(r => r == "Admin" || r == "Employee")
            .WithMessage("Perfil deve ser 'Admin' ou 'Employee'.");
    }
}
