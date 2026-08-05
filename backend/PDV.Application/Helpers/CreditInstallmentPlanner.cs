namespace PDV.Application.Helpers;

// Fonte ÚNICA da matemática do parcelamento do crediário.
//
// Invariante inegociável: a soma das parcelas é EXATAMENTE igual ao valor financiado.
// Dividir 100,00 em 3 dá 33,3333... — arredondar cada parcela para 2 casas produziria
// 99,99 e o cliente ficaria devendo um centavo fantasma para sempre. O resíduo vai todo
// na PRIMEIRA parcela (padrão do varejo brasileiro: a diferença é cobrada logo).
public static class CreditInstallmentPlanner
{
    public record PlannedInstallment(int Number, DateTime DueDate, decimal Amount);

    public static IReadOnlyList<PlannedInstallment> Build(
        decimal totalAmount, int installmentCount, DateTime firstDueDate)
    {
        if (installmentCount < 1)
            throw new ArgumentOutOfRangeException(nameof(installmentCount), "Número de parcelas deve ser >= 1.");

        var baseAmount = Math.Round(totalAmount / installmentCount, 2, MidpointRounding.ToZero);
        var remainder = totalAmount - (baseAmount * installmentCount);
        var firstDue = firstDueDate.Date;

        var result = new List<PlannedInstallment>(installmentCount);
        for (var i = 0; i < installmentCount; i++)
        {
            var amount = i == 0 ? baseAmount + remainder : baseAmount;
            result.Add(new PlannedInstallment(i + 1, firstDue.AddMonths(i), amount));
        }

        return result;
    }
}
