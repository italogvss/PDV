using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Domain.Interfaces;

public interface ILegalDocumentRepository
{
    Task<LegalDocument?> GetByTypeAsync(LegalDocumentType type);
}
