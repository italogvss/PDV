using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;
using Amazon.Runtime;
using Microsoft.Extensions.Options;
using PDV.Application.Interfaces;

namespace PDV.Infrastructure.Storage;

/// <summary>
/// Implementação de <see cref="IStorageService"/> sobre o protocolo S3 (MinIO em dev, S3 em prod).
///
/// Usa dois clients porque, em dev, o backend roda em container e o navegador no host:
/// - <c>opsClient</c>  → endpoint interno (ex.: minio:9000), faz chamadas de rede reais (delete, criar bucket).
/// - <c>presignClient</c> → endpoint público (ex.: localhost:9000), apenas assina URLs (sem rede).
///   O navegador acessa a presigned URL nesse host, então a assinatura precisa bater com ele.
/// Em produção (S3) ambos os endpoints são o mesmo e os dois clients coincidem.
/// </summary>
public class MinioStorageService : IStorageService
{
    private readonly IAmazonS3 _opsClient;
    private readonly IAmazonS3 _presignClient;
    private readonly StorageOptions _options;

    public MinioStorageService(IOptions<StorageOptions> options)
    {
        _options = options.Value;
        var credentials = new BasicAWSCredentials(_options.AccessKey, _options.SecretKey);

        _opsClient = BuildClient(credentials, _options.Endpoint, _options.UseSSL);

        var publicEndpoint = string.IsNullOrWhiteSpace(_options.PublicEndpoint)
            ? _options.Endpoint
            : _options.PublicEndpoint;
        _presignClient = publicEndpoint == _options.Endpoint
            ? _opsClient
            : BuildClient(credentials, publicEndpoint, _options.UseSSL);
    }

    private static IAmazonS3 BuildClient(AWSCredentials credentials, string endpoint, bool useSsl)
    {
        var config = new AmazonS3Config
        {
            ServiceURL = $"{(useSsl ? "https" : "http")}://{endpoint}",
            ForcePathStyle = true,            // MinIO exige path-style (bucket no path, não no host)
            // Sem UseHttp explícito o SDK assina as presigned URLs em https mesmo com
            // ServiceURL http — o navegador falharia no handshake TLS contra o MinIO (http).
            UseHttp = !useSsl,
            AuthenticationRegion = "us-east-1",
        };
        return new AmazonS3Client(credentials, config);
    }

    public async Task<string> GenerateUploadUrlAsync(string bucket, string relativePath, CancellationToken ct = default)
    {
        await EnsureBucketExistsAsync(bucket, ct);

        var request = new GetPreSignedUrlRequest
        {
            BucketName = bucket,
            Key = relativePath,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.AddMinutes(_options.UploadUrlExpireMinutes),
            // O SigV2 inclui o Content-Type no StringToSign — assinamos com o mesmo valor
            // que o frontend envia no PUT (image/webp), senão o MinIO retorna 403.
            ContentType = "image/webp",
        };

        // GetPreSignedURL é puramente computacional (não faz chamada de rede).
        return ToPublicScheme(_presignClient.GetPreSignedURL(request));
    }

    public Task<string> GenerateReadUrlAsync(string bucket, string relativePath, DateTime updatedAt, CancellationToken ct = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = bucket,
            Key = relativePath,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(_options.ReadUrlExpireMinutes),
        };

        var url = ToPublicScheme(_presignClient.GetPreSignedURL(request));
        // Cache busting: muda quando a entidade é atualizada → navegador rebusca a imagem.
        return Task.FromResult($"{url}&v={updatedAt.Ticks}");
    }

    public Task DeleteAsync(string bucket, string relativePath, CancellationToken ct = default) =>
        _opsClient.DeleteObjectAsync(bucket, relativePath, ct);

    /// <summary>
    /// Em dev (UseSSL=false) o AWS SDK ainda assina as presigned URLs com https mesmo com
    /// ServiceURL/UseHttp em http. O scheme não entra na assinatura (SigV2/SigV4 assinam
    /// verbo/expires/host/headers, nunca o scheme), então reescrevê-lo é seguro e necessário
    /// para o navegador alcançar o MinIO, que só fala http.
    /// </summary>
    private string ToPublicScheme(string url)
    {
        if (_options.UseSSL) return url;
        return url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            ? string.Concat("http://", url.AsSpan("https://".Length))
            : url;
    }

    private async Task EnsureBucketExistsAsync(string bucket, CancellationToken ct)
    {
        var exists = await AmazonS3Util.DoesS3BucketExistV2Async(_opsClient, bucket);
        if (!exists)
            await _opsClient.PutBucketAsync(bucket, ct);
    }
}
