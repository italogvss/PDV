# PDV-Ultra — Backend

API REST em ASP.NET Core seguindo Clean Architecture. Serve o frontend React e futuramente o app mobile (Capacitor). Multi-tenant com banco compartilhado e `TenantId` em todas as entidades.

---

## Stack

| Item | Tecnologia |
|---|---|
| Framework | ASP.NET Core |
| ORM | Entity Framework Core |
| Banco | MySQL |
| Autenticação | JWT Bearer |
| Storage | MinIO via SDK S3-compatível |
| Containerização | Docker + Docker Compose |

---

## Estrutura de projetos

```
/backend
├── PDVUltra.Api             ← Controllers, Middlewares, Program.cs
├── PDVUltra.Application     ← UseCases, DTOs, Interfaces, Validações
├── PDVUltra.Domain          ← Entidades, Enums, Erros de domínio
└── PDVUltra.Infrastructure  ← DbContext, Repositories, MinIO, JWT
```

### Responsabilidade de cada camada

**Domain** — só C# puro, zero dependência externa. Entidades, enums e regras de negócio que não dependem de nada. Se precisar de um NuGet aqui, questione se está no lugar certo.

**Application** — orquestra o domínio. Contém os use cases (ex: `CreateProductUseCase`), interfaces dos repositórios (`IProductRepository`) e DTOs de entrada/saída. Depende só do Domain.

**Infrastructure** — implementa as interfaces do Application. Aqui ficam o `AppDbContext`, os repositórios concretos, o cliente MinIO e qualquer serviço externo. Depende do Application e Domain.

**Api** — ponto de entrada HTTP. Controllers finos que apenas recebem a requisição, chamam o use case e retornam o resultado. Não contém lógica de negócio. Depende do Application.

---

## Multi-tenant

Banco compartilhado com coluna `TenantId` em todas as entidades do domínio.

### Resolução do tenant
Em desenvolvimento: header `X-Tenant-Id` na requisição.
Em produção: subdomínio da URL (`loja-joao.pdvultra.com.br`).

O `TenantMiddleware` resolve o tenant antes de qualquer controller ser chamado, valida se está ativo e injeta via `ITenantContext` no DI container.

### Filtro global obrigatório
O `AppDbContext` aplica `HasQueryFilter` em todas as entidades com `TenantId`:

```csharp
builder.Entity<Product>()
    .HasQueryFilter(p => p.TenantId == _tenantContext.TenantId && !p.IsDeleted);
```

Nunca usar `IgnoreQueryFilters()` sem comentário explicando o motivo. Qualquer query que precise ignorar o filtro é candidata a revisão de arquitetura.

### Validação cruzada
Após autenticar o JWT, o middleware valida que o `UserId` do token pertence ao tenant resolvido. Um token válido de outro tenant deve retornar `403 Forbidden`.

---

## Autenticação

JWT Bearer simples. O token carrega:

```json
{
  "sub": "userId",
  "email": "usuario@email.com",
  "role": "Owner | Employee",
  "tenantId": "guid-do-tenant"
}
```

O `TenantId` no JWT serve apenas como validação cruzada com o tenant resolvido pelo subdomínio/header — não substitui a resolução pelo middleware.

Token sem expiração configurada é inválido. Usar no mínimo 1h para access token.

---

## Repository Pattern

As interfaces ficam em `Application`, as implementações em `Infrastructure`.

```csharp
// PDVUltra.Application/Interfaces/IProductRepository.cs
public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Product>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(Product product, CancellationToken ct = default);
    Task UpdateAsync(Product product, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

// PDVUltra.Infrastructure/Repositories/ProductRepository.cs
public class ProductRepository : IProductRepository
{
    private readonly AppDbContext _db;
    public ProductRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<Product>> GetAllAsync(CancellationToken ct = default)
        => await _db.Products.ToListAsync(ct); // HasQueryFilter já filtra por tenant
}
```

Não criar métodos genéricos demais no repositório. Se um use case precisa de uma query muito específica, criar um método nomeado (`GetLowStockProductsAsync`) em vez de expor `IQueryable`.

---

## Entidades — convenções obrigatórias

Toda entidade do domínio herda de `BaseEntity`:

```csharp
// PDVUltra.Domain/Common/BaseEntity.cs
public abstract class BaseEntity
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;        // soft delete
    public DateTime? DeletedAt { get; set; }
}
```

### Soft delete
Nunca deletar registros fisicamente. Sempre setar `IsDeleted = true` e `DeletedAt = DateTime.UtcNow`. O `HasQueryFilter` já exclui registros deletados de todas as queries automaticamente.

### Auditing
`CreatedAt` é setado uma vez na criação, nunca alterado. `UpdatedAt` é atualizado pelo `SaveChangesAsync` do `AppDbContext` via override — não atualizar manualmente nos repositórios.

---

## Padrão de resposta da API

Todas as respostas seguem o mesmo envelope:

```json
// Sucesso
{ "data": { ... }, "error": null }

// Erro
{ "data": null, "error": { "code": "PRODUCT_NOT_FOUND", "message": "Produto não encontrado." } }
```

Códigos HTTP: `200` sucesso, `201` criado, `400` validação, `401` não autenticado, `403` sem permissão, `404` não encontrado, `500` erro interno.

Nunca retornar stack trace em produção.

---

## Armazenamento de arquivos (MinIO)

Usar presigned URL — o frontend faz upload direto no MinIO, sem passar pela API.

```
Frontend → GET /api/uploads/presigned-url?context=product&productId=123
API      → retorna URL temporária (5 min) para PUT direto no MinIO
Frontend → PUT {url} com o arquivo
Frontend → PATCH /api/products/123 { "imageUrl": "{tenantId}/products/123.webp" }
```

O banco armazena apenas o path relativo, nunca a URL completa. A URL é montada em runtime pelo serviço de storage.

Todo path começa com `{tenantId}/` — sem exceção.

Converter imagens para `.webp` antes de salvar. Tamanho máximo: 5MB.

---

## Variáveis de ambiente

```env
# Banco
DB_CONNECTION_STRING=Server=localhost;Database=pdvultra;...

# JWT
JWT_SECRET=...
JWT_EXPIRATION_HOURS=8

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_USE_SSL=false

# Ambiente
ASPNETCORE_ENVIRONMENT=Development
```

Nunca commitar valores reais. O repositório contém apenas `.env.example` com as chaves sem valores.

---

## Skills disponíveis

Antes de executar qualquer tarefa abaixo, leia a skill correspondente em `/backend/skills/`:

| Tarefa | Skill |
|---|---|
| Criar nova entidade de domínio | `skills/new-entity.md` |
| Criar novo use case | `skills/new-usecase.md` |
| Implementar upload de imagem | `skills/image-upload.md` |

---

## O que não fazer

- Nunca colocar lógica de negócio no Controller — ele só delega para o use case
- Nunca acessar `DbContext` diretamente no Application — sempre via interface do repositório
- Nunca usar `IgnoreQueryFilters()` sem justificativa no código
- Nunca deletar registro fisicamente — usar soft delete
- Nunca retornar entidades do domínio diretamente na API — sempre mapear para DTO
- Nunca commitar secrets ou connection strings reais