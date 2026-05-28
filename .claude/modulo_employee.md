# Prompt — Módulo Employee (CRUD + Login Local + Permissões)

## Contexto do projeto

- ASP.NET Core + EF Core + MySQL
- Multi-tenant com TenantId via claim JWT — nunca passar TenantId manualmente
- Estrutura: PDV.Domain / PDV.Application / PDV.Infrastructure / PDV.Api
- Configurations do EF em `PDV.Infrastructure/Persistence/Configurations/`
- Todas entidades herdam `BaseEntity` (Id, IsActive, CreatedAt, UpdatedAt)
- Soft delete via `IsActive = false` — nunca deletar fisicamente
- Nunca usar `IgnoreQueryFilters()` sem comentário justificando
- Controllers finos — zero lógica de negócio
- Services: validar com FluentValidation → buscar → checar regra → mapear para DTO
- Repositórios chamam `SaveChangesAsync` internamente
- Erros via `NotFoundException`, `BusinessException`, `UnauthorizedException`
- Respostas mapeadas via método `Map` privado e estático no próprio service
- Nunca retornar entidade do domínio diretamente — sempre DTO

---

## Visão geral do que implementar

1. Enums `EmployeeType` e `Permission`
2. Entidade `EmployeeTypePermission`
3. `IPermissionService` + `PermissionService`
4. CRUD de Employee (Owner gerencia)
5. Configuração de permissões por tipo (Owner configura por tenant)
6. Login local para funcionários (`/api/auth/local`)
7. Endpoint de troca de senha (`/api/auth/change-password`)
8. Configurations do EF para as novas entidades
9. Registro no AppDbContext
10. Migration

---

## PASSO 1 — Enums

### `PDV.Domain/Enums/EmployeeType.cs`
```csharp
namespace PDV.Domain.Enums;

public enum EmployeeType
{
    Manager,   // Gerente
    Employee   // Funcionário
}
```

### `PDV.Domain/Enums/Permission.cs`
```csharp
namespace PDV.Domain.Enums;

public enum Permission
{
    // Vendas
    SellProducts,       // Operar PDV / registrar vendas
    CancelSales,        // Cancelar vendas

    // Estoque
    ViewStock,          // Ver produtos e estoque
    ManageStock,        // Ajustar estoque

    // Despesas
    ViewExpenses,       // Ver despesas
    ManageExpenses,     // Criar/editar despesas

    // Relatórios
    ViewReports,        // Ver dashboard e relatórios

    // Funcionários
    ManageEmployees,    // Criar/editar funcionários (nunca Owner)
}
```

---

## PASSO 2 — Entidade EmployeeTypePermission

### `PDV.Domain/Entities/EmployeeTypePermission.cs`
```csharp
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
```

---

## PASSO 3 — IPermissionService + PermissionService

### `PDV.Application/Interfaces/IPermissionService.cs`
```csharp
using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

public interface IPermissionService
{
    // Lança UnauthorizedException se o usuário atual não tiver a permissão.
    // Owners sempre passam — permissões granulares só se aplicam a Employees.
    Task RequireAsync(Permission permission);
}
```

### `PDV.Infrastructure/Services/PermissionService.cs`

O service lê o `userId` e `role` do JWT via `IHttpContextAccessor`. Se o role for `Owner`, passa direto. Se for `Employee`, busca o `Employee` pelo `UserId` + `TenantId` (via `ITenantContext`), obtém o `EmployeeType`, e verifica se existe um `EmployeeTypePermission` para aquele tenant + tipo + permissão.

```csharp
using Microsoft.AspNetCore.Http;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;
using System.Security.Claims;

namespace PDV.Infrastructure.Services;

public class PermissionService(
    IHttpContextAccessor accessor,
    IEmployeeRepository employeeRepository,
    IEmployeeTypePermissionRepository permissionRepository,
    ITenantContext tenantContext) : IPermissionService
{
    public async Task RequireAsync(Permission permission)
    {
        var context = accessor.HttpContext
            ?? throw new UnauthorizedException("Contexto HTTP não disponível.");

        var role = context.User.FindFirstValue(ClaimTypes.Role);

        // Owner tem acesso total — não precisa checar permissões granulares
        if (role == "Owner") return;

        var userId = Guid.Parse(context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedException("Usuário não identificado."));

        var employee = await employeeRepository.GetByUserIdAsync(userId, tenantContext.TenantId)
            ?? throw new UnauthorizedException("Funcionário não encontrado.");

        var hasPermission = await permissionRepository.HasPermissionAsync(
            tenantContext.TenantId, employee.EmployeeType, permission);

        if (!hasPermission)
            throw new UnauthorizedException("Sem permissão para realizar esta operação.");
    }
}
```

