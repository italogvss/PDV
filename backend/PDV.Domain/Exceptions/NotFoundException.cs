namespace PDV.Domain.Exceptions;

public class NotFoundException(string title, string? detail = null)
    : AppException(title, detail, 404);
