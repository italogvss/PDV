using PDV.Application.DTOs.Legal;
using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

public interface ILegalDocumentService
{
    // Conteúdo vigente de um documento legal (Termos de Uso, Política de Privacidade). Leitura
    // pública — usada pelo app e pela landing page.
    Task<LegalDocumentResponse> GetByTypeAsync(LegalDocumentType type);
}
