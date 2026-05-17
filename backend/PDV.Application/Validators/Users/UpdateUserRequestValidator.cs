using FluentValidation;
using PDV.Application.DTOs.Users;

namespace PDV.Application.Validators.Users;

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Username).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Role).NotEmpty().Must(r => r == "Admin" || r == "Employee")
            .WithMessage("Perfil deve ser 'Admin' ou 'Employee'.");
    }
}
