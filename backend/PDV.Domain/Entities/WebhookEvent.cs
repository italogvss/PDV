namespace PDV.Domain.Entities;

// Log de idempotência de webhooks. Entidade GLOBAL (webhook é anônimo, sem tenant/user).
// `EventId` é o id do evento no gateway (`evt_...`) — índice único em (Provider, EventId) evita
// reprocessamento de uma reentrega.
public class WebhookEvent : BaseEntity
{
    public string Provider { get; set; } = string.Empty;
    public string EventId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }

    // Received | Processed | Failed
    public string Status { get; set; } = "Received";
    public string? Error { get; set; }
}
