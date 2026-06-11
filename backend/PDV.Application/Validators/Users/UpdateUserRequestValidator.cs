using FluentValidation;
using PDV.Application.DTOs.Users;

namespace PDV.Application.Validators.Users;

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(20)
            .When(x => !string.IsNullOrWhiteSpace(x.Phone));
        RuleFor(x => x.Document).MaximumLength(18)
            .When(x => !string.IsNullOrWhiteSpace(x.Document));
        RuleFor(x => x.BirthDate).LessThan(DateOnly.FromDateTime(DateTime.UtcNow))
            .When(x => x.BirthDate.HasValue);
    }
}
