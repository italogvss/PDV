# PDV-Ultra — Visão Geral

SaaS de gestão para pequenos comércios. Foco em simplicidade — interface direta, sem excesso de funcionalidades.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript + MUI v6 |
| Backend | ASP.NET Core + EF Core + MySQL |
| Storage | MinIO (S3-compatível, Docker) |
| Mobile (futuro) | Capacitor (wrapper do frontend) |

## Estrutura

```
/
├── CLAUDE.md
├── /frontend    ← React + TypeScript + MUI — ver frontend/CLAUDE.md
└── /backend     ← ASP.NET Core + EF Core — ver backend/CLAUDE.md
```

---

## Multi-tenant

Banco compartilhado com coluna `TenantId` em todas as entidades. O `TenantId` vem como claim do JWT e é injetado automaticamente no `AppDbContext` via `ITenantContext` — nunca passar `TenantId` manualmente em queries.

O `AppDbContext` aplica `HasQueryFilter` global em todas as entidades:
```csharp
.HasQueryFilter(e => e.TenantId == _tenantContext.TenantId && !e.IsDeleted);
```

**Regra crítica:** `IgnoreQueryFilters()` só com comentário explicando o motivo. Qualquer uso sem justificativa é bug de segurança — dados de um tenant podem vazar para outro.

---
## Gateway de pagamentos

Utiliza o abacatePay. As skills estão em .claude/skills `skills/`


## Storage (MinIO)

Arquivos armazenados no MinIO via Docker. Todo path **obrigatoriamente** começa com `{tenantId}/`.

| Contexto | Bucket | Path |
|---|---|---|
| Foto de produto | `products` | `{tenantId}/products/{productId}.webp` |
| Comprovante de despesa | `expenses` | `{tenantId}/expenses/{expenseId}.webp` |
| Foto de funcionário | `employees` | `{tenantId}/employees/{employeeId}.webp` |

Fluxo de upload (ainda não implementado — seguir este padrão ao implementar):
```
Frontend → GET /api/uploads/presigned-url?context=product&id=123
Backend  → retorna URL temporária (5 min)
Frontend → PUT direto no MinIO
Frontend → PATCH /api/products/123 { imageUrl: "{tenantId}/products/123.webp" }
```

Regras:
- Banco armazena apenas o path relativo — nunca a URL completa
- Converter para `.webp` antes de salvar
- Tamanho máximo: 5MB
- Upload nunca passa pelo backend como intermediário

---

## Convenções globais

- Código em inglês, interface e comentários em português brasileiro
- Simplicidade acima de tudo — questionar qualquer abstração antes de criar
- Soft delete via `IsActive = false` em todas as entidades (exceto `Expense`, que é hard-deleted) — nunca deletar fisicamente
- Migrations via EF Core — nunca alterar banco manualmente

## Roles

`Owner` — acesso total ao tenant. `Employee` — acesso restrito (definido por feature).

---

## O que nunca fazer

- `IgnoreQueryFilters()` sem comentário justificando
- `TenantId` hardcoded em query manual
- Path de arquivo sem prefixo `{tenantId}/`
- URL completa do MinIO no banco
- Upload de arquivo passando pelo backend
- Delete físico de registro
- Secrets ou connection strings commitados