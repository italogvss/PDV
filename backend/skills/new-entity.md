# Skill: Nova Entidade

Use esta skill ao criar uma entidade nova no domínio.

## Checklist

1. Criar entidade em `PDV.Domain/Entities/`
2. Criar configuração EF Core em `PDV.Infrastructure/Persistence/Configurations/`
3. Adicionar `DbSet` no `AppDbContext`
4. Adicionar `HasQueryFilter` no `AppDbContext.OnModelCreating` (se tiver TenantId)
5. Gerar migration: `dotnet ef migrations add <Nome> --project PDV.Infrastructure --startup-project PDV.Api`

---

## Estrutura da entidade

```csharp
// PDV.Domain/Entities/Expense.cs
public class Expense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public bool IsPaid { get; set; } = false;
    public bool IsActive { get; set; } = true;      // soft delete
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
```

Campos obrigatórios em entidades com tenant: `Id`, `TenantId`, `IsActive`, `CreatedAt`, `UpdatedAt`.
Entidades sem tenant (ex: `User`, `Tenant`) não precisam de `TenantId` nem `IsActive` por padrão.

---

## Configuração EF Core

```csharp
// PDV.Infrastructure/Persistence/Configurations/ExpenseConfiguration.cs
public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Description).HasMaxLength(200).IsRequired();
        builder.Property(e => e.Amount).HasPrecision(10, 2);
    }
}
```

---

## AppDbContext

```csharp
// Adicionar DbSet
public DbSet<Expense> Expenses => Set<Expense>();

// Adicionar HasQueryFilter em OnModelCreating (entidades com TenantId)
modelBuilder.Entity<Expense>()
    .HasQueryFilter(e => e.TenantId == tenantContext.TenantId && e.IsActive);
```

---

## Soft delete

Nunca deletar fisicamente. Sempre:
```csharp
entity.IsActive = false;
entity.UpdatedAt = DateTime.UtcNow;
await repository.UpdateAsync(entity);
```