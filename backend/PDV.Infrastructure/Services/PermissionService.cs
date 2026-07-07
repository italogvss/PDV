using Microsoft.AspNetCore.Http;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;
using System.Security.Claims;

namespace PDV.Infrastructure.Services;

public class PermissionService(
    IHttpContextAccessor accessor,
    IEmployeeRepository employeeRepository,
    ITenantRoleRepository roleRepository,
    ITenantContext tenantContext) : IPermissionService
{
    public async Task RequireAsync(params Permission[] permissions)
    {
        if (permissions.Length == 0)
            throw new UnauthorizedException("Nenhuma permissão informada.");

        var context = accessor.HttpContext
            ?? throw new UnauthorizedException("Contexto HTTP não disponível.");

        var role = context.User.FindFirstValue(ClaimTypes.Role);

        // Owner (dono da loja) e Admin (plataforma) têm acesso total — não checam permissões
        // granulares. Sem o bypass de Admin, ele cairia no caminho de Employee (sem vínculo → exceção),
        // o que é uma armadilha caso [RequirePermission] seja usado numa rota compartilhada.
        if (role == "Owner" || role == "Admin") return;

        var userId = Guid.Parse(context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedException("Usuário não identificado."));

        var employee = await employeeRepository.GetByUserIdAsync(userId, tenantContext.TenantId)
            ?? throw new UnauthorizedException("Funcionário não encontrado.");

        // Semântica OR: basta ter QUALQUER uma das permissões informadas.
        var hasPermission = await roleRepository.HasAnyPermissionAsync(employee.RoleId, permissions);

        if (!hasPermission)
            throw new UnauthorizedException("Sem permissão para realizar esta operação.");
    }
}
