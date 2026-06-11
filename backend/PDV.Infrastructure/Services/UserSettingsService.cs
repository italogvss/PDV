using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Users;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class UserSettingsService(
    AppDbContext context,
    IValidator<AppearanceSettingsDto> appearanceValidator) : IUserSettingsService
{
    public async Task<UserSettingsResponse> GetAsync(Guid userId)
    {
        var settings = await context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        // Linha pode não existir para usuários antigos — devolve defaults sem persistir.
        return Map(settings ?? new UserSettings { UserId = userId });
    }

    public async Task<AppearanceSettingsDto> UpdateAppearanceAsync(Guid userId, AppearanceSettingsDto request)
    {
        await appearanceValidator.ValidateAndThrowAsync(request);

        var settings = await GetOrCreateAsync(userId);
        settings.Theme = Enum.Parse<Theme>(request.Theme);
        settings.AccentColor = request.AccentColor;
        settings.TextSize = request.TextSize;
        settings.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return Map(settings).Appearance;
    }

    public async Task<NotificationSettingsDto> UpdateNotificationsAsync(Guid userId, NotificationSettingsDto request)
    {
        var settings = await GetOrCreateAsync(userId);
        settings.NotifyNewSales = request.NewSales;
        settings.NotifyStockAlerts = request.StockAlerts;
        settings.NotifyInvoices = request.Invoices;
        settings.NotifyTeamActivity = request.TeamActivity;
        settings.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return Map(settings).Notifications;
    }

    private async Task<UserSettings> GetOrCreateAsync(Guid userId)
    {
        var settings = await context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (settings is not null)
            return settings;

        // Garante que o usuário existe antes de criar a linha de configurações.
        var userExists = await context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
            throw new NotFoundException("Usuário não encontrado.");

        settings = new UserSettings { UserId = userId };
        await context.UserSettings.AddAsync(settings);
        // Persiste já com os defaults para que a gravação dos valores do request siga
        // pelo caminho de UPDATE — evita o EF omitir booleanos 'false' no INSERT
        // (colunas com HasDefaultValue são ValueGenerated.OnAdd).
        await context.SaveChangesAsync();
        return settings;
    }

    private static UserSettingsResponse Map(UserSettings s) =>
        new(
            new AppearanceSettingsDto(s.Theme.ToString(), s.AccentColor, s.TextSize),
            new NotificationSettingsDto(
                s.NotifyNewSales, s.NotifyStockAlerts, s.NotifyInvoices, s.NotifyTeamActivity));
}
