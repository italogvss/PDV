using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.Helpers;

namespace PDV.Api.Controllers;

// Metadados do eixo de Access Control (módulos, permissões e o mapa módulo→permissões).
// Dados estáticos derivados dos enums + ModuleCatalog — fonte única para o frontend.
[ApiController]
[Route("api/access")]
[Authorize]
public class AccessController : ControllerBase
{
    [HttpGet("metadata")]
    public IActionResult GetMetadata() => Ok(AccessMetadata.Build());
}
