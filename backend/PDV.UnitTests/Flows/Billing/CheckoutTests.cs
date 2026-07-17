using Moq;
using PDV.Application.DTOs.Payments;
using PDV.Application.DTOs.Subscriptions;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Billing;

// Fluxo: o usuário contrata (ou reativa) um plano — docs/subscriptions.md §8.2, cenários C1–C9.
// O que não pode falhar: ninguém pode ser cobrado duas vezes (C5), e reassinar não pode deixar duas
// recorrências vivas no gateway (C3/RF-20). Nada aqui ativa a assinatura — quem ativa é o webhook.
[TestFixture]
public class CheckoutTests
{
    private static StartCheckoutRequest RequestFor(Plan plan, string? coupon = null) =>
        new(plan.Id, coupon, "https://app.kashing.com/assinatura/retorno", "https://app.kashing.com/assinatura/ok");

    // ── C1: primeira contratação ────────────────────────────────────────────────────────────

    [Test]
    public async Task C1_FirstCheckout_CreatesPendingSubscriptionAndReturnsHostedUrl()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness().WithSubscription(null).WithPlan(plan);

        var response = await harness.Build().StartCheckoutAsync(RequestFor(plan));

        Assert.Multiple(() =>
        {
            Assert.That(response.CheckoutUrl, Is.EqualTo(SubscriptionHarness.CheckoutUrl));
            Assert.That(harness.Subscription!.Status, Is.EqualTo(SubscriptionStatus.Pending));
            Assert.That(harness.Subscription.PlanId, Is.EqualTo(plan.Id));
            Assert.That(harness.Subscription.IsRenewable, Is.True);
            Assert.That(harness.Subscription.Provider, Is.EqualTo("Stripe"));
            Assert.That(harness.Added, Is.True);
        });
    }

    // A ativação vem SÓ por webhook (RF-17). Se o checkout ativasse, bastaria abrir a página para
    // usar de graça.
    [Test]
    public async Task C1_Checkout_NeverActivatesTheSubscriptionItself()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness().WithSubscription(null).WithPlan(plan);

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        Assert.Multiple(() =>
        {
            Assert.That(harness.Subscription!.Status, Is.Not.EqualTo(SubscriptionStatus.Active));
            Assert.That(harness.Subscription.StartedAt, Is.Null, "A janela de reembolso ancora no webhook.");
        });
    }

    // Nenhum Payment é criado no checkout: o gateway só emite a fatura (e o pi_/in_ que a
    // identificam) quando o pagamento acontece. Criar aqui deixaria lixo "Pendente" no extrato de
    // todo checkout abandonado.
    [Test]
    public async Task C2_Checkout_DoesNotCreateAnyPaymentRow()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness().WithSubscription(null).WithPlan(plan);

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        harness.Payments.Verify(r => r.AddAsync(It.IsAny<Payment>()), Times.Never);
    }

    // A metadata é o que amarra um webhook de renovação, meses depois, ao usuário certo — o Stripe
    // a copia para a assinatura e daí para toda fatura futura.
    [Test]
    public async Task C1_Checkout_SendsCorrelationMetadataToTheGateway()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness().WithSubscription(null).WithPlan(plan);

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        var sent = harness.CheckoutRequest!;
        Assert.Multiple(() =>
        {
            Assert.That(sent.Metadata["userId"], Is.EqualTo(harness.User.Id.ToString()));
            Assert.That(sent.Metadata["subscriptionId"], Is.EqualTo(harness.Subscription!.Id.ToString()));
            Assert.That(sent.ExternalId, Is.EqualTo(harness.Subscription.Id.ToString()),
                "client_reference_id é a chave de correlação primária do checkout.");
            Assert.That(sent.PriceExternalId, Is.EqualTo(plan.ExternalProductId));
        });
    }

    [Test]
    public async Task Checkout_WithCoupon_ForwardsItToTheGateway()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness().WithSubscription(null).WithPlan(plan);

        await harness.Build().StartCheckoutAsync(RequestFor(plan, coupon: "BLACKFRIDAY"));

        Assert.Multiple(() =>
        {
            Assert.That(harness.CheckoutRequest!.CouponCode, Is.EqualTo("BLACKFRIDAY"));
            Assert.That(harness.CheckoutRequest.Metadata["couponCode"], Is.EqualTo("BLACKFRIDAY"));
        });
    }

    // ── C5/C6: bloqueios de cobrança dupla ──────────────────────────────────────────────────

    // O ponto mais caro do fluxo: uma assinatura ativa e vigente não pode contratar de novo.
    [Test]
    public void C5_ActiveAndEntitled_CannotCheckoutAgain()
    {
        var plan = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Active(plan, periodDaysLeft: 20).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(plan);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().StartCheckoutAsync(RequestFor(plan)));

        Assert.That(ex.Message, Does.Contain("Sua assinatura está ativa até"),
            "A mensagem informa até quando — o usuário precisa saber quando poderá reassinar.");
    }

    [Test]
    public void C5_BlockedCheckout_NeverReachesTheGateway()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Active(plan, periodDaysLeft: 20).Build())
            .WithPlan(plan);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().StartCheckoutAsync(RequestFor(plan)));

        harness.Gateway.Verify(g => g.CreateSubscriptionCheckoutAsync(
            It.IsAny<SubscriptionCheckoutRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // T7: assinar durante o trial é bloqueado enquanto ele vige.
    [Test]
    public void T7_TrialingAndEntitled_CannotCheckout()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.Trialing(plan, daysLeft: 10).Build())
            .WithPlan(plan);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().StartCheckoutAsync(RequestFor(plan)));
    }

    // C6/X11: reassinar com estorno em trânsito faria o webhook de estorno derrubar a assinatura
    // NOVA — o evento chega depois e não sabe distinguir.
    [Test]
    public void C6_RefundRequested_CannotCheckout()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(SubscriptionBuilder.RefundRequested(plan).Build())
            .WithPlan(plan);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().StartCheckoutAsync(RequestFor(plan)));

        Assert.That(ex.Message, Does.Contain("reembolso"));
    }

    // Um Active com o período VENCIDO já perdeu o acesso (a renovação falhou) — tem de poder
    // reassinar. É o par de C5: o bloqueio é por entitlement, não pelo status.
    [Test]
    public async Task ActiveButExpiredPeriod_CanCheckoutAgain()
    {
        var plan = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Active(plan).WithPeriodEnd(DateTime.UtcNow.AddDays(-1)).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(plan);

        var response = await harness.Build().StartCheckoutAsync(RequestFor(plan));

        Assert.That(response.CheckoutUrl, Is.Not.Null);
    }

    // ── C3/C4: reativação reusa a MESMA linha ───────────────────────────────────────────────

    [TestCase(SubscriptionStatus.Expired)]
    [TestCase(SubscriptionStatus.Canceled)]
    [TestCase(SubscriptionStatus.Pending)]
    public async Task C3_Reactivation_ReusesTheSameSubscriptionRow(SubscriptionStatus status)
    {
        var plan = PlanBuilder.Essential().Build();
        var sub = status switch
        {
            SubscriptionStatus.Expired => SubscriptionBuilder.Expired(plan).Build(),
            SubscriptionStatus.Canceled => SubscriptionBuilder.Canceled(plan, periodDaysLeft: -5).Build(),
            _ => SubscriptionBuilder.Pending(plan).Build(),
        };
        var originalId = sub.Id;
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(plan);

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        Assert.Multiple(() =>
        {
            Assert.That(sub.Id, Is.EqualTo(originalId), "Uma assinatura por usuário — nunca cria uma segunda linha.");
            Assert.That(sub.Status, Is.EqualTo(SubscriptionStatus.Pending));
        });
        harness.Subscriptions.Verify(r => r.AddAsync(It.IsAny<Subscription>()), Times.Never);
        harness.Subscriptions.Verify(r => r.UpdateAsync(sub), Times.Once);
    }

    // RF-20: sem isto, quem reassina depois de uma renovação que falhou fica com DUAS recorrências
    // vivas no gateway — a antiga ainda em dunning, cobrando.
    [Test]
    public async Task C3_Reactivation_CancelsThePreviousGatewaySubscriptionFirst()
    {
        var plan = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Expired(plan).Build();
        sub.GatewaySubscriptionId = "sub_antiga_123";
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(plan);

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        harness.Gateway.Verify(g => g.CancelSubscriptionAsync("sub_antiga_123", It.IsAny<CancellationToken>()), Times.Once);
        Assert.That(sub.GatewaySubscriptionId, Is.Null, "Zerar libera o índice único para o sub_ novo.");
    }

    // Best-effort: se a recorrência antiga já não existe no gateway, o checkout novo não pode falhar.
    [Test]
    public async Task Reactivation_WhenGatewayCancelFails_CheckoutStillProceeds()
    {
        var plan = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Expired(plan).Build();
        sub.GatewaySubscriptionId = "sub_ja_cancelada";
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(plan);
        harness.Gateway.Setup(g => g.CancelSubscriptionAsync("sub_ja_cancelada", It.IsAny<CancellationToken>()))
               .ThrowsAsync(new PaymentGatewayException("No such subscription"));

        var response = await harness.Build().StartCheckoutAsync(RequestFor(plan));

        Assert.That(response.CheckoutUrl, Is.Not.Null);
    }

    // X6: a reativação zera StartedAt → o webhook grava um novo → janela de arrependimento NOVA.
    // O TTL de Pending também reconta daqui, senão o job expiraria a reativação no meio do checkout.
    [Test]
    public async Task X6_Reactivation_ResetsRefundWindowAndPendingTtlAnchors()
    {
        var plan = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Expired(plan).Build();
        sub.StartedAt = DateTime.UtcNow.AddMonths(-6);
        sub.GatewaySyncedAt = DateTime.UtcNow.AddMonths(-6);
        sub.UpdatedAt = DateTime.UtcNow.AddMonths(-6);
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(plan);

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        Assert.Multiple(() =>
        {
            Assert.That(sub.StartedAt, Is.Null, "Janela de reembolso nova — o webhook a reancora.");
            Assert.That(sub.GatewaySyncedAt, Is.Null, "A assinatura no gateway será outra: linha do tempo nova.");
            Assert.That(sub.TrialEndsAt, Is.Null);
            Assert.That(sub.UpdatedAt, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromMinutes(1)),
                "É daqui que o TTL de 24h do Pending conta.");
        });
    }

    // Reassinar descarta uma troca que estivesse agendada — ela pertencia à assinatura antiga.
    [Test]
    public async Task Reactivation_DiscardsAnyScheduledPlanChange()
    {
        var plan = PlanBuilder.Essential().Build();
        var sub = SubscriptionBuilder.Expired(plan).WithPendingPlan(PlanBuilder.Professional().Build()).Build();
        var harness = new SubscriptionHarness().WithSubscription(sub).WithPlan(plan);

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        Assert.Multiple(() =>
        {
            Assert.That(sub.PendingPlanId, Is.Null);
            Assert.That(sub.GatewayScheduleId, Is.Null);
        });
    }

    // ── Validações de entrada ───────────────────────────────────────────────────────────────

    [TestCase(null, "https://app/ok", TestName = "Checkout_WithoutReturnUrl_IsRejected")]
    [TestCase("https://app/retorno", null, TestName = "Checkout_WithoutCompletionUrl_IsRejected")]
    [TestCase("", "https://app/ok", TestName = "Checkout_WithEmptyReturnUrl_IsRejected")]
    public void Checkout_WithoutReturnUrls_IsRejected(string? returnUrl, string? completionUrl)
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness().WithSubscription(null).WithPlan(plan);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build()
            .StartCheckoutAsync(new StartCheckoutRequest(plan.Id, null, returnUrl, completionUrl)));
    }

    [Test]
    public void Checkout_UnknownPlan_ThrowsNotFound()
    {
        var planId = Guid.NewGuid();
        var harness = new SubscriptionHarness().WithSubscription(null).WithUnknownPlan(planId);

        Assert.ThrowsAsync<NotFoundException>(() => harness.Build()
            .StartCheckoutAsync(new StartCheckoutRequest(planId, null, "https://app/r", "https://app/c")));
    }

    // Catálogo local dessincronizado do gateway: o preço não existe mais lá. Deixar passar geraria
    // um checkout quebrado.
    [Test]
    public void Checkout_PlanPriceMissingAtGateway_ThrowsNotFound()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness()
            .WithSubscription(null)
            .WithPlan(plan)
            .WithPriceMissingAtGateway(plan.ExternalProductId);

        Assert.ThrowsAsync<NotFoundException>(() => harness.Build().StartCheckoutAsync(RequestFor(plan)));
    }

    // ── Cliente no gateway ──────────────────────────────────────────────────────────────────

    [Test]
    public async Task Checkout_WithoutLocalCustomer_CreatesOneAtGatewayAndPersistsIt()
    {
        var plan = PlanBuilder.Essential().Build();
        var harness = new SubscriptionHarness().WithSubscription(null).WithPlan(plan).WithoutGatewayCustomer();

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        harness.Gateway.Verify(g => g.EnsureCustomerAsync(It.IsAny<CustomerInfo>(), It.IsAny<CancellationToken>()), Times.Once);
        harness.Customers.Verify(r => r.AddAsync(It.Is<GatewayCustomer>(
            c => c.GatewayCustomerId == SubscriptionHarness.GatewayCustomerId)), Times.Once);
    }

    // RF-18: o gateway conhece CPF/telefone que o cadastro não tem — sincroniza de volta, sem
    // sobrescrever o que o usuário já preencheu.
    [Test]
    public async Task RF18_Checkout_BackfillsMissingDocumentAndPhoneFromGateway()
    {
        var plan = PlanBuilder.Essential().Build();
        var user = UserBuilder.AnOwner().InTenant(Guid.NewGuid()).Build();
        user.Document = null;
        user.Phone = null;
        var harness = new SubscriptionHarness().ForUser(user).WithSubscription(null).WithPlan(plan).WithoutGatewayCustomer();
        harness.Gateway.Setup(g => g.EnsureCustomerAsync(It.IsAny<CustomerInfo>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(new GatewayCustomerResult("cus_x", user.Email, user.Name, "12345678900", "11999998888"));

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        Assert.Multiple(() =>
        {
            Assert.That(user.Document, Is.EqualTo("12345678900"));
            Assert.That(user.Phone, Is.EqualTo("11999998888"));
        });
    }

    [Test]
    public async Task Checkout_DoesNotOverwriteExistingDocumentWithGatewayValue()
    {
        var plan = PlanBuilder.Essential().Build();
        var user = UserBuilder.AnOwner().InTenant(Guid.NewGuid()).Build();
        user.Document = "99999999999";
        var harness = new SubscriptionHarness().ForUser(user).WithSubscription(null).WithPlan(plan).WithoutGatewayCustomer();
        harness.Gateway.Setup(g => g.EnsureCustomerAsync(It.IsAny<CustomerInfo>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(new GatewayCustomerResult("cus_x", user.Email, user.Name, "11111111111", null));

        await harness.Build().StartCheckoutAsync(RequestFor(plan));

        Assert.That(user.Document, Is.EqualTo("99999999999"), "O dado do usuário manda sobre o do gateway.");
    }
}
