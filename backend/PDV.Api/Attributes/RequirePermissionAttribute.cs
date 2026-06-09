using Microsoft.AspNetCore.Mvc.Filters;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Attributes;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequirePermissionAttribute(Permission permission) : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var service = context.HttpContext.RequestServices.GetRequiredService<IPermissionService>();
        await service.RequireAsync(permission);
        await next();
    }
}
