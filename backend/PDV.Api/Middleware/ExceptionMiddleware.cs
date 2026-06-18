using System.Text.Json;
using System.Text.Json.Serialization;
using FluentValidation;
using PDV.Domain.Exceptions;

namespace PDV.Api.Middleware;

public class ExceptionMiddleware(
    RequestDelegate next,
    IHostEnvironment env,
    ILogger<ExceptionMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private Task HandleAsync(HttpContext context, Exception ex)
    {
        int status;
        string title;
        string? detail;
        string? code = null;

        switch (ex)
        {
            case ValidationException ve:
                status = 400;
                title = "Dados inválidos.";
                detail = FormatValidationErrors(ve);
                logger.LogWarning("[{Status}] {Title} | {Detail}", status, title, detail);
                break;

            case AppException appEx:
                status = appEx.HttpStatus;
                title = appEx.Title;
                detail = appEx.Detail;
                code = appEx.Code;
                logger.LogWarning(
                    "[{Status}] {Title}{Detail}",
                    status, title,
                    detail is not null ? $" | {detail}" : string.Empty);
                break;

            default:
                status = 500;
                title = "Ocorreu um erro interno.";
                detail = env.IsDevelopment() ? ex.ToString() : null;
                logger.LogError(
                    ex,
                    "Unhandled exception on {Method} {Path}",
                    context.Request.Method,
                    context.Request.Path);
                break;
        }

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";

        var body = JsonSerializer.Serialize(
            new { type = "https://tools.ietf.org/html/rfc7807", title, status, detail, code },
            JsonOptions);

        return context.Response.WriteAsync(body);
    }

    private static string FormatValidationErrors(ValidationException ve) =>
        string.Join(" | ", ve.Errors.Select(e => e.ErrorMessage));
}
