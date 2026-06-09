using FluentValidation;
using PDV.Application.DTOs.Appointments;

namespace PDV.Application.Validators.Appointments;

public class UpdateAppointmentRequestValidator : AbstractValidator<UpdateAppointmentRequest>
{
    private static readonly string[] ValidStatuses = ["pendente", "confirmado", "em_atendimento", "concluido", "cancelado"];

    public UpdateAppointmentRequestValidator()
    {
        RuleFor(x => x.CustomerName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CustomerPhone).MaximumLength(30).When(x => x.CustomerPhone is not null);
        RuleFor(x => x.EmployeeId).NotEmpty();
        RuleFor(x => x.ServiceIds).NotEmpty().WithMessage("Selecione ao menos um serviço.");
        RuleFor(x => x.DurationMinutes).GreaterThan(0);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Status).Must(s => ValidStatuses.Contains(s)).WithMessage("Status inválido.");
        RuleFor(x => x.Note).MaximumLength(1000).When(x => x.Note is not null);
        RuleFor(x => x.Color).MaximumLength(20).When(x => x.Color is not null);
    }
}
