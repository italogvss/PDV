using FluentValidation;
using PDV.Application.DTOs.Users;

namespace PDV.Application.Validators.Users;

public class AppearanceSettingsDtoValidator : AbstractValidator<AppearanceSettingsDto>
{
    private static readonly string[] Themes = ["Light", "Dark"];
    private static readonly string[] AccentColors =
        ["green", "blue", "orange", "purple", "pink", "graphite"];

    public AppearanceSettingsDtoValidator()
    {
        RuleFor(x => x.Theme)
            .Must(t => Themes.Contains(t))
            .WithMessage("Tema inválido.");

        RuleFor(x => x.AccentColor)
            .Must(c => AccentColors.Contains(c))
            .WithMessage("Cor de destaque inválida.");
    }
}
