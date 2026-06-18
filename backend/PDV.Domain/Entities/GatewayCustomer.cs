namespace PDV.Domain.Entities;

// Mapeia o Owner (UserId) ao cliente no gateway. Cliente é único por CPF/CNPJ (pertence à
// pessoa, não à loja) — por isso é scoped por UserId, não por tenant.
public class GatewayCustomer : BaseEntity
{
    public Guid UserId { get; set; }

    public string Provider { get; set; } = string.Empty;
    public string GatewayCustomerId { get; set; } = string.Empty; // cust_...

    public string Email { get; set; } = string.Empty;
    public string? TaxId { get; set; }
    public string? Name { get; set; }
    public string? Cellphone { get; set; }
}
