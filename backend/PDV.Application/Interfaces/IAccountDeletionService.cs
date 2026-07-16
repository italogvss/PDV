using PDV.Application.DTOs.Account;

namespace PDV.Application.Interfaces;

// Encerramento de conta (LGPD). Owner-only. Cancela a assinatura seguindo as regras de cancelamento,
// agenda a exclusão de todas as lojas do Owner para o fim da carência e bloqueia o uso durante ela.
public interface IAccountDeletionService
{
    // Estado da assinatura + caminhos disponíveis, para o diálogo de confirmação.
    Task<AccountDeletionPreview> PreviewAsync();

    // Solicita o encerramento: cancela a assinatura, grava as flags do User, agenda as lojas e cria o
    // ledger de conformidade.
    Task<AccountDeletionResult> RequestAsync(RequestAccountDeletionRequest request);

    // Reverte o encerramento durante a carência (não ressuscita a assinatura — o Owner precisa
    // reassinar para voltar a ter plano).
    Task CancelAsync();

    // Estado corrente (banner/tela global e /me).
    Task<AccountDeletionStatusResponse> GetStatusAsync();
}
