using Moq;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.AccessControl;

// Fluxo: o cargo do funcionário concede a ação? (docs/auth.md §7 — [RequirePermission]).
// Eixo de ACESSO, não de billing: falha aqui é 401/403, não 402.
[TestFixture]
public class PermissionTests
{
    // ── Owner e Admin passam sem checar permissão ───────────────────────────────────────────

    // O dono da loja tem acesso total; checar permissão dele seria inconsistente com o
    // useUserPermissions do frontend, que trata Owner como acesso irrestrito.
    [Test]
    public async Task Require_Owner_BypassesPermissionCheckEntirely()
    {
        var harness = new PermissionHarness().SignedInAs("Owner");

        await harness.Build().RequireAsync(Permission.ManageStock);

        harness.Employees.VerifyNoOtherCalls();
        harness.Roles.VerifyNoOtherCalls();
    }

    // Bug histórico (auth.md §17, item 5): o Admin não era liberado e caía no caminho de Employee —
    // como admin de plataforma não tem vínculo de loja, qualquer rota com [RequirePermission]
    // explodia na cara dele.
    [Test]
    public async Task Require_PlatformAdmin_BypassesPermissionCheckEntirely()
    {
        var harness = new PermissionHarness().SignedInAs("Admin").WithNoEmployeeRecord();

        await harness.Build().RequireAsync(Permission.ViewLogs);

        harness.Employees.VerifyNoOtherCalls();
    }

    // ── Funcionário: decide o cargo ─────────────────────────────────────────────────────────

    [Test]
    public async Task Require_EmployeeWithGrantedPermission_Passes()
    {
        var harness = new PermissionHarness()
            .SignedInAs("Employee")
            .WithEmployeeHolding(Permission.ViewStock, Permission.SellProducts);

        await harness.Build().RequireAsync(Permission.ViewStock);
    }

    [Test]
    public void Require_EmployeeWithoutThePermission_ThrowsUnauthorized()
    {
        var harness = new PermissionHarness()
            .SignedInAs("Employee")
            .WithEmployeeHolding(Permission.ViewStock);

        var ex = Assert.ThrowsAsync<UnauthorizedException>(
            () => harness.Build().RequireAsync(Permission.ManageStock));

        Assert.That(ex.Message, Is.EqualTo("Sem permissão para realizar esta operação."));
    }

    // Semântica OR: o atributo aceita várias permissões e basta ter UMA. Um endpoint marcado com
    // (ViewStock, ManageStock) tem de liberar quem só consulta.
    [Test]
    public async Task Require_MultiplePermissions_PassesWhenEmployeeHoldsAnyOfThem()
    {
        var harness = new PermissionHarness()
            .SignedInAs("Employee")
            .WithEmployeeHolding(Permission.ViewStock);

        await harness.Build().RequireAsync(Permission.ViewStock, Permission.ManageStock);
    }

    [Test]
    public void Require_MultiplePermissions_ThrowsWhenEmployeeHoldsNoneOfThem()
    {
        var harness = new PermissionHarness()
            .SignedInAs("Employee")
            .WithEmployeeHolding(Permission.SellProducts);

        Assert.ThrowsAsync<UnauthorizedException>(
            () => harness.Build().RequireAsync(Permission.ViewStock, Permission.ManageStock));
    }

    // A permissão é consultada no cargo do funcionário DAQUELE tenant. É o que impede o cargo de
    // uma loja de valer noutra.
    [Test]
    public async Task Require_Employee_ChecksMembershipOfTheActiveTenantOnly()
    {
        var activeTenant = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var harness = new PermissionHarness()
            .SignedInAs("Employee", userId, activeTenant)
            .WithEmployeeHolding(Permission.ViewStock);

        await harness.Build().RequireAsync(Permission.ViewStock);

        harness.Employees.Verify(r => r.GetByUserIdAsync(userId, activeTenant), Times.Once);
    }

    // ── Recusas defensivas ──────────────────────────────────────────────────────────────────

    // Token de funcionário cujo Employee sumiu (vínculo removido) não pode virar acesso.
    [Test]
    public void Require_EmployeeWithoutEmployeeRecord_ThrowsUnauthorized()
    {
        var harness = new PermissionHarness().SignedInAs("Employee").WithNoEmployeeRecord();

        var ex = Assert.ThrowsAsync<UnauthorizedException>(
            () => harness.Build().RequireAsync(Permission.ViewStock));

        Assert.That(ex.Message, Is.EqualTo("Funcionário não encontrado."));
    }

    // Um papel desconhecido (enum novo, token adulterado) tem de cair no caminho restritivo, nunca
    // ser tratado como Owner.
    [Test]
    public void Require_UnknownRole_FallsIntoTheRestrictivePath()
    {
        var harness = new PermissionHarness().SignedInAs("Gerente").WithNoEmployeeRecord();

        Assert.ThrowsAsync<UnauthorizedException>(() => harness.Build().RequireAsync(Permission.ViewStock));
    }

    [Test]
    public void Require_SessionWithoutRoleClaim_ThrowsUnauthorized()
    {
        var harness = new PermissionHarness().SignedInWithoutRole().WithNoEmployeeRecord();

        Assert.ThrowsAsync<UnauthorizedException>(() => harness.Build().RequireAsync(Permission.ViewStock));
    }

    [Test]
    public void Require_WithoutHttpContext_ThrowsUnauthorized()
    {
        var harness = new PermissionHarness().WithoutHttpContext();

        var ex = Assert.ThrowsAsync<UnauthorizedException>(
            () => harness.Build().RequireAsync(Permission.ViewStock));

        Assert.That(ex.Message, Is.EqualTo("Contexto HTTP não disponível."));
    }

    // Chamada sem permissão nenhuma é erro de programação (atributo mal usado) — falhar fechado.
    [Test]
    public void Require_NoPermissionsInformed_ThrowsUnauthorized()
    {
        var harness = new PermissionHarness().SignedInAs("Owner");

        var ex = Assert.ThrowsAsync<UnauthorizedException>(() => harness.Build().RequireAsync());

        Assert.That(ex.Message, Is.EqualTo("Nenhuma permissão informada."));
    }
}
