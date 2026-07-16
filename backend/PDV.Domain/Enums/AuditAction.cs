namespace PDV.Domain.Enums;

// Ação registrada em um AuditLog. O DetailsJson varia conforme a ação.
public enum AuditAction
{
    ProductPriceChanged,
    ServicePriceChanged,
    StockMovement,
    AppointmentStatusChanged,
    ProductDeactivated,
    ServiceDeactivated,
    CustomerDeactivated,
    EmployeeDeactivated,
    RolePermissionsChanged,

    // Registros de acesso (Marco Civil art. 15). Retenção de 6 meses (ver RetentionPolicy).
    UserLoggedIn,
    UserLoggedOut,
}
