using Microsoft.AspNetCore.Mvc.Filters;
using PDV.Application.Interfaces;

namespace PDV.Api.Attributes;

// Gating 402 por capability de plano (eixo único: módulos + sub-features). Resolve o plano efetivo
// do tenant (via Owner) e bloqueia (PaymentRequiredException → 402 NOT_IN_PLAN) quando a chave não
// está inclusa. Usar em endpoints de escopo total (ex.: upload de imagem, export). Para gates
// condicionais (parcelas>1, desconto>0, custo, recorrência) chamar IEntitlementService no service.
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequireEntitlementAttribute(string entitlementKey) : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var service = context.HttpContext.RequestServices.GetRequiredService<IEntitlementService>();
        await service.RequireEntitlementAsync(entitlementKey);
        await next();
    }
}