---

## PASSO 4 — Atualizar entidade Employee

Arquivo: `PDV.Domain/Entities/Employee.cs`

Adicionar campo `EmployeeType`:

```csharp
using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

public class Employee : BaseEntity
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public EmployeeType EmployeeType { get; set; } = EmployeeType.Employee;
    public string Position { get; set; } = string.Empty;
    public decimal? Salary { get; set; }
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; } // {tenantId}/employees/{employeeId}.webp

    public User User { get; set; } = null!;
}
```

---

## PASSO 5 — Interfaces de repositório

### `PDV.Domain/Interfaces/IEmployeeRepository.cs`
```csharp
using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IEmployeeRepository
{
    Task<Employee?> GetByIdAsync(Guid id);
    Task<Employee?> GetByUserIdAsync(Guid userId, Guid tenantId);
    Task<(IEnumerable<Employee> Data, int TotalCount)> GetAllAsync(int page, int pageSize);
    Task AddAsync(Employee employee);
    Task UpdateAsync(Employee employee);
}
```

### `PDV.Domain/Interfaces/IEmployeeTypePermissionRepository.cs`
```csharp
using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Domain.Interfaces;

public interface IEmployeeTypePermissionRepository
{
    Task<bool> HasPermissionAsync(Guid tenantId, EmployeeType employeeType, Permission permission);
    Task<IEnumerable<EmployeeTypePermission>> GetByTenantAndTypeAsync(Guid tenantId, EmployeeType employeeType);
    Task ReplaceAsync(Guid tenantId, EmployeeType employeeType, IEnumerable<Permission> permissions);
}
```

`ReplaceAsync` apaga todas as permissões existentes para aquele tenant+tipo e insere as novas — simplifica o endpoint de configuração (Owner envia a lista completa de permissões desejadas).

---

## PASSO 6 — Implementações de repositório

### `PDV.Infrastructure/Repositories/EmployeeRepository.cs`

Seguir o mesmo padrão de `ProductRepository`. Incluir navegação `User` nos métodos `GetByIdAsync` e `GetByUserIdAsync`.

```csharp
using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class EmployeeRepository(AppDbContext context) : IEmployeeRepository
{
    public async Task<Employee?> GetByIdAsync(Guid id) =>
        await context.Employees
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == id);

    public async Task<Employee?> GetByUserIdAsync(Guid userId, Guid tenantId) =>
        await context.Employees
            .Include(e => e.User)
            // IgnoreQueryFilters não necessário — TenantId já vem do JWT via QueryFilter global
            .FirstOrDefaultAsync(e => e.UserId == userId);

    public async Task<(IEnumerable<Employee> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize)
    {
        var query = context.Employees
            .Include(e => e.User)
            .OrderBy(e => e.User.Name)
            .AsQueryable();

        var totalCount = await query.CountAsync();
        var data = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, totalCount);
    }

    public async Task AddAsync(Employee employee)
    {
        await context.Employees.AddAsync(employee);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Employee employee)
    {
        context.Employees.Update(employee);
        await context.SaveChangesAsync();
    }
}
```

### `PDV.Infrastructure/Repositories/EmployeeTypePermissionRepository.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class EmployeeTypePermissionRepository(AppDbContext context) : IEmployeeTypePermissionRepository
{
    public async Task<bool> HasPermissionAsync(Guid tenantId, EmployeeType employeeType, Permission permission) =>
        await context.EmployeeTypePermissions
            // IgnoreQueryFilters: EmployeeTypePermission não tem TenantId no QueryFilter global,
            // mas a verificação já está sendo feita pelo filtro da query abaixo
            .AnyAsync(p => p.TenantId == tenantId
                        && p.EmployeeType == employeeType
                        && p.Permission == permission);

    public async Task<IEnumerable<EmployeeTypePermission>> GetByTenantAndTypeAsync(
        Guid tenantId, EmployeeType employeeType) =>
        await context.EmployeeTypePermissions
            .Where(p => p.TenantId == tenantId && p.EmployeeType == employeeType)
            .ToListAsync();

    public async Task ReplaceAsync(Guid tenantId, EmployeeType employeeType, IEnumerable<Permission> permissions)
    {
        var existing = await context.EmployeeTypePermissions
            .Where(p => p.TenantId == tenantId && p.EmployeeType == employeeType)
            .ToListAsync();

        context.EmployeeTypePermissions.RemoveRange(existing);

        var newPermissions = permissions.Select(p => new EmployeeTypePermission
        {
            TenantId = tenantId,
            EmployeeType = employeeType,
            Permission = p,
        });

        await context.EmployeeTypePermissions.AddRangeAsync(newPermissions);
        await context.SaveChangesAsync();
    }
}
```

---

## PASSO 7 — DTOs

### `PDV.Application/DTOs/Employees/`

```csharp
// CreateEmployeeRequest.cs
namespace PDV.Application.DTOs.Employees;

