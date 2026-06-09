using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? ImageUrl { get; set; }
    public Guid? LastTenantId { get; set; }
    public Tenant? LastTenant { get; set; }
    public UserRole Role { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    public LocalAuth? LocalAuth { get; set; }
    public ICollection<ExternalAuth> ExternalLogins { get; set; } = [];
    public ICollection<UserTenant> UserTenants { get; set; } = [];
    public UserSettings? Settings { get; set; }
}
