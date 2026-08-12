using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Application.Helpers;

/// <summary>
/// Fonte única da taxa cobrada por forma de pagamento. Dois lugares capturam dinheiro — a venda
/// (<c>SaleService.CreateAsync</c>) e a baixa de parcela do crediário (<c>CreditService.ReceiveAsync</c>)
/// — e ambos precisam congelar a MESMA taxa, senão o relatório de taxas mistura dois critérios.
/// </summary>
public static class PaymentFees
{
    /// <summary>Taxa (%) do método, ou 0 quando o tenant não cobra taxa / não tem settings.</summary>
    public static decimal RateFor(TenantSettings? settings, PaymentMethod method)
    {
        if (settings is not { PaymentFeesEnabled: true })
            return 0m;

        return method switch
        {
            PaymentMethod.CreditCard => settings.PaymentCardCreditFee,
            PaymentMethod.DebitCard  => settings.PaymentCardDebitFee,
            PaymentMethod.PIX        => settings.PaymentPixFee,
            PaymentMethod.Cash       => settings.PaymentCashFee,
            _                        => 0m,
        };
    }

    /// <summary>Valor da taxa sobre o montante capturado, arredondado a 2 casas (como na venda).</summary>
    public static decimal AmountFor(decimal capturedAmount, decimal rate) =>
        Math.Round(capturedAmount * (rate / 100m), 2);
}