public record CreateEmployeeRequest(
    string Name,
    string Email,
    string TemporaryPassword,
    string EmployeeType,     // "Manager" | "Employee"
    string Position,
    decimal? Salary,
    string? Phone);

// UpdateEmployeeRequest.cs
public record UpdateEmployeeRequest(
    string EmployeeType,
    string Position,
    decimal? Salary,
    string? Phone);

// EmployeeResponse.cs
public record EmployeeResponse(
    Guid Id,
    Guid UserId,
    string Name,
    string Email,
    string EmployeeType,
    string Position,
    decimal? Salary,
    string? Phone,
    string? AvatarUrl,
    bool IsActive,
    DateTime CreatedAt);
```

### `PDV.Application/DTOs/Employees/EmployeePermissionsRequest.cs`
```csharp
namespace PDV.Application.DTOs.Employees;

// Owner envia a lista completa de permissões para um tipo.
// A lista substitui tudo que existia antes (ReplaceAsync).
public record EmployeePermissionsRequest(
    string EmployeeType,         // "Manager" | "Employee"
    IEnumerable<string> Permissions); // nomes do enum Permission

// EmployeePermissionsResponse.cs
public record EmployeePermissionsResponse(
    string EmployeeType,
    IEnumerable<string> Permissions);
```

### `PDV.Application/DTOs/Auth/LocalLoginRequest.cs`
```csharp
namespace PDV.Application.DTOs.Auth;

public record LocalLoginRequest(string Email, string Password);
```

### `PDV.Application/DTOs/Auth/ChangePasswordRequest.cs`
```csharp
namespace PDV.Application.DTOs.Auth;

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
```

---

## PASSO 8 — Validators FluentValidation

Localização: `PDV.Application/Validators/Employees/`

### `CreateEmployeeRequestValidator.cs`
- `Name`: NotEmpty, MaxLength 200
- `Email`: NotEmpty, EmailAddress, MaxLength 254
- `TemporaryPassword`: NotEmpty, MinLength 6
- `EmployeeType`: NotEmpty, deve ser "Manager" ou "Employee"
- `Position`: NotEmpty, MaxLength 100
- `Salary`: GreaterThan(0) quando informado
- `Phone`: MaxLength 20 quando informado

### `UpdateEmployeeRequestValidator.cs`
- Mesmas regras de `EmployeeType`, `Position`, `Salary`, `Phone`

### `LocalLoginRequestValidator.cs`
Localização: `PDV.Application/Validators/Auth/`
- `Email`: NotEmpty, EmailAddress
- `Password`: NotEmpty

### `ChangePasswordRequestValidator.cs`
Localização: `PDV.Application/Validators/Auth/`
- `CurrentPassword`: NotEmpty
- `NewPassword`: NotEmpty, MinLength 6

---

## PASSO 9 — IEmployeeService

### `PDV.Application/Interfaces/IEmployeeService.cs`
```csharp
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Employees;

namespace PDV.Application.Interfaces;

