namespace PDV.Domain.Constants;

// Parâmetros do trial controlado pelo PDV (não pelo gateway). O acesso gratuito de 30 dias é
// concedido na criação do tenant quando um plano é escolhido na landing — sem cartão, uma vez
// por usuário (User.HasUsedTrial).
public static class TrialDefaults
{
    public const int DurationDays = 30;
}
