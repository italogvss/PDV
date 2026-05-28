namespace PDV.Domain.Entities;

public class Employee : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public string Position { get; set; } = string.Empty;
    public decimal? Salary { get; set; }
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }

    public User User { get; set; } = null!;
}
