namespace PDV.Domain.Enums;

// Caminho escolhido pelo Owner ao encerrar a conta quando há assinatura vigente.
public enum AccountDeletionPath
{
    // Excluir agora: a carência de 30 dias começa imediatamente; o acesso cai no início da carência,
    // mesmo que restasse tempo pago (sem reembolso fora da janela de 7 dias).
    DeleteNow,

    // Agendar p/ o fim do plano: mantém o acesso até CurrentPeriodEnd; só depois começa a carência.
    AtPeriodEnd,
}
