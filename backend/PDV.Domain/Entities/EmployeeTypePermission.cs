using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Configura quais permissões cada EmployeeType tem dentro de um tenant.
// Cada tenant pode ter sua própria configuração — um Gerente no Tenant A
// pode ter permissões diferentes de um Gerente no Tenant B.
public class EmployeeTypePermission : BaseEntity
{
    public Guid TenantId { get; set; }
    public EmployeeType EmployeeType { get; set; }
    public Permission Permission { get; set; }
}