public interface IEmployeeService
{
    Task<PaginatedResponse<EmployeeResponse>> GetAllAsync(int page, int pageSize);
    Task<EmployeeResponse> GetByIdAsync(Guid id);
    Task<EmployeeResponse> CreateAsync(CreateEmployeeRequest request);
    Task<EmployeeResponse> UpdateAsync(Guid id, UpdateEmployeeRequest request);
    Task DeactivateAsync(Guid id);
    Task ReactivateAsync(Guid id);
    Task<EmployeePermissionsResponse> GetPermissionsAsync(string employeeType);
    Task<EmployeePermissionsResponse> SetPermissionsAsync(EmployeePermissionsRequest request);
}
```

---

## PASSO 10 — EmployeeService

Arquivo: `PDV.Infrastructure/Services/EmployeeService.cs`

Seguir o mesmo padrão de `ProductService`. Observações importantes:

**`CreateAsync`:**
1. Validar request com FluentValidation
2. Verificar se já existe `User` com o email — se existir, lançar `BusinessException("Já existe um usuário com este e-mail.")`
3. Criar `User` com `Role = UserRole.Employee`
4. Criar `LocalAuth` com `PasswordHash = BCrypt.HashPassword(request.TemporaryPassword)` e `MustChangePassword = true`
5. Criar `UserSettings` padrão vinculado ao User
6. Criar `Employee` com `TenantId = tenantContext.TenantId`
7. Salvar tudo via `userRepository.AddAsync` (que deve cascatear LocalAuth e Settings via EF) e depois `employeeRepository.AddAsync`
8. **Nunca** permitir criar funcionário com `Role = Owner`

**`DeactivateAsync` / `ReactivateAsync`:**
- `DeactivateAsync`: `employee.IsActive = false` + `employee.User.IsActive = false`
- `ReactivateAsync`: `employee.IsActive = true` + `employee.User.IsActive = true`
- Ambos usam `UpdateAsync` do repositório

**`GetPermissionsAsync`:**
- Parsear `employeeType` string → enum, lançar `BusinessException` se inválido
- Buscar via `permissionRepository.GetByTenantAndTypeAsync`
- Retornar `EmployeePermissionsResponse` com nomes do enum como string

**`SetPermissionsAsync`:**
- Parsear `employeeType` e cada `Permission` — lançar `BusinessException` para valores inválidos
- Chamar `permissionRepository.ReplaceAsync`

**Método Map:**
```csharp
private static EmployeeResponse Map(Employee e) =>
    new(e.Id, e.UserId, e.User.Name, e.User.Email,
        e.EmployeeType.ToString(), e.Position,
        e.Salary, e.Phone, e.AvatarUrl, e.IsActive, e.CreatedAt);
```

**Instalar BCrypt:**
```bash
dotnet add PDV.Infrastructure package BCrypt.Net-Next
```

---

## PASSO 11 — Atualizar IAuthService e AuthService

### `PDV.Application/Interfaces/IAuthService.cs`

Adicionar:
```csharp
Task<(string AccessToken, string RefreshToken)> LoginWithLocalAsync(string email, string password);
Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
```

### `PDV.Infrastructure/Services/AuthService.cs`

**`LoginWithLocalAsync`:**
1. Buscar `User` por email via `userRepository.GetByEmailAsync`
2. Se não encontrar ou `User.IsActive = false` → `UnauthorizedException("Credenciais inválidas.")` (mesma mensagem para ambos os casos — não revelar se e-mail existe)
3. Buscar `LocalAuth` pelo `UserId` — se não existir → `UnauthorizedException("Credenciais inválidas.")`
4. Verificar `BCrypt.Verify(password, localAuth.PasswordHash)` — se falso → `UnauthorizedException("Credenciais inválidas.")`
5. Buscar tenant ativo igual ao fluxo Google existente
6. Gerar refresh token e access token
7. Se `localAuth.MustChangePassword = true` → incluir claim extra `"mustChangePassword": "true"` no JWT para o frontend detectar e redirecionar

**`ChangePasswordAsync`:**
1. Buscar `User` por `userId`
2. Buscar `LocalAuth` — se não existir → `BusinessException("Usuário não possui login por senha.")`
3. Verificar `BCrypt.Verify(currentPassword, localAuth.PasswordHash)` — se falso → `UnauthorizedException("Senha atual incorreta.")`
4. `localAuth.PasswordHash = BCrypt.HashPassword(newPassword)`
5. `localAuth.MustChangePassword = false`
6. `localAuth.UpdatedAt = DateTime.UtcNow`
7. Salvar via `userRepository.UpdateAsync(user)`

---

## PASSO 12 — Controllers

### `PDV.Api/Controllers/EmployeesController.cs`

Seguir o padrão de `ProductsController`. Todos os endpoints exigem `[Authorize(Roles = "Owner")]` exceto onde indicado.

```csharp
[ApiController]
[Route("api/employees")]
[Authorize(Roles = "Owner")]
public class EmployeesController(IEmployeeService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await service.GetAllAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/employees/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEmployeeRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        await service.DeactivateAsync(id);
        return NoContent();
    }

    [HttpPatch("{id:guid}/reactivate")]
    public async Task<IActionResult> Reactivate(Guid id)
    {
        await service.ReactivateAsync(id);
        return NoContent();
    }

    // Configuração de permissões por tipo — Owner configura por tenant
    [HttpGet("permissions/{employeeType}")]
    public async Task<IActionResult> GetPermissions(string employeeType)
    {
        var result = await service.GetPermissionsAsync(employeeType);
        return Ok(result);
    }

    [HttpPut("permissions")]
    public async Task<IActionResult> SetPermissions([FromBody] EmployeePermissionsRequest request)
    {
        var result = await service.SetPermissionsAsync(request);
        return Ok(result);
    }
}
```

### `PDV.Api/Controllers/AuthController.cs`

Adicionar dois endpoints ao controller existente — não alterar nenhum método existente:

```csharp
[HttpPost("local")]
public async Task<IActionResult> Local([FromBody] LocalLoginRequest request)
{
    var (accessToken, refreshToken) = await authService.LoginWithLocalAsync(request.Email, request.Password);
    SetAuthCookies(accessToken, refreshToken);
    return Ok();
}

