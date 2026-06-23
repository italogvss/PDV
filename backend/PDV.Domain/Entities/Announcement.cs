using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Aviso editorial (nova feature, mudança de termos, nova versão...). Entidade GLOBAL —
// sem TenantId, sem query filter, igual ao catálogo de Plan. Publicada via SQL/seed pelo
// desenvolvedor; mostrada uma vez por usuário (controle em UserSeenMarker).
public class Announcement : BaseEntity
{
    public string Title { get; set; } = string.Empty;

    // Corpo em markdown — renderizado pelo MarkdownRenderer do frontend.
    public string Body { get; set; } = string.Empty;

    public AnnouncementType Type { get; set; } = AnnouncementType.Info;

    public string? ImageUrl { get; set; }
    public string? CtaLabel { get; set; }
    public string? CtaUrl { get; set; }

    // Janela de exibição — null em qualquer ponta = sem limite naquela ponta.
    public DateTime? PublishAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    // Segmentação — null = vale para todos naquela dimensão.
    // TargetPlanCode: "free" | "starter" | "pro" (ver PlanTier).
    public string? TargetPlanCode { get; set; }
    public UserRole? TargetRole { get; set; }

    // Ordem de exibição quando há vários avisos pendentes (maior = primeiro).
    public int Priority { get; set; }
}
