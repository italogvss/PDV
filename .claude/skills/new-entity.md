# Skill — Nova entidade de domínio

Use esta skill sempre que precisar criar uma nova entidade no `PDVUltra.Domain`.

## Checklist obrigatório

1. A entidade herda de `BaseEntity` (Id, TenantId, CreatedAt, UpdatedAt, IsDeleted, DeletedAt)
2. Propriedades com `private set` — alterações via métodos de domínio, não direto na propriedade
3. Construtor privado sem parâmetros para o EF Core + construtor público com parâmetros obrigatórios
4. Criar interface do repositório em `PDVUltra.Application/Interfaces/I{Entity}Repository.cs`
5. Criar implementação do repositório em `PDVUltra.Infrastructure/Repositories/{Entity}Repository.cs`
6. Registrar o repositório no DI em `Program.cs`
7. Adicionar `DbSet<{Entity}>` no `AppDbContext`
8. Adicionar `HasQueryFilter` com `TenantId` e `!IsDeleted` no `OnModelCreating`
9. Gerar migration: `dotnet ef migrations add Add{Entity} --project PDVUltra.Infrastructure --startup-project PDVUltra.Api`

## Template de entidade

```csharp
// PDVUltra.Domain/Entities/{Entity}.cs
public class {Entity} : BaseEntity
{
    public string Name { get; private set; }

    private {Entity}() { } // para o EF Core

    public {Entity}(Guid tenantId, string name)
    {
        TenantId = tenantId;
        Name = name;
    }

    public void Update(string name)
    {
        Name = name;
        UpdatedAt = DateTime.UtcNow;
    }
}
```

## Template de repositório

```csharp
// PDVUltra.Application/Interfaces/I{Entity}Repository.cs
public interface I{Entity}Repository
{
    Task<{Entity}?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<{Entity}>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync({Entity} entity, CancellationToken ct = default);
    Task UpdateAsync({Entity} entity, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default); // soft delete
}

// PDVUltra.Infrastructure/Repositories/{Entity}Repository.cs
public class {Entity}Repository : I{Entity}Repository
{
    private readonly AppDbContext _db;
    public {Entity}Repository(AppDbContext db) => _db = db;

    public async Task<{Entity}?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.{Entities}.FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<IEnumerable<{Entity}>> GetAllAsync(CancellationToken ct = default)
        => await _db.{Entities}.ToListAsync(ct);

    public async Task AddAsync({Entity} entity, CancellationToken ct = default)
    {
        await _db.{Entities}.AddAsync(entity, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync({Entity} entity, CancellationToken ct = default)
    {
        _db.{Entities}.Update(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await GetByIdAsync(id, ct);
        if (entity is null) return;
        entity.Delete(); // método na BaseEntity que seta IsDeleted e DeletedAt
        await _db.SaveChangesAsync(ct);
    }
}
```
