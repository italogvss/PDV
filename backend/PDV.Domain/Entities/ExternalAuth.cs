namespace PDV.Domain.Entities;

public class ExternalAuth : BaseEntity
{
    public Guid UserId { get; set; }
    public string Provider { get; set; } = string.Empty;   // "Google", "Facebook", "Apple"
    public string ProviderId { get; set; } = string.Empty; // ID retornado pelo provedor

    public User User { get; set; } = null!;
}
