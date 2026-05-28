using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class UserSettings : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Theme Theme { get; set; } = Theme.Light;
}
