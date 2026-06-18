namespace PDV.Domain.Exceptions;

// 502 Bad Gateway — falha ao comunicar com o gateway de pagamentos (AbacatePay) ou
// resposta de erro retornada por ele. Carrega a mensagem original do gateway no `detail`.
public class PaymentGatewayException(string title, string? detail = null)
    : AppException(title, detail, 502);
