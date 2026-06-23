namespace PDV.Application.DTOs.Logs;

public record AppointmentStatusLogResponse(
    Guid Id,
    Guid? AppointmentId,
    string FromStatus,
    string ToStatus,
    Guid? ChangedByUserId,
    string ChangedByName,
    DateTime ChangedAt);
