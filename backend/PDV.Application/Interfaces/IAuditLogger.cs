using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

// Serviço centralizado de criação de logs de auditoria. Encapsula o cabeçalho fixo
// (tenant, autor, entidade) e a serialização do payload específico de cada ação.
//
// O autor (quem fez) é resolvido internamente via IUserContext — as services não passam.
// O registro é apenas adicionado ao AppDbContext; o SaveChanges fica a cargo do fluxo
// chamador (repositório ou transação da própria service), preservando a atomicidade.
public interface IAuditLogger
{
    Task LogProductPriceChangedAsync(Guid productId, string productName, decimal oldPrice, decimal newPrice);

    Task LogServicePriceChangedAsync(Guid serviceId, string serviceName, decimal oldPrice, decimal newPrice);

    Task LogStockMovementAsync(
        Guid productId, string productName, StockMovementType type, int quantity,
        decimal? unitCost = null, Guid? supplierId = null, string? supplierName = null, string? note = null);

    Task LogAppointmentStatusChangedAsync(
        Guid appointmentId, string appointmentName, AppointmentStatus fromStatus, AppointmentStatus toStatus);

    Task LogProductDeactivatedAsync(Guid productId, string productName);

    Task LogServiceDeactivatedAsync(Guid serviceId, string serviceName);

    Task LogCustomerDeactivatedAsync(Guid customerId, string customerName);

    Task LogEmployeeDeactivatedAsync(Guid employeeId, string employeeName);

    Task LogRolePermissionsChangedAsync(
        Guid roleId, string roleName, IEnumerable<Permission> before, IEnumerable<Permission> after);
}
