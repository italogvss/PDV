using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces.Payments;
using PDV.Domain.Exceptions;
using Stripe;
using Stripe.Checkout;
// A pasta Services do PDV expõe `CustomerService`/`SubscriptionService` próprios, que venceriam a
// busca de nome dentro deste namespace aninhado. Os aliases removem a ambiguidade.
using StripeCustomers = Stripe.CustomerService;
using StripeSubscriptions = Stripe.SubscriptionService;

namespace PDV.Infrastructure.Services.Payments.Stripe;

// Traduz os modelos neutros do domínio para a API do Stripe. Nenhum tipo do Stripe escapa daqui.
//
// Mapa de conceitos:
//   Plan.ExternalProductId  → Price   (price_...)    — o produto é só um rótulo; quem cobra é o preço
//   GatewayCustomer         → Customer (cus_...)
//   Subscription            → Subscription (sub_...)
//   Payment (paga)          → PaymentIntent (pi_...)
//   Payment (recusada)      → Invoice (in_...)
//   PendingPlanId           → SubscriptionSchedule (sub_sched_...)
public class StripeGateway(IStripeClient client, ILogger<StripeGateway> logger) : IPaymentGateway
{
    public const string ProviderName = "Stripe";
    public string Provider => ProviderName;

    private readonly StripeCustomers _customers = new(client);
    private readonly SessionService _sessions = new(client);
    private readonly StripeSubscriptions _subscriptions = new(client);
    private readonly SubscriptionScheduleService _schedules = new(client);
    private readonly InvoiceService _invoices = new(client);
    private readonly RefundService _refunds = new(client);
    private readonly PriceService _prices = new(client);
    private readonly PromotionCodeService _promotionCodes = new(client);

    // -----------------------------------------------------------------------
    // Cliente
    // -----------------------------------------------------------------------

    public async Task<GatewayCustomerResult> EnsureCustomerAsync(CustomerInfo info, CancellationToken ct = default)
    {
        // Reusa o cliente já existente com o mesmo e-mail em vez de criar duplicatas — cobre o caso
        // de o registro local (GatewayCustomer) ter se perdido sem que o Stripe soubesse.
        var found = await Guard(() => _customers.ListAsync(
            new CustomerListOptions { Email = info.Email, Limit = 1 }, cancellationToken: ct));

        var customer = found.Data.FirstOrDefault() ?? await Guard(() => _customers.CreateAsync(
            new CustomerCreateOptions
            {
                Email = info.Email,
                Name = info.Name,
                Phone = info.Cellphone,
                TaxIdData = TaxIdDataFor(info.TaxId),
                Metadata = info.Metadata?.ToDictionary(k => k.Key, v => v.Value),
            },
            cancellationToken: ct));

        // O Stripe guarda o documento numa sub-coleção (tax_ids), não num campo do cliente: ele
        // nunca "devolve" um documento que não mandamos. A sincronização de volta (RF-18) só tem
        // efeito real para os campos que ele de fato normaliza.
        return new GatewayCustomerResult(
            customer.Id, customer.Email ?? info.Email, customer.Name, info.TaxId, customer.Phone);
    }

    // CPF até 11 dígitos, CNPJ acima disso. Documento vazio → sem tax id.
    private static List<CustomerTaxIdDataOptions>? TaxIdDataFor(string? taxId)
    {
        var digits = new string((taxId ?? "").Where(char.IsAsciiDigit).ToArray());
        if (digits.Length is not (11 or 14)) return null;

        return [new CustomerTaxIdDataOptions { Type = digits.Length == 11 ? "br_cpf" : "br_cnpj", Value = digits }];
    }

    // -----------------------------------------------------------------------
    // Checkout
    // -----------------------------------------------------------------------

