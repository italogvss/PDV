# PDV-Ultra — Backend

API REST em ASP.NET Core. Multi-tenant com `TenantId` via claim do JWT.

## Estrutura de projetos

```
/backend
├── PDV.Api             ← Controllers, Middlewares, Program.cs
├── PDV.Application     ← Interfaces, DTOs, Validators (FluentValidation)
├── PDV.Domain          ← Entidades, Enums, Exceptions
└── PDV.Infrastructure  ← Services, Repositories, AppDbContext
```

### Responsabilidade de cada camada

**Domain** — entidades, enums e exceções (`AppException` e filhos). Zero dependência externa.

**Application** — interfaces dos services (`IProductService`) e repositórios (`IProductRepository`), DTOs de entrada/saída, validators FluentValidation. Depende só do Domain.

**Infrastructure** — implementa as interfaces. Services, repositórios, `AppDbContext`. Depende do Application e Domain.

**Api** — controllers finos: recebe request, chama service, retorna resultado. Sem lógica de negócio.

---

## Multi-tenant

`TenantId` vem do claim `"tenantId"` do JWT, lido via `ITenantContext` → `IHttpContextAccessor`.

O `AppDbContext` aplica `HasQueryFilter` em todas as entidades com `TenantId`:

```csharp
.HasQueryFilter(p => p.TenantId == tenantContext.TenantId && p.IsActive);
```

Regras:
- `IgnoreQueryFilters()` só com comentário justificando — vazamento entre tenants
- Nunca passar `TenantId` manualmente em queries — sempre via `ITenantContext`
- Migrations usam `AppDbContextFactory` com `DesignTimeTenantContext` (TenantId = Guid.Empty)

---

## Autenticação

JWT em **cookie HttpOnly** (`access_token`). Refresh token em cookie separado (`refresh_token`).

Claims do token:
```
sub       → userId (Guid)
tenantId  → tenantId atual (Guid) — pode ser vazio se usuário sem tenant
name      → nome do usuário
role      → Owner | Employee (mapeado para ClaimTypes.Role)
jti       → Guid único do token
```

Refresh token armazenado como **SHA256 hash** no banco — nunca o valor raw.

Um usuário pode ter múltiplos tenants (`UserTenant`). O tenant ativo é `User.LastTenantId`. `SwitchTenant` gera novo JWT com o `tenantId` trocado.

---

## Convenções de entidade

Cada entidade define seus próprios campos — não há BaseEntity. Campos obrigatórios em entidades com tenant:

```csharp
public Guid Id { get; set; } = Guid.NewGuid();
public Guid TenantId { get; set; }
public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
public bool IsActive { get; set; } = true;  // soft delete
```

**Soft delete via `IsActive = false`** — nunca deletar fisicamente. O `HasQueryFilter` já filtra `IsActive`.

---

## Convenções de Service

Um service por entidade (`ProductService`, `ExpenseService`). Localização: `PDV.Infrastructure/Services/`.

Padrão interno:
1. Buscar entidade — lançar `NotFoundException` se não encontrar
2. Validar regra de negócio — lançar `BusinessException` se falhar
3. Mapear para DTO via método `Map` privado e estático no próprio service

```csharp
private static ProductResponse Map(Product p) =>
    new(p.Id, p.Name, p.Price, ...);
```

Nunca retornar entidade do domínio diretamente — sempre mapear para DTO.

---

## Convenções de Repositório

Localização: `PDV.Infrastructure/Repositories/`. Interface em `PDV.Application/Interfaces/`.

- Cada repositório chama `SaveChangesAsync` internamente — não há Unit of Work
- Navegações carregadas via `Include` no repositório quando necessário
- Métodos específicos nomeados (`BarcodeExistsAsync`) em vez de expor `IQueryable`

```csharp
public async Task<Product?> GetByIdAsync(Guid id) =>
    await context.Products
        .Include(p => p.Category)
        .FirstOrDefaultAsync(p => p.Id == id);
```

---

## Tratamento de erros

Erros de domínio lançados como `AppException` e filhos — capturados pelo `ExceptionMiddleware`:

```csharp
throw new NotFoundException("Produto não encontrado.");
throw new BusinessException("Já existe um produto com este código de barras.");
throw new UnauthorizedException("Token inválido.");
```

Resposta sempre no formato Problem Details (RFC 7807):
```json
{ "type": "...", "title": "Mensagem.", "status": 400, "detail": "Detalhe opcional." }
```

Nunca retornar stack trace em produção — `ExceptionMiddleware` já controla isso.

---

## Validação de entrada

FluentValidation com `ValidateAndThrowAsync` no service antes de qualquer operação:

```csharp
await createValidator.ValidateAndThrowAsync(request);
```

Validators em `PDV.Application/Validators/{Feature}/`. `ValidationException` é capturado pelo `ExceptionMiddleware` e retorna 400.

---

## Resposta paginada

```csharp
new PaginatedResponse<ProductResponse>(data.Select(Map), page, pageSize, totalCount, totalPages);
```

Repositórios que suportam paginação retornam `(IEnumerable<T> Data, int TotalCount)`.

---

## Skills disponíveis

| Tarefa | Skill |
|---|---|
| Criar nova entidade + migration | `skills/new-entity.md` |
| Criar service + repositório | `skills/new-service.md` |
| Criar controller + DTOs | `skills/new-controller.md` |
| Upload de imagem | `skills/image-upload.md` |

---

## O que nunca fazer

- Lógica de negócio no Controller
- Acessar `AppDbContext` diretamente fora de Infrastructure
- `IgnoreQueryFilters()` sem comentário justificando
- Deletar registro fisicamente — usar `IsActive = false`
- Retornar entidade do domínio direto na API — sempre mapear para DTO
- `TenantId` hardcoded em query manual
- Secrets ou connection strings commitados