using Microsoft.AspNetCore.Mvc.Filters;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Attributes;

// Gating 402 por módulo de plano. Resolve o plano efetivo do tenant (via Owner) e bloqueia o
// acesso (PaymentRequiredException → 402) quando o módulo não está incluído no plano.
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequireModuleAttribute(OperationModule module) : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var service = context.HttpContext.RequestServices.GetRequiredService<IEntitlementService>();
        await service.RequireModuleAsync(module);
        await next();
    }
}