    public async Task<HostedCheckoutResult> CreateSubscriptionCheckoutAsync(SubscriptionCheckoutRequest request, CancellationToken ct = default)
    {
        var promotionCodeId = await ResolvePromotionCodeAsync(request.CouponCode, ct);
        var metadata = request.Metadata.ToDictionary(k => k.Key, v => v.Value);

        var session = await Guard(() => _sessions.CreateAsync(new SessionCreateOptions
        {
            Mode = "subscription",
            Customer = request.CustomerId,
            // Chave de correlação primária dos eventos de checkout (CG-9).
            ClientReferenceId = request.ExternalId,
            LineItems = [new SessionLineItemOptions { Price = request.PriceExternalId, Quantity = 1 }],
            SuccessUrl = request.CompletionUrl,
            CancelUrl = request.ReturnUrl,
            Metadata = metadata,
            // A metadata da SESSÃO não chega aos eventos customer.subscription.* nem invoice.*.
            // Só esta, que o Stripe copia para a assinatura criada — é dela que o webhook resolve
            // a assinatura numa renovação, meses depois, quando não há mais sessão de checkout.
            SubscriptionData = new SessionSubscriptionDataOptions { Metadata = metadata },
            // O domínio só modela cartão (GatewayPaymentMethod.Card) e a assinatura precisa de um
            // meio que renove sozinho. Fixar aqui impede que um método habilitado no painel entre
            // no checkout e produza um Payment cujo `Method` mente.
            PaymentMethodTypes = ["card"],
            // Espelha CheckoutDefaults.PendingTtlHours (24h, o teto do Stripe): passado o prazo a
            // sessão morre lá e o job expira a Subscription `Pending` aqui.
            ExpiresAt = DateTime.UtcNow.AddHours(24).AddMinutes(-5),
            Discounts = promotionCodeId is null
                ? null
                : [new SessionDiscountOptions { PromotionCode = promotionCodeId }],
        }, cancellationToken: ct));

        if (string.IsNullOrEmpty(session.Url))
            throw new PaymentGatewayException("O gateway não retornou a URL do checkout.");

        return new HostedCheckoutResult(session.Id, session.Url);
    }

    // O usuário digita o código; o Stripe cobra o id (`promo_...`). Um código inválido é erro do
    // usuário (400), não falha de integração (502).
    private async Task<string?> ResolvePromotionCodeAsync(string? code, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;

        var found = await Guard(() => _promotionCodes.ListAsync(
            new PromotionCodeListOptions { Code = code, Active = true, Limit = 1 }, cancellationToken: ct));

        return found.Data.FirstOrDefault()?.Id
            ?? throw new BusinessException("Cupom inválido ou expirado.");
    }

    // -----------------------------------------------------------------------
    // Troca de plano
    // -----------------------------------------------------------------------

    public async Task<PlanUpgradeResult> UpgradeSubscriptionAsync(string gatewaySubscriptionId, string newPriceExternalId, CancellationToken ct = default)
    {
        var subscription = await GetSubscriptionAsync(gatewaySubscriptionId, ct);
        var item = FirstItemOf(subscription);

        var updated = await Guard(() => _subscriptions.UpdateAsync(gatewaySubscriptionId, new SubscriptionUpdateOptions
        {
            Items = [new SubscriptionItemOptions { Id = item.Id, Price = newPriceExternalId }],
            // Cobra a diferença proporcional agora, numa fatura avulsa.
            ProrationBehavior = "always_invoice",
            // Cartão recusado derruba a chamada inteira, em vez de deixar a assinatura já no plano
            // novo com uma fatura em aberto — a troca é atômica do ponto de vista do usuário.
            PaymentBehavior = "error_if_incomplete",
            Expand = ["latest_invoice"],
        }, cancellationToken: ct));

        // Trocar para um preço de outro ciclo reancora o período; a resposta é a fonte da verdade.
        return new PlanUpgradeResult(CurrentPeriodEndOf(updated), (int)(updated.LatestInvoice?.AmountDue ?? 0));
    }

