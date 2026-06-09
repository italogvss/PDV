namespace PDV.Domain.Entities;

public class Service : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public Guid? CategoryId { get; set; }
    public string? ImageUrl { get; set; } // {tenantId}/service/{serviceId}.webp

    public ServiceCategory? Category { get; set; }
}
