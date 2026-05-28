namespace PDV.Domain.Entities;

public class LocalAuth : BaseEntity
{
    public Guid UserId { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; } = true;

    public User User { get; set; } = null!;
}
