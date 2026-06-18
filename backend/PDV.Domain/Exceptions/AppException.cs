namespace PDV.Domain.Exceptions;

public abstract class AppException(string title, string? detail, int httpStatus, string? code = null) : Exception(title)
{
    public string Title { get; } = title;
    public string? Detail { get; } = detail;
    public int HttpStatus { get; } = httpStatus;
    // Código estável opcional para o frontend tratar o erro (ex.: gating de plano).
    public string? Code { get; } = code;
}
