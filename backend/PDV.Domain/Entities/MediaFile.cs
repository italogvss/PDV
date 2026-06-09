using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class MediaFile : BaseEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;       // FK com cascade delete
    public MediaCategory Category { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public Guid EntityId { get; set; }                // Id da entidade dona da imagem
}
