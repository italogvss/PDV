using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? ImageUrl { get; set; }

    public string? Document { get; set; }
    public DateOnly? BirthDate { get; set; }
    public Guid? LastTenantId { get; set; }
    public Tenant? LastTenant { get; set; }
    public UserRole Role { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    public bool HasUsedTrial { get; set; }

    // Encerramento de conta (LGPD). RequestedAt é o discriminador que o reconciliador de retenção
    // respeita (DataRetentionRepository) — enquanto preenchido, o prazo de exclusão é gerido
    // explicitamente e não pode ser sobrescrito pelo job de assinatura. EffectiveAt é o início da
    // carência bloqueada (now no "excluir agora"; CurrentPeriodEnd no "agendar p/ fim do plano"): o
    // AccountDeletionBlockMiddleware bloqueia o uso quando now >= EffectiveAt.
    public DateTime? AccountDeletionRequestedAt { get; set; }
    public DateTime? AccountDeletionEffectiveAt { get; set; }

    public LocalAuth? LocalAuth { get; set; }
    public ICollection<ExternalAuth> ExternalLogins { get; set; } = [];
    public ICollection<UserTenant> UserTenants { get; set; } = [];
    public UserSettings? Settings { get; set; }
}
