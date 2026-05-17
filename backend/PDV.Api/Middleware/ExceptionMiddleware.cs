using System.Text.Json;
using FluentValidation;
using PDV.Domain.Exceptions;

namespace PDV.Api.Middleware;

public class ExceptionMiddleware(RequestDelegate next, IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex, env);
        }
    }

    private static Task HandleAsync(HttpContext context, Exception ex, IHostEnvironment env)
    {
        var (status, title, detail) = ex switch
        {
            ValidationException ve => (400, "Dados inválidos.", FormatValidationErrors(ve)),
            UnauthorizedException ue => (401, ue.Message, (string?)null),
            NotFoundException nfe => (404, nfe.Message, (string?)null),
            BusinessException be => (422, be.Message, (string?)null),
            _ => (500, "Ocorreu um erro interno.", env.IsDevelopment() ? ex.ToString() : (string?)null)
        };

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";

        var body = JsonSerializer.Serialize(new
        {
            type = "https://tools.ietf.org/html/rfc7807",
            title,
            status,
            detail
        }, new JsonSerializerOptions { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull });

        return context.Response.WriteAsync(body);
    }

    private static string FormatValidationErrors(ValidationException ve) =>
        string.Join(" | ", ve.Errors.Select(e => e.ErrorMessage));
}
