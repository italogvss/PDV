using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

// LegalDocument é GLOBAL (sem query filter) — ver AppDbContext.
public class LegalDocumentRepository(AppDbContext context) : ILegalDocumentRepository
{
    public async Task<LegalDocument?> GetByTypeAsync(LegalDocumentType type) =>
        await context.LegalDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Type == type);
}
