using Moq;
using PDV.Application.DTOs.Subscriptions;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Billing;

// Fluxo: o usuário abre o portal hospedado do gateway para trocar o cartão e ver as faturas.
//
// O que precisa se manter verdadeiro:
//   1. só quem tem cliente no gateway (`cus_`) chega lá — trial é PDV-side e não tem nada a mostrar;
//   2. o portal NUNCA vira uma segunda porta para cancelar. Isso é garantido pela configuração no
//      Stripe (subscription_cancel/subscription_update desabilitados), não por código aqui — mas o
//      motivo é de negócio: o estorno da janela de 7 dias só existe no CancelAsync, e o webhook de
//      cancelamento não estorna. Cancelar pelo portal deixaria o usuário sem o dinheiro de volta.
[TestFixture]
public class BillingPortalTests
{
    private const string ReturnUrl = "https://app.kashing.com.br/configuracoes?tab=assinatura";
    private const string PortalUrl = "https://billing.stripe.com/p/session/test_123";

    private static SubscriptionHarness WithPortal(SubscriptionHarness harness)
    {
        harness.Gateway
            .Setup(g => g.CreatePortalSessionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(PortalUrl);
        return harness;
    }

    // ── Quem pode abrir ─────────────────────────────────────────────────────────────────────

    [Test]
    public async Task ActiveSubscription_OpensThePortalForItsOwnGatewayCustomer()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var harness = WithPortal(new SubscriptionHarness().WithSubscription(sub));

        var result = await harness.Build().CreatePortalSessionAsync(new PortalSessionRequest(ReturnUrl));

        Assert.That(result.Url, Is.EqualTo(PortalUrl));
        // O cus_ vem da assinatura do próprio usuário — nunca do cliente.
        harness.Gateway.Verify(g => g.CreatePortalSessionAsync(
            sub.GatewayCustomerId!, ReturnUrl, It.IsAny<CancellationToken>()), Times.Once);
    }

    // O trial não tem cliente no gateway: não há cartão nem fatura para gerenciar.
    [Test]
    public void T5_Trialing_HasNothingToManageAndNeverReachesTheGateway()
    {
        var harness = WithPortal(new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Trialing().Build()));

        Assert.ThrowsAsync<BusinessException>(() =>
            harness.Build().CreatePortalSessionAsync(new PortalSessionRequest(ReturnUrl)));

        harness.Gateway.Verify(g => g.CreatePortalSessionAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // Um Expired que veio de trial também nunca teve cliente no gateway — o status sozinho não
    // distingue os dois casos, o cus_ sim.
    [Test]
    public void ExpiredWithoutGatewayCustomer_HasNothingToManage()
    {
        var harness = WithPortal(new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Expired().Build()));

        Assert.ThrowsAsync<BusinessException>(() =>
            harness.Build().CreatePortalSessionAsync(new PortalSessionRequest(ReturnUrl)));
    }

    // Resquício do modo teste: o cus_ salvo não existe na conta live. Sem a checagem, o portal
    // estouraria 502 em vez de uma mensagem de negócio.
    [Test]
    public void StaleGatewayCustomer_HasNothingToManageAndNeverOpensThePortal()
    {
        var harness = WithPortal(new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Active().Build())
            .WithCustomerMissingAtGateway());

        Assert.ThrowsAsync<BusinessException>(() =>
            harness.Build().CreatePortalSessionAsync(new PortalSessionRequest(ReturnUrl)));

        harness.Gateway.Verify(g => g.CreatePortalSessionAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public void NoSubscription_IsNotFound()
    {
        var harness = WithPortal(new SubscriptionHarness().WithSubscription(null));

        Assert.ThrowsAsync<NotFoundException>(() =>
            harness.Build().CreatePortalSessionAsync(new PortalSessionRequest(ReturnUrl)));
    }

    [Test]
    public void MissingReturnUrl_IsRejectedBeforeTouchingTheGateway()
    {
        var harness = WithPortal(new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Active().Build()));

        Assert.ThrowsAsync<BusinessException>(() =>
            harness.Build().CreatePortalSessionAsync(new PortalSessionRequest(null)));

        harness.Gateway.Verify(g => g.CreatePortalSessionAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── /me: o flag que decide se o botão aparece ───────────────────────────────────────────

    [Test]
    public async Task Me_PaidSubscription_CanManageBilling()
    {
        var sub = SubscriptionBuilder.Active().Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithResolvedEntitlement(sub);

        var me = await harness.Build().GetMineAsync();

        Assert.That(me.CanManageBilling, Is.True);
    }

    [Test]
    public async Task Me_Trialing_CannotManageBilling()
    {
        var sub = SubscriptionBuilder.Trialing().Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithResolvedEntitlement(sub);

        var me = await harness.Build().GetMineAsync();

        Assert.That(me.CanManageBilling, Is.False, "Trial não tem cliente no gateway.");
    }

    // /me é liberado a qualquer usuário e resolve a assinatura pelo OWNER do tenant. Um Employee
    // enxerga a assinatura do dono — mas não pode gerenciá-la (o endpoint é Owner/Admin).
    [Test]
    public async Task Me_EmployeeSeesTheOwnersSubscription_ButCannotManageIt()
    {
        var ownersSub = SubscriptionBuilder.Active().OwnedBy(Guid.NewGuid()).Build();
        var harness = new SubscriptionHarness().WithResolvedEntitlement(ownersSub);

        var me = await harness.Build().GetMineAsync();

        Assert.Multiple(() =>
        {
            Assert.That(me.Status, Is.EqualTo("Active"), "O status é exibido normalmente.");
            Assert.That(me.CanManageBilling, Is.False, "A assinatura não é dele.");
        });
    }

    [Test]
    public async Task Me_NoSubscription_CannotManageBilling()
    {
        var harness = new SubscriptionHarness().WithResolvedEntitlement(null);

        var me = await harness.Build().GetMineAsync();

        Assert.That(me.CanManageBilling, Is.False);
    }
}
