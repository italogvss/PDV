using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

public interface IPermissionService
{
    // Lança UnauthorizedException se o usuário atual não tiver a permissão.
    // Owners sempre passam — permissões granulares só se aplicam a Employees.
    Task RequireAsync(Permission permission);
}
