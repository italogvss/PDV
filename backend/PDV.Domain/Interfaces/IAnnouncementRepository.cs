using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IAnnouncementRepository
{
    // Avisos ativos cuja janela de datas é válida no instante `now`.
    Task<IReadOnlyList<Announcement>> GetActiveAsync(DateTime now);

    // Todas as Keys que o usuário já marcou como vistas.
    Task<IReadOnlyList<string>> GetSeenKeysAsync(Guid userId);

    // Marca uma Key como vista (idempotente — ignora se já existir).
    Task AddSeenMarkerAsync(Guid userId, string key);
}
