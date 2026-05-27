namespace PDV.Domain.Exceptions;

public abstract class AppException(string title, string? detail, int httpStatus) : Exception(title)
{
    public string Title { get; } = title;
    public string? Detail { get; } = detail;
    public int HttpStatus { get; } = httpStatus;
}
