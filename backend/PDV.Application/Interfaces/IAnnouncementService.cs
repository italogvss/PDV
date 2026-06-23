using PDV.Application.DTOs.Announcements;

namespace PDV.Application.Interfaces;

public interface IAnnouncementService
{
    // Avisos editoriais pendentes para o usuário atual + Keys de ciclo de vida já vistas.
    Task<AnnouncementFeedResponse> GetFeedAsync();

    // Marca uma Key como vista (Announcement.Id ou "lifecycle:*").
    Task MarkSeenAsync(string key);
}