    public async Task<PlanUpgradePreview> PreviewUpgradeAsync(string gatewaySubscriptionId, string newPriceExternalId, CancellationToken ct = default)
    {
        var subscription = await GetSubscriptionAsync(gatewaySubscriptionId, ct);
        var item = FirstItemOf(subscription);

        try
        {
            var preview = await _invoices.CreatePreviewAsync(new InvoiceCreatePreviewOptions
            {
                Subscription = gatewaySubscriptionId,
                SubscriptionDetails = new InvoiceSubscriptionDetailsOptions
                {
                    Items = [new InvoiceSubscriptionDetailsItemOptions { Id = item.Id, Price = newPriceExternalId }],
                    ProrationBehavior = "always_invoice",
                    ProrationDate = DateTime.UtcNow,
                },
            }, cancellationToken: ct);

            // A linha do plano novo custeia até o fim do período — que a troca de ciclo pode mover.
            var lines = preview.Lines?.Data;
            var nextChargeAt = lines is { Count: > 0 } ? lines.Max(l => l.Period.End) : (DateTime?)null;

            return new PlanUpgradePreview((int)preview.AmountDue, nextChargeAt);
        }
        catch (StripeException ex)
        {
            // Preview é conveniência, não pré-requisito: sem ele o diálogo cai na mensagem genérica
            // ("será cobrada a diferença proporcional") em vez de quebrar a troca.
            logger.LogWarning(ex, "Não foi possível simular o upgrade da assinatura {SubscriptionId}.", gatewaySubscriptionId);
            return new PlanUpgradePreview(AmountDueNowCents: null, NextChargeAt: null);
        }
    }

    // O downgrade vira um subscription schedule de duas fases: a atual, intacta até o fim do
    // período já pago, e a seguinte, já no preço novo. Nada é cobrado nem creditado na troca.
    //
    // Reagendar recria o schedule do zero: a lista de fases de um schedule existente mistura fases
    // passadas e futuras, e reconstruí-la a partir da assinatura é mais simples do que decidir
    // qual delas é "a atual".
    public async Task<PlanDowngradeResult> ScheduleDowngradeAsync(string gatewaySubscriptionId, string newPriceExternalId, CancellationToken ct = default)
    {
        var subscription = await GetSubscriptionAsync(gatewaySubscriptionId, ct);
        if (!string.IsNullOrEmpty(subscription.ScheduleId))
            await ReleaseScheduleAsync(subscription.ScheduleId, ct);

        var schedule = await Guard(() => _schedules.CreateAsync(
            new SubscriptionScheduleCreateOptions { FromSubscription = gatewaySubscriptionId }, cancellationToken: ct));

        // Criado a partir da assinatura, o schedule nasce com exatamente uma fase: o período vigente.
        var current = schedule.Phases[0];

        var updated = await Guard(() => _schedules.UpdateAsync(schedule.Id, new SubscriptionScheduleUpdateOptions
        {
            // A última fase é aberta, então o schedule nunca "completa" — o end_behavior é só
            // garantia de que, se completasse, a assinatura sobreviveria a ele.
            EndBehavior = "release",
            Phases =
            [
                new SubscriptionSchedulePhaseOptions
                {
                    Items = [.. current.Items.Select(i => new SubscriptionSchedulePhaseItemOptions { Price = i.PriceId, Quantity = i.Quantity })],
                    StartDate = current.StartDate,
                    EndDate = current.EndDate,
                    ProrationBehavior = "none",
                },
                new SubscriptionSchedulePhaseOptions
                {
                    Items = [new SubscriptionSchedulePhaseItemOptions { Price = newPriceExternalId, Quantity = 1 }],
                    // Sem crédito e sem cobrança avulsa na virada: o ciclo novo simplesmente começa.
                    ProrationBehavior = "none",
                },
            ],
        }, cancellationToken: ct));

        return new PlanDowngradeResult(updated.Id, current.EndDate);
    }

    public Task ReleaseScheduleAsync(string scheduleId, CancellationToken ct = default) =>
        Guard(() => _schedules.ReleaseAsync(scheduleId, cancellationToken: ct));

    // -----------------------------------------------------------------------
    // Cancelamento e estorno
    // -----------------------------------------------------------------------

