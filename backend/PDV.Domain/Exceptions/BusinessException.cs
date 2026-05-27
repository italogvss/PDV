namespace PDV.Domain.Exceptions;

public class BusinessException(string title, string? detail = null)
    : AppException(title, detail, 422);
