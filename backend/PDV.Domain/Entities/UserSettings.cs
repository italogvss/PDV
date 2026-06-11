using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class UserSettings : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // Aparência
    public Theme Theme { get; set; } = Theme.Light;
    public string AccentColor { get; set; } = "green";
    public int TextSize { get; set; } = 15;

    // Notificações no app
    public bool NotifyNewSales { get; set; } = true;
    public bool NotifyStockAlerts { get; set; } = true;
    public bool NotifyInvoices { get; set; } = true;
    public bool NotifyTeamActivity { get; set; } = true;
}
