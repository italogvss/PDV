using PDV.Application.Interfaces;

namespace PDV.Infrastructure.Services;

public class GoogleOAuthProvider : IOAuthProvider
{
    public string ProviderName => "Google";
}