[HttpPost("change-password")]
[Authorize]
public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    await authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
    return NoContent();
}
```

---

## PASSO 13 — Configurations do EF Core

Localização: `PDV.Infrastructure/Persistence/Configurations/`

### `EmployeeConfiguration.cs`
Atualizar para incluir `EmployeeType`:
```csharp
builder.Property(e => e.EmployeeType).IsRequired().HasConversion<string>().HasMaxLength(20);
builder.Property(e => e.Position).IsRequired().HasMaxLength(100);
builder.Property(e => e.Salary).HasColumnType("decimal(10,2)");
builder.Property(e => e.Phone).HasMaxLength(20);
builder.Property(e => e.AvatarUrl).HasMaxLength(500);

builder.HasOne(e => e.User)
    .WithMany()
    .HasForeignKey(e => e.UserId)
    .OnDelete(DeleteBehavior.Restrict);
```

### `EmployeeTypePermissionConfiguration.cs`
```csharp
public class EmployeeTypePermissionConfiguration : IEntityTypeConfiguration<EmployeeTypePermission>
{
    public void Configure(EntityTypeBuilder<EmployeeTypePermission> builder)
    {
        builder.Property(p => p.EmployeeType).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Permission).IsRequired().HasConversion<string>().HasMaxLength(50);

        // Garante que não existe duplicata de tipo+permissão por tenant
        builder.HasIndex(p => new { p.TenantId, p.EmployeeType, p.Permission }).IsUnique();
    }
}
```

---

## PASSO 14 — Atualizar AppDbContext

Adicionar DbSets e QueryFilters:

```csharp
public DbSet<EmployeeTypePermission> EmployeeTypePermissions => Set<EmployeeTypePermission>();
```

Adicionar QueryFilter:
```csharp
modelBuilder.Entity<EmployeeTypePermission>()
    .HasQueryFilter(p => p.TenantId == tenantContext.TenantId && p.IsActive);
```

O QueryFilter de `Employee` já foi adicionado no prompt anterior — não duplicar.

---

## PASSO 15 — Registrar serviços no Program.cs / DI

Adicionar nos registros de DI existentes:

```csharp
// Repositórios
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IEmployeeTypePermissionRepository, EmployeeTypePermissionRepository>();

// Services
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
```

---

## PASSO 16 — Migration

Após tudo compilar sem erro:

```bash
dotnet ef migrations add AddEmployeeModule --project PDV.Infrastructure --startup-project PDV.Api
```

Revisar o arquivo gerado e confirmar:
- `CreateTable` para `EmployeeTypePermissions`
- `AddColumn` para `EmployeeType` na tabela `Employees`
- Índice único em `EmployeeTypePermissions (TenantId, EmployeeType, Permission)`
- Nenhuma tabela existente foi dropada

---

## Regras de negócio críticas — nunca violar

- Owner **nunca** pode ser criado via `EmployeeService` — `User.Role` deve ser sempre `UserRole.Employee`
- Desativar funcionário deve desativar tanto `Employee.IsActive` quanto `User.IsActive` — impede login
- Login local nunca revela se o e-mail existe — sempre `"Credenciais inválidas."` em qualquer falha
- `MustChangePassword = true` sempre na criação — funcionário obrigado a trocar no primeiro acesso
- Permissões são por tenant — Owner do Tenant A não interfere nas permissões do Tenant B

---

## O que NÃO fazer

- Não alterar nenhum endpoint existente de Auth (Google, Refresh, Logout, Me, SwitchTenant)
- Não alterar `TenantService`, `TenantController`, `ProductsController`
- Não criar upload de foto de funcionário — `AvatarUrl` fica no banco mas sem implementação
- Não usar `IgnoreQueryFilters()` sem comentário justificando
- Não deletar fisicamente nenhum registro — sempre `IsActive = false`
- Não hardcodar `TenantId` em queries — sempre via `ITenantContext`
- Não retornar entidade do domínio diretamente — sempre mapear para DTO
- Não colocar lógica de negócio no Controller
EOF