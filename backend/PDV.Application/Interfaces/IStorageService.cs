namespace PDV.Application.Interfaces;

/// <summary>
/// Abstração de storage de objetos (MinIO em dev, S3 em produção).
/// Migração para AWS S3 só requer trocar endpoint + credenciais — nenhuma linha aqui muda.
/// </summary>
public interface IStorageService
{
    /// <summary>Gera presigned URL para o frontend fazer PUT direto no storage (válida ~5 min).</summary>
    Task<string> GenerateUploadUrlAsync(string bucket, string relativePath, CancellationToken ct = default);

    /// <summary>Gera presigned URL de leitura (válida ~1h) com ?v={updatedAt.Ticks} para cache busting.</summary>
    Task<string> GenerateReadUrlAsync(string bucket, string relativePath, DateTime updatedAt, CancellationToken ct = default);

    /// <summary>Deleta o arquivo do storage.</summary>
    Task DeleteAsync(string bucket, string relativePath, CancellationToken ct = default);
}
