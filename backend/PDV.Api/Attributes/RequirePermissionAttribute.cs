using Microsoft.AspNetCore.Mvc.Filters;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Attributes;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequirePermissionAttribute(params Permission[] permissions) : Attribute, IAsyncActionFilter
{
    // Semântica OR: aprova se o usuário tiver QUALQUER uma das permissões informadas.
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var service = context.HttpContext.RequestServices.GetRequiredService<IPermissionService>();
        await service.RequireAsync(permissions);
        await next();
    }
}
