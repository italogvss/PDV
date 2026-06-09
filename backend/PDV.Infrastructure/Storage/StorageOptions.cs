namespace PDV.Infrastructure.Storage;

/// <summary>
/// Bind da seção "Storage" do appsettings/variáveis de ambiente.
/// Secrets (AccessKey/SecretKey) nunca commitados — vêm de user-secrets / env.
/// </summary>
public class StorageOptions
{
    public const string SectionName = "Storage";

    /// <summary>Endpoint interno usado pelo backend para operações diretas (delete, criar bucket). Ex.: minio:9000.</summary>
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>
    /// Endpoint público alcançável pelo navegador, usado para assinar as presigned URLs.
    /// Em dev o backend roda em container (minio:9000) mas o browser acessa localhost:9000.
    /// Se vazio, usa <see cref="Endpoint"/>.
    /// </summary>
    public string? PublicEndpoint { get; set; }

    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public bool UseSSL { get; set; }
    public int ReadUrlExpireMinutes { get; set; } = 60;
    public int UploadUrlExpireMinutes { get; set; } = 5;
}
