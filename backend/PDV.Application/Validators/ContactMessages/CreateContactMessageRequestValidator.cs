using FluentValidation;
using PDV.Application.DTOs.ContactMessages;
using PDV.Domain.Enums;

namespace PDV.Application.Validators.ContactMessages;

public class CreateContactMessageRequestValidator : AbstractValidator<CreateContactMessageRequest>
{
    public CreateContactMessageRequestValidator()
    {
        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Categoria é obrigatória.")
            .Must(c => Enum.TryParse<ContactMessageCategory>(c, out _))
            .WithMessage("Categoria inválida.");

        RuleFor(x => x.Subject)
            .NotEmpty().WithMessage("Assunto é obrigatório.")
            .MaximumLength(80).WithMessage("Assunto deve ter no máximo 80 caracteres.");

        RuleFor(x => x.Body)
            .NotEmpty().WithMessage("Mensagem é obrigatória.")
            .MaximumLength(2000).WithMessage("Mensagem deve ter no máximo 2000 caracteres.");

        RuleFor(x => x.ExpectedBehavior)
            .MaximumLength(500).WithMessage("Comportamento esperado deve ter no máximo 500 caracteres.")
            .When(x => x.ExpectedBehavior != null);

        RuleFor(x => x.Reproducibility)
            .Must(r => r == null || Enum.TryParse<Reproducibility>(r, out _))
            .WithMessage("Reprodutibilidade inválida.");

        // ExpectedBehavior e Reproducibility só fazem sentido para BugReport
        RuleFor(x => x.ExpectedBehavior)
            .Null().WithMessage("Campo exclusivo de relato de bug.")
            .When(x => Enum.TryParse<ContactMessageCategory>(x.Category, out var cat) && cat != ContactMessageCategory.BugReport);

        RuleFor(x => x.Reproducibility)
            .Null().WithMessage("Campo exclusivo de relato de bug.")
            .When(x => Enum.TryParse<ContactMessageCategory>(x.Category, out var cat) && cat != ContactMessageCategory.BugReport);
    }
}
