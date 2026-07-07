using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

public interface IPermissionService
{
    // Lança UnauthorizedException se o usuário atual não tiver NENHUMA das permissões informadas
    // (semântica OR — basta ter uma). Owners e Admins sempre passam.
    Task RequireAsync(params Permission[] permissions);
}
