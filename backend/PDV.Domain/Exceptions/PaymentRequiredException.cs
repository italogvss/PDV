namespace PDV.Domain.Exceptions;

// 402 Payment Required — recurso fora do plano efetivo do tenant ou limite numérico excedido.
public class PaymentRequiredException(string title, string? detail = null, string? code = null)
    : AppException(title, detail, 402, code);
