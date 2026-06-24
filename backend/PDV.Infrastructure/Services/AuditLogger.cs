using System.Text.Json;
using System.Text.Json.Serialization;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class AuditLogger(
    AppDbContext context,
    ITenantContext tenantContext,
    IUserContext userContext) : IAuditLogger
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter() },
    };

    // Autor resolvido uma vez por request (logger é scoped) — evita lookups repetidos
    // quando uma mesma operação gera vários logs (ex.: venda com múltiplos produtos).
    private (Guid Id, string Name)? _performer;

    public Task LogProductPriceChangedAsync(Guid productId, string productName, decimal oldPrice, decimal newPrice) =>
        AddAsync(AuditAction.ProductPriceChanged, AuditEntityType.Product, productId, productName,
            new { oldPrice, newPrice });

    public Task LogServicePriceChangedAsync(Guid serviceId, string serviceName, decimal oldPrice, decimal newPrice) =>
        AddAsync(AuditAction.ServicePriceChanged, AuditEntityType.Service, serviceId, serviceName,
            new { oldPrice, newPrice });

    public Task LogStockMovementAsync(
        Guid productId, string productName, StockMovementType type, int quantity,
        decimal? unitCost = null, Guid? supplierId = null, string? supplierName = null, string? note = null) =>
        AddAsync(AuditAction.StockMovement, AuditEntityType.Product, productId, productName,
            new { type, quantity, unitCost, supplierId, supplierName, note });

    public Task LogAppointmentStatusChangedAsync(
        Guid appointmentId, string appointmentName, AppointmentStatus fromStatus, AppointmentStatus toStatus) =>
        AddAsync(AuditAction.AppointmentStatusChanged, AuditEntityType.Appointment, appointmentId, appointmentName,
            new { fromStatus, toStatus });

    public Task LogProductDeactivatedAsync(Guid productId, string productName) =>
        AddAsync(AuditAction.ProductDeactivated, AuditEntityType.Product, productId, productName, null);

    public Task LogServiceDeactivatedAsync(Guid serviceId, string serviceName) =>
        AddAsync(AuditAction.ServiceDeactivated, AuditEntityType.Service, serviceId, serviceName, null);

    public Task LogCustomerDeactivatedAsync(Guid customerId, string customerName) =>
        AddAsync(AuditAction.CustomerDeactivated, AuditEntityType.Customer, customerId, customerName, null);

    public Task LogEmployeeDeactivatedAsync(Guid employeeId, string employeeName) =>
        AddAsync(AuditAction.EmployeeDeactivated, AuditEntityType.Employee, employeeId, employeeName, null);

    public Task LogRolePermissionsChangedAsync(
        Guid roleId, string roleName, IEnumerable<Permission> before, IEnumerable<Permission> after) =>
        AddAsync(AuditAction.RolePermissionsChanged, AuditEntityType.TenantRole, roleId, roleName,
            new
            {
                before = before.Select(p => p.ToString()).ToArray(),
                after = after.Select(p => p.ToString()).ToArray(),
            });

    private async Task AddAsync(
        AuditAction action, AuditEntityType entityType, Guid? entityId, string entityName, object? details)
    {
        var (userId, userName) = await ResolvePerformerAsync();

        await context.AuditLogs.AddAsync(new AuditLog
        {
            TenantId = tenantContext.TenantId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            EntityName = entityName,
            PerformedByUserId = userId,
            PerformedByName = userName,
            DetailsJson = details is null ? null : JsonSerializer.Serialize(details, JsonOptions),
        });
    }

    private async Task<(Guid Id, string Name)> ResolvePerformerAsync()
    {
        if (_performer is not null) return _performer.Value;

        var userId = userContext.UserId;
        var user = await context.Users.FindAsync(userId);
        _performer = (userId, user?.Name ?? string.Empty);
        return _performer.Value;
    }
}
