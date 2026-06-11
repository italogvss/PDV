using PDV.Application.DTOs.Users;

namespace PDV.Application.Interfaces;

public interface IUserSettingsService
{
    Task<UserSettingsResponse> GetAsync(Guid userId);
    Task<AppearanceSettingsDto> UpdateAppearanceAsync(Guid userId, AppearanceSettingsDto request);
    Task<NotificationSettingsDto> UpdateNotificationsAsync(Guid userId, NotificationSettingsDto request);
}
