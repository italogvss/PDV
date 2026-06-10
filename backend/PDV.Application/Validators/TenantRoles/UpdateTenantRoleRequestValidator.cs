using FluentValidation;
using PDV.Application.DTOs.TenantRoles;

namespace PDV.Application.Validators.TenantRoles;

public class UpdateTenantRoleRequestValidator : AbstractValidator<UpdateTenantRoleRequest>
{
    public UpdateTenantRoleRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(255).When(x => x.Description is not null);
        RuleFor(x => x.Color)
            .Matches(@"^#[0-9A-Fa-f]{6}$").WithMessage("Cor inválida — use o formato #RRGGBB.")
            .When(x => x.Color is not null);
    }
}
