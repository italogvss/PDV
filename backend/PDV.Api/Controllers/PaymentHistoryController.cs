using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize(Roles = "Owner,Admin")]
public class PaymentHistoryController(IPaymentHistoryService service) : ControllerBase
{
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        => Ok(await service.GetHistoryAsync(page, pageSize));
}