    // Idempotente: uma assinatura que já não existe (ou já foi cancelada) é o resultado desejado.
    public async Task CancelSubscriptionAsync(string gatewaySubscriptionId, CancellationToken ct = default)
    {
        try
        {
            var subscription = await _subscriptions.GetAsync(gatewaySubscriptionId, cancellationToken: ct);

            // Uma assinatura gerida por schedule não aceita cancelamento direto — cancelar o
            // schedule encerra os dois.
            if (!string.IsNullOrEmpty(subscription.ScheduleId))
            {
                await _schedules.CancelAsync(subscription.ScheduleId,
                    new SubscriptionScheduleCancelOptions { InvoiceNow = false, Prorate = false }, cancellationToken: ct);
                return;
            }

            if (subscription.Status == "canceled") return;

            await _subscriptions.CancelAsync(gatewaySubscriptionId,
                new SubscriptionCancelOptions { InvoiceNow = false, Prorate = false }, cancellationToken: ct);
        }
        catch (StripeException ex) when (IsMissing(ex))
        {
            logger.LogWarning("Assinatura {SubscriptionId} não existe mais no Stripe — cancelamento é no-op.", gatewaySubscriptionId);
        }
        catch (StripeException ex)
        {
            throw Wrap(ex, nameof(CancelSubscriptionAsync));
        }
    }

    public async Task<RefundResult> RefundAsync(string chargeReference, CancellationToken ct = default)
    {
        var refund = await Guard(() => _refunds.CreateAsync(
            new RefundCreateOptions { PaymentIntent = chargeReference, Reason = "requested_by_customer" },
            // Um retry desta chamada não pode devolver o dinheiro duas vezes.
            new RequestOptions { IdempotencyKey = $"refund:{chargeReference}" },
            ct));

        return new RefundResult(refund.Id, refund.Status, (int)refund.Amount);
    }

    // -----------------------------------------------------------------------
    // Catálogo
    // -----------------------------------------------------------------------

    public async Task<bool> PriceExistsAsync(string priceExternalId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(priceExternalId)) return false;

        try
        {
            var price = await _prices.GetAsync(priceExternalId, cancellationToken: ct);
            // Um preço avulso (sem `recurring`) não sustenta assinatura.
            return price is { Active: true, Recurring: not null };
        }
        catch (StripeException ex) when (IsMissing(ex))
        {
            return false;
        }
        catch (StripeException ex)
        {
            throw Wrap(ex, nameof(PriceExistsAsync));
        }
    }

    // -----------------------------------------------------------------------
    // Auxiliares
    // -----------------------------------------------------------------------

    private Task<global::Stripe.Subscription> GetSubscriptionAsync(string id, CancellationToken ct) =>
        Guard(() => _subscriptions.GetAsync(id, cancellationToken: ct));

    // O catálogo tem um item por assinatura (um plano, quantidade 1).
    private static SubscriptionItem FirstItemOf(global::Stripe.Subscription subscription) =>
        subscription.Items?.Data?.FirstOrDefault()
        ?? throw new PaymentGatewayException("A assinatura no gateway não tem itens.", subscription.Id);

    // O período vive no ITEM da assinatura, não nela (API 2025-06-30 em diante).
    private static DateTime CurrentPeriodEndOf(global::Stripe.Subscription subscription) =>
        FirstItemOf(subscription).CurrentPeriodEnd;

    private static bool IsMissing(StripeException ex) => ex.StripeError?.Code == "resource_missing";

    private static PaymentGatewayException Wrap(StripeException ex, string operation) =>
        new($"Falha na comunicação com o Stripe ({operation}).", ex.StripeError?.Message ?? ex.Message);

    private static async Task<T> Guard<T>(Func<Task<T>> call, [CallerMemberName] string operation = "")
    {
        try
        {
            return await call();
        }
        catch (StripeException ex)
        {
            throw Wrap(ex, operation);
        }
    }

    private static async Task Guard(Func<Task> call, [CallerMemberName] string operation = "")
    {
        try
        {
            await call();
        }
        catch (StripeException ex)
        {
            throw Wrap(ex, operation);
        }
    }
}
