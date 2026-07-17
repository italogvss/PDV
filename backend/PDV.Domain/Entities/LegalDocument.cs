using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Documento legal (Termos de Uso, Política de Privacidade). Entidade GLOBAL — sem TenantId,
// sem query filter, igual a Announcement/Plan. Uma linha por LegalDocumentType, editada via
// AdminController e lida publicamente (app + landing page) via LegalController.
public class LegalDocument : BaseEntity
{
    public LegalDocumentType Type { get; set; }

    // Conteúdo em markdown — renderizado pelo MarkdownRenderer do frontend e, na landing page,
    // convertido para HTML no navegador.
    public string Content { get; set; } = string.Empty;
}
