using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;

namespace PDV.Api.Controllers;

// Documentos legais (Termos de Uso, Política de Privacidade) — leitura pública, sem autenticação.
// Consumido pelo app (Configurações) e pela landing page (origem diferente, ver policy "PublicLegal").
[ApiController]
[AllowAnonymous]
[EnableCors("PublicLegal")]
[Route("api/legal")]
public class LegalController(ILegalDocumentService service) : ControllerBase
{
    [HttpGet("{type}")]
    public async Task<IActionResult> GetByType(string type) =>
        Ok(await service.GetByTypeAsync(ParseSlug(type)));

    private static LegalDocumentType ParseSlug(string slug) => slug switch
    {
        "termos-de-uso" => LegalDocumentType.TermsOfUse,
        "politica-de-privacidade" => LegalDocumentType.PrivacyPolicy,
        _ => throw new NotFoundException("Documento legal não encontrado."),
    };
}
