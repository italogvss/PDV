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
    public async Task RequireAsync(Permission permission)
    {
        var context = accessor.HttpContext
            ?? throw new UnauthorizedException("Contexto HTTP não disponível.");

        var role = context.User.FindFirstValue(ClaimTypes.Role);

        // Owner tem acesso total — não precisa checar permissões granulares
        if (role == "Owner") return;

        var userId = Guid.Parse(context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedException("Usuário não identificado."));

        var employee = await employeeRepository.GetByUserIdAsync(userId, tenantContext.TenantId)
            ?? throw new UnauthorizedException("Funcionário não encontrado.");

        var hasPermission = await roleRepository.HasPermissionAsync(employee.RoleId, permission);

        if (!hasPermission)
            throw new UnauthorizedException("Sem permissão para realizar esta operação.");
    }
}
