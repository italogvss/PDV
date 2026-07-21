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

    /// <summary>Tamanho do objeto em bytes via HEAD (sem baixar o conteúdo), ou null se não existir.</summary>
    Task<long?> GetObjectSizeAsync(string bucket, string relativePath, CancellationToken ct = default);

    /// <summary>Lê só os primeiros <paramref name="byteCount"/> bytes do objeto (checagem de assinatura/magic bytes).</summary>
    Task<byte[]> GetObjectHeadBytesAsync(string bucket, string relativePath, int byteCount, CancellationToken ct = default);

    /// <summary>
    /// Checagem de saúde: faz uma chamada de rede real ao storage. Não usar presign para isso —
    /// assinar URL é puramente computacional e passaria mesmo com o storage fora do ar.
    /// </summary>
    Task PingAsync(CancellationToken ct = default);
}
