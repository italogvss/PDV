namespace PDV.Domain.Exceptions;

public class UnauthorizedException(string title, string? detail = null)
    : AppException(title, detail, 401);
