using PDV.Application.DTOs.Legal;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class LegalDocumentService(ILegalDocumentRepository repository) : ILegalDocumentService
{
    public async Task<LegalDocumentResponse> GetByTypeAsync(LegalDocumentType type)
    {
        var doc = await repository.GetByTypeAsync(type)
            ?? throw new NotFoundException("Documento legal não encontrado.");
        return new LegalDocumentResponse(doc.Type.ToString(), doc.Content, doc.UpdatedAt);
    }
}
