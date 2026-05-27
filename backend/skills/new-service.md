# Skill: Novo Service + Repositório

Use esta skill ao criar um service e repositório para uma entidade existente.

## Checklist

1. Criar interface do repositório em `PDV.Application/Interfaces/`
2. Criar implementação do repositório em `PDV.Infrastructure/Repositories/`
3. Criar interface do service em `PDV.Application/Interfaces/`
4. Criar DTOs em `PDV.Application/DTOs/{Feature}/`
5. Criar validators em `PDV.Application/Validators/{Feature}/`
6. Criar implementação do service em `PDV.Infrastructure/Services/`
7. Registrar no `Program.cs`

---

## Interface do repositório

```csharp
// PDV.Application/Interfaces/IExpenseRepository.cs
public interface IExpenseRepository
{
    Task<Expense?> GetByIdAsync(Guid id);
    Task<(IEnumerable<Expense> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize, int? month, int? year, bool? isPaid);
    Task AddAsync(Expense expense);
    Task UpdateAsync(Expense expense);
}
```

---

## Implementação do repositório

```csharp
// PDV.Infrastructure/Repositories/ExpenseRepository.cs
public class ExpenseRepository(AppDbContext context) : IExpenseRepository
{
    public async Task<Expense?> GetByIdAsync(Guid id) =>
        await context.Expenses.FirstOrDefaultAsync(e => e.Id == id);

    public async Task<(IEnumerable<Expense> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize, int? month, int? year, bool? isPaid)
    {
        var query = context.Expenses.AsQueryable();
        // filtros aqui...
        var total = await query.CountAsync();
        var data = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return (data, total);
    }

    public async Task AddAsync(Expense expense)
    {
        await context.Expenses.AddAsync(expense);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Expense expense)
    {
        context.Expenses.Update(expense);
        await context.SaveChangesAsync();
    }
}
```

Regras:
- `SaveChangesAsync` chamado dentro do repositório — não no service
- Navegações carregadas via `Include` quando necessário
- Métodos específicos nomeados em vez de expor `IQueryable`
- `HasQueryFilter` já filtra por `TenantId` e `IsActive` automaticamente

---

## Interface do service

```csharp
// PDV.Application/Interfaces/IExpenseService.cs
public interface IExpenseService
{
    Task<PaginatedResponse<ExpenseResponse>> GetAllAsync(int page, int pageSize, int? month, int? year, bool? isPaid);
    Task<ExpenseResponse> GetByIdAsync(Guid id);
    Task<ExpenseResponse> CreateAsync(CreateExpenseRequest request);
    Task<ExpenseResponse> UpdateAsync(Guid id, UpdateExpenseRequest request);
    Task DeleteAsync(Guid id);
}
```

---

## Implementação do service

```csharp
// PDV.Infrastructure/Services/ExpenseService.cs
public class ExpenseService(
    IExpenseRepository repository,
    ITenantContext tenantContext,
    IValidator<CreateExpenseRequest> createValidator) : IExpenseService
{
    public async Task<ExpenseResponse> GetByIdAsync(Guid id)
    {
        var expense = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Despesa não encontrada.");
        return Map(expense);
    }

    public async Task<ExpenseResponse> CreateAsync(CreateExpenseRequest request)
    {
        await createValidator.ValidateAndThrowAsync(request);

        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            TenantId = tenantContext.TenantId,
            // mapear campos do request...
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await repository.AddAsync(expense);
        return Map(expense);
    }

    public async Task DeleteAsync(Guid id)
    {
        var expense = await repository.GetByIdAsync(id)
            ?? throw new NotFoundException("Despesa não encontrada.");
        expense.IsActive = false;
        expense.UpdatedAt = DateTime.UtcNow;
        await repository.UpdateAsync(expense);
    }

    private static ExpenseResponse Map(Expense e) =>
        new(e.Id, e.Description, e.Amount, e.IsPaid, e.CreatedAt);
}
```

Ordem interna obrigatória no service:
1. `ValidateAndThrowAsync` (se tiver validator)
2. Buscar entidade + `NotFoundException` se não encontrar
3. Validar regra de negócio + `BusinessException` se falhar
4. Criar/atualizar entidade
5. Persistir via repositório
6. Retornar `Map(entidade)`

---

## Registro no Program.cs

```csharp
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IExpenseRepository, ExpenseRepository>();
```