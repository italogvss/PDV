using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Application.Helpers;

public static class StorageServiceExtensions
{
    /// <summary>
    /// Resolve o valor armazenado no campo de imagem da entidade para uma presigned URL de leitura.
    /// - null/vazio → null
    /// - URL absoluta (avatar externo do Google etc.) → devolvida sem alteração
    /// - path relativo do storage → presigned URL de leitura com cache busting
    /// </summary>
    public static async Task<string?> ResolveReadUrlAsync(
        this IStorageService storage,
        string? relativePath,
        MediaCategory category,
        DateTime updatedAt,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            return null;

        if (MediaPathHelper.IsAbsoluteUrl(relativePath))
            return relativePath;

        return await storage.GenerateReadUrlAsync(
            MediaPathHelper.GetBucket(category), relativePath, updatedAt, ct);
    }
}
