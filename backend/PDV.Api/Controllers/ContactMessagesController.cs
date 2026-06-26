using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.ContactMessages;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/contact-messages")]
[Authorize(Roles = "Owner")]
public class ContactMessagesController(IContactMessageService service) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateContactMessageRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/contact-messages/{result.Id}", result);
    }
}
