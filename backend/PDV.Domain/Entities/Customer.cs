namespace PDV.Domain.Entities;

public class Customer : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Document { get; set; }
    public string Note { get; set; } = string.Empty;

    // Endereço armazenado como colunas planas
    public string? AddressStreet { get; set; }
    public string? AddressNumber { get; set; }
    public string? AddressCity { get; set; }
    public string? AddressState { get; set; }
    public string? AddressZipCode { get; set; }
}
