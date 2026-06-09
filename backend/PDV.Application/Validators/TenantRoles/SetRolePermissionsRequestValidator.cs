using FluentValidation;
using PDV.Application.DTOs.TenantRoles;
using PDV.Domain.Enums;

namespace PDV.Application.Validators.TenantRoles;

public class SetRolePermissionsRequestValidator : AbstractValidator<SetRolePermissionsRequest>
{
    public SetRolePermissionsRequestValidator()
    {
        RuleForEach(x => x.Permissions)
            .Must(p => Enum.TryParse<Permission>(p, out _))
            .WithMessage("Permissão inválida: '{PropertyValue}'.");
    }
}
