using PDV.Application.DTOs.Notifications;

namespace PDV.Application.Interfaces;

public interface INotificationService
{
    Task<NotificationResponse> GetNotificationsAsync();
}
