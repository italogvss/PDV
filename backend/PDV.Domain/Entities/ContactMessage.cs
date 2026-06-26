using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class ContactMessage : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public ContactMessageCategory Category { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public ContactMessageStatus Status { get; set; } = ContactMessageStatus.Unread;

    // Campos exclusivos de BugReport
    public string? ExpectedBehavior { get; set; }
    public Reproducibility? Reproducibility { get; set; }

    // Contexto técnico — preenchido automaticamente pelo frontend
    public string? PageContext { get; set; }
    public string? AppVersion { get; set; }
    public string? Browser { get; set; }
    public string? ScreenResolution { get; set; }
    public string? Platform { get; set; }
}
