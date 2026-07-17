using Microsoft.AspNetCore.Http;
using Moq;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Services;
using System.Security.Claims;

namespace PDV.UnitTests.Support.Harness;

// Monta o PermissionService. O IHttpContextAccessor recebe um DefaultHttpContext REAL com um
// ClaimsPrincipal real: o service lê os claims por FindFirstValue, e mockar ClaimsPrincipal daria
// um teste que passa com claims que o JwtBearer nunca produziria.
public sealed class PermissionHarness
{
    public Mock<IEmployeeRepository> Employees { get; } = new();
    public Mock<ITenantRoleRepository> Roles { get; } = new();

    private readonly Mock<IHttpContextAccessor> _accessor = new();
    private readonly Mock<ITenantContext> _tenantContext = new();

    public Guid TenantId { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; } = Guid.NewGuid();

    public PermissionHarness()
    {
        _tenantContext.SetupGet(c => c.TenantId).Returns(() => TenantId);
    }

    // Sessão autenticada com um papel. Reproduz exatamente os claims que o AuthService emite:
    // ClaimTypes.Role (mapeado por RoleClaimType) e ClaimTypes.NameIdentifier para o sub.
    public PermissionHarness SignedInAs(string role, Guid? userId = null, Guid? tenantId = null)
    {
        UserId = userId ?? UserId;
        TenantId = tenantId ?? TenantId;

        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Role, role),
            new Claim(ClaimTypes.NameIdentifier, UserId.ToString()),
        ], authenticationType: "TestAuth");

        _accessor.SetupGet(a => a.HttpContext)
                 .Returns(new DefaultHttpContext { User = new ClaimsPrincipal(identity) });
        return this;
    }

    // Sessão sem claim de papel — o token existe mas não diz quem é. Não pode virar acesso.
    public PermissionHarness SignedInWithoutRole(Guid? userId = null)
    {
        UserId = userId ?? UserId;
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, UserId.ToString())], authenticationType: "TestAuth");
        _accessor.SetupGet(a => a.HttpContext)
                 .Returns(new DefaultHttpContext { User = new ClaimsPrincipal(identity) });
        return this;
    }

    // Requisição fora de um contexto HTTP (ex.: job de background chamando por engano).
    public PermissionHarness WithoutHttpContext()
    {
        _accessor.SetupGet(a => a.HttpContext).Returns((HttpContext?)null);
        return this;
    }

    // Funcionário com um cargo que concede exatamente `granted`.
    public PermissionHarness WithEmployeeHolding(params Permission[] granted)
    {
        var roleId = Guid.NewGuid();
        var employee = new Employee
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            UserId = UserId,
            RoleId = roleId,
        };

        Employees.Setup(r => r.GetByUserIdAsync(UserId, TenantId)).ReturnsAsync(employee);
        Roles.Setup(r => r.HasAnyPermissionAsync(roleId, It.IsAny<IReadOnlyCollection<Permission>>()))
             .ReturnsAsync((Guid _, IReadOnlyCollection<Permission> asked) => asked.Any(granted.Contains));
        return this;
    }

    // Usuário sem registro de Employee no tenant ativo (ex.: vínculo removido, ou papel inesperado).
    public PermissionHarness WithNoEmployeeRecord()
    {
        Employees.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
                 .ReturnsAsync((Employee?)null);
        return this;
    }

    public PermissionService Build() =>
        new(_accessor.Object, Employees.Object, Roles.Object, _tenantContext.Object);
}
