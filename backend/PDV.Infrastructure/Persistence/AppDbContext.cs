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
    public DbSet<EmployeeTypePermission> EmployeeTypePermissions => Set<EmployeeTypePermission>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<Product>()
            .HasQueryFilter(p => p.TenantId == tenantContext.TenantId && p.IsActive);

        modelBuilder.Entity<ProductCategory>()
            .HasQueryFilter(c => c.TenantId == tenantContext.TenantId && c.IsActive);

        modelBuilder.Entity<Sale>()
            .HasQueryFilter(s => s.TenantId == tenantContext.TenantId);

        modelBuilder.Entity<Expense>()
            .HasQueryFilter(e => e.TenantId == tenantContext.TenantId);

        modelBuilder.Entity<Employee>()
            .HasQueryFilter(e => e.TenantId == tenantContext.TenantId && e.IsActive);

        modelBuilder.Entity<EmployeeTypePermission>()
            .HasQueryFilter(p => p.TenantId == tenantContext.TenantId && p.IsActive);

        modelBuilder.Entity<Customer>()
            .HasQueryFilter(c => c.TenantId == tenantContext.TenantId && c.IsActive);

        modelBuilder.Entity<Supplier>()
            .HasQueryFilter(s => s.TenantId == tenantContext.TenantId && s.IsActive);
    }
}
