using Microsoft.AspNetCore.Http;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
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
    // O service é scoped (1 por request); o funcionário é o mesmo o request inteiro.
    // Memoizar evita repetir o lookup quando várias permissões são checadas em sequência
    // (o motor de notificações checa uma por regra).
    private Employee? _employee;
    private bool _employeeResolved;

    public async Task RequireAsync(params Permission[] permissions)
    {
        if (!await HasAnyAsync(permissions))
            throw new UnauthorizedException("Sem permissão para realizar esta operação.");
    }

    public async Task<bool> HasAnyAsync(params Permission[] permissions)
    {
        if (permissions.Length == 0)
            throw new UnauthorizedException("Nenhuma permissão informada.");

        var context = accessor.HttpContext
            ?? throw new UnauthorizedException("Contexto HTTP não disponível.");

        var role = context.User.FindFirstValue(ClaimTypes.Role);

        // Owner (dono da loja) e Admin (plataforma) têm acesso total — não checam permissões
        // granulares. Sem o bypass de Admin, ele cairia no caminho de Employee (sem vínculo → exceção),
        // o que é uma armadilha caso [RequirePermission] seja usado numa rota compartilhada.
        if (role == "Owner" || role == "Admin") return true;

        var employee = await ResolveEmployeeAsync(context);

        // Semântica OR: basta ter QUALQUER uma das permissões informadas.
        return await roleRepository.HasAnyPermissionAsync(employee.RoleId, permissions);
    }

    private async Task<Employee> ResolveEmployeeAsync(HttpContext context)
    {
        if (_employeeResolved)
            return _employee ?? throw new UnauthorizedException("Funcionário não encontrado.");

        var userId = Guid.Parse(context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedException("Usuário não identificado."));

        _employee = await employeeRepository.GetByUserIdAsync(userId, tenantContext.TenantId);
        _employeeResolved = true;

        return _employee ?? throw new UnauthorizedException("Funcionário não encontrado.");
    }
}
