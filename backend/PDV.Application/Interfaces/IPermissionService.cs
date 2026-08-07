using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

public interface IPermissionService
{
    // Lança UnauthorizedException se o usuário atual não tiver NENHUMA das permissões informadas
    // (semântica OR — basta ter uma). Owners e Admins sempre passam.
    Task RequireAsync(params Permission[] permissions);

    // Mesma regra, sem lançar. Para quem precisa FILTRAR em vez de barrar — o motor de
    // notificações usa isto para esconder do funcionário só as linhas que ele não pode ver.
    Task<bool> HasAnyAsync(params Permission[] permissions);
}
