using System.Text.Json;

namespace PDV.Application.DTOs.Logs;

// Details vem do DetailsJson já desserializado para um nó JSON — o frontend lê os campos
// conforme a Action, sem precisar dar parse de string.
public record AuditLogResponse(
    Guid Id,
    string Action,
    string EntityType,
    Guid? EntityId,
    string EntityName,
    Guid? PerformedByUserId,
    string PerformedByName,
    JsonElement? Details,
    DateTime CreatedAt);
