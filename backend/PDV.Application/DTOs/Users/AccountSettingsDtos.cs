namespace PDV.Application.DTOs.Users;

// Configurações pessoais do usuário, agrupadas por seção (espelha a tela de Conta).
public record UserSettingsResponse(
    AppearanceSettingsDto Appearance,
    NotificationSettingsDto Notifications);

// Seção "Aparência" — também é o corpo do PUT /api/account/settings/appearance.
public record AppearanceSettingsDto(
    string Theme,
    string AccentColor,
    int TextSize);

// Seção "Notificações" — também é o corpo do PUT /api/account/settings/notifications.
public record NotificationSettingsDto(
    bool NewSales,
    bool StockAlerts,
    bool Invoices,
    bool TeamActivity);
