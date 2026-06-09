using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Domain.Interfaces;

public interface IMediaRepository
{
    Task<MediaFile?> GetActiveAsync(MediaCategory category, Guid entityId);
    Task AddAsync(MediaFile media);
    Task SoftDeleteAsync(MediaFile media);

    /// <summary>
    /// Atualiza o campo de imagem da entidade dona (Product/Service/Employee/User/TenantSettings)
    /// e seu UpdatedAt. Retorna false se a entidade não existir ou não pertencer ao tenant atual.
    /// Passar null em <paramref name="relativePath"/> limpa a imagem.
    /// </summary>
    Task<bool> SetEntityImageAsync(MediaCategory category, Guid entityId, string? relativePath);
}
