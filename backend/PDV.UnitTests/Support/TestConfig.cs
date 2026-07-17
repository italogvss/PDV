using Microsoft.Extensions.Configuration;

namespace PDV.UnitTests.Support;

// Configuração real (in-memory) em vez de Mock<IConfiguration>: o AuthService/TenantService leem
// JWT_SECRET pelo indexer e lançam InvalidOperationException se faltar. Um IConfiguration de
// verdade evita setups frágeis de indexer e falha do mesmo jeito que em produção.
public static class TestConfig
{
    // 32+ bytes: HMAC-SHA256 exige chave de pelo menos 256 bits, senão o handler lança.
    public const string JwtSecret = "test-only-jwt-secret-with-at-least-32-bytes!!";
    public const int JwtExpiresHours = 8;

    public static IConfiguration Create(params (string Key, string Value)[] overrides)
    {
        var values = new Dictionary<string, string?>
        {
            ["JWT_SECRET"] = JwtSecret,
            ["JWT_EXPIRES_HOURS"] = JwtExpiresHours.ToString(),
        };

        foreach (var (key, value) in overrides)
            values[key] = value;

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }
}
