namespace PDV.Domain.Constants;

// Parâmetros do trial controlado pelo PDV (não pelo gateway). O acesso gratuito de 30 dias é
// concedido na criação do tenant quando um plano é escolhido na landing — sem cartão, uma vez
// por usuário (User.HasUsedTrial).
public static class TrialDefaults
{
    public const int DurationDays = 30;

    // Plano usado quando o slug escolhido não resolve (link antigo da landing, plano fora do
    // catálogo). O trial promete acesso completo, então o padrão é o plano que concede tudo.
    // Nunca deixar o usuário sem trial por causa de um slug ruim: era exatamente esse o bug em
    // que CTAs da landing mandavam `?plano=profissional` (sem ciclo) e a loja nascia sem assinatura.
    public const string FallbackPlanSlug = "profissional-mensal";
}
