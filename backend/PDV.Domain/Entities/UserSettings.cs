using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class UserSettings
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Theme Theme { get; set; } = Theme.Light;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
