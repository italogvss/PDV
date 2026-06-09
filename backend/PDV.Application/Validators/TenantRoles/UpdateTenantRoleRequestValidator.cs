using FluentValidation;
using PDV.Application.DTOs.TenantRoles;

namespace PDV.Application.Validators.TenantRoles;

public class UpdateTenantRoleRequestValidator : AbstractValidator<UpdateTenantRoleRequest>
{
    public UpdateTenantRoleRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(255).When(x => x.Description is not null);
    }
}
