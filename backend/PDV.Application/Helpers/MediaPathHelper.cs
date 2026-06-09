using PDV.Domain.Enums;

namespace PDV.Application.Helpers;

public static class MediaPathHelper
{
    public static string GetBucket(MediaCategory category) =>
        category.ToString().ToLowerInvariant();

    public static string GetRelativePath(MediaCategory category, Guid tenantId, Guid entityId) =>
        $"{tenantId}/{category.ToString().ToLowerInvariant()}/{entityId}.webp";

    /// <summary>
    /// True quando o valor armazenado já é uma URL absoluta (ex.: avatar externo do Google),
    /// e portanto não deve ser resolvido como path relativo do storage.
    /// </summary>
    public static bool IsAbsoluteUrl(string value) =>
        value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
        value.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
}
