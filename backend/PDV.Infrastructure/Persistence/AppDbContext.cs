using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<UserTenant> UserTenants => Set<UserTenant>();
    public DbSet<TenantSettings> TenantSettings => Set<TenantSettings>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<ExternalAuth> ExternalAuths => Set<ExternalAuth>();
    public DbSet<LocalAuth> LocalAuths => Set<LocalAuth>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<EmployeeSalaryLink> EmployeeSalaryLinks => Set<EmployeeSalaryLink>();
    public DbSet<TenantRole> TenantRoles => Set<TenantRole>();
    public DbSet<TenantRolePermission> TenantRolePermissions => Set<TenantRolePermission>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<ServiceCategory> ServiceCategories => Set<ServiceCategory>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentServiceItem> AppointmentServiceItems => Set<AppointmentServiceItem>();
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // Cobrança/assinaturas. Plan e WebhookEvent são GLOBAIS; Subscription/GatewayCustomer/Payment
    // são scoped por UserId (Owner) — nenhuma recebe HasQueryFilter de tenant (ver OnModelCreating).
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<GatewayCustomer> GatewayCustomers => Set<GatewayCustomer>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<WebhookEvent> WebhookEvents => Set<WebhookEvent>();

    // Avisos editoriais (Announcement) e marcadores de "visto" por usuário (UserSeenMarker).
    // Ambos GLOBAIS — sem query filter de tenant (Announcement é compartilhado; UserSeenMarker
    // é scoped por UserId e filtrado explicitamente nos repositórios).
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<UserSeenMarker> UserSeenMarkers => Set<UserSeenMarker>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<Product>()
            .HasQueryFilter(p => p.TenantId == tenantContext.TenantId && p.IsActive);

        modelBuilder.Entity<ProductCategory>()
            .HasQueryFilter(c => c.TenantId == tenantContext.TenantId && c.IsActive);

        // Sale usa SaleStatus para ciclo de vida; IsActive (herdado de BaseEntity) nunca é alterado.
        modelBuilder.Entity<Sale>()
            .HasQueryFilter(s => s.TenantId == tenantContext.TenantId);

        // Expense é hard-deleted (sem soft-delete); IsActive (herdado de BaseEntity) nunca é alterado.
        modelBuilder.Entity<Expense>()
            .HasQueryFilter(e => e.TenantId == tenantContext.TenantId);

        modelBuilder.Entity<Employee>()
            .HasQueryFilter(e => e.TenantId == tenantContext.TenantId && e.IsActive);

        // EmployeeSalaryLink é hard-deleted; IsActive não existe nessa entidade.
        modelBuilder.Entity<EmployeeSalaryLink>()
            .HasQueryFilter(l => l.TenantId == tenantContext.TenantId);

        modelBuilder.Entity<TenantRole>()
            .HasQueryFilter(r => r.TenantId == tenantContext.TenantId && r.IsActive);

        modelBuilder.Entity<Customer>()
            .HasQueryFilter(c => c.TenantId == tenantContext.TenantId && c.IsActive);

        modelBuilder.Entity<Supplier>()
            .HasQueryFilter(s => s.TenantId == tenantContext.TenantId && s.IsActive);

        modelBuilder.Entity<Service>()
            .HasQueryFilter(s => s.TenantId == tenantContext.TenantId && s.IsActive);

        modelBuilder.Entity<ServiceCategory>()
            .HasQueryFilter(c => c.TenantId == tenantContext.TenantId && c.IsActive);

        modelBuilder.Entity<Appointment>()
            .HasQueryFilter(a => a.TenantId == tenantContext.TenantId && a.IsActive);

        modelBuilder.Entity<MediaFile>()
            .HasQueryFilter(m => m.TenantId == tenantContext.TenantId && m.IsActive);

        modelBuilder.Entity<AuditLog>()
            .HasQueryFilter(l => l.TenantId == tenantContext.TenantId);

        // Entidades de cobrança NÃO recebem query filter de tenant: a cobrança pertence ao Owner
        // (UserId) e cobre todas as lojas dele; o webhook (anônimo) precisa lê-las sem tenant context.
        // O isolamento por UserId é feito explicitamente nos repositórios.
    }
}
