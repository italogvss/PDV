# Kashing — Visão Geral

SaaS de gestão para pequenos comércios (repo: `PDV-Ultra`). Foco em simplicidade — interface direta, sem excesso de funcionalidades.

**O sistema está EM PRODUÇÃO** (`app.kashing.com.br` + landing `kashing.com.br`). Existem dois estados da aplicação — dev e produção — e eles devem se manter **próximos**: mesma stack, mesmo comportamento, diferindo apenas no que está em desenvolvimento. Toda mudança segue o fluxo de trabalho abaixo antes de chegar à `master`.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + **MUI v9** (+ MUI X) + Vite — React Query, Redux Toolkit, React Hook Form + Zod |
| Backend | ASP.NET Core (.NET 8+) + EF Core + MySQL — arquitetura em camadas (Api / Application / Domain / Infrastructure) |
| Testes | `backend/PDV.UnitTests` (NUnit 4 + Moq) — fluxos críticos, ver `backend/PDV.UnitTests/README.md` |
| Storage | S3-compatível: **MinIO** (dev, Docker) / **Cloudflare R2** (produção) — upload direto frontend↔storage via presigned URL |
| Pagamentos | **Stripe** (Billing + Checkout hospedado) — produção ainda em modo **teste** |
| Mobile (futuro) | Capacitor (wrapper do frontend) |

Cada camada tem seu próprio guia detalhado (`frontend/CLAUDE.md`, `backend/CLAUDE.md`) — **leia-o antes de mexer nela**.

## Estrutura

```
/
├── CLAUDE.md
├── docker-compose.yml        ← stack completa de DEV
├── docker-compose.prod.yml   ← stack de PRODUÇÃO (nginx + api + frontend + landingpage + db)
├── nginx.prod.conf / .env.prod   ← vivem na VPS (gitignored) — guardar cópia em local seguro
├── /frontend    ← React + TypeScript + MUI — ver frontend/CLAUDE.md
├── /backend     ← ASP.NET Core + EF Core (+ PDV.UnitTests) — ver backend/CLAUDE.md
├── /landingpage ← Astro (marketing: preço, FAQ, termos/privacidade; plano via ?plano=<slug>)
├── /scripts     ← deploy.sh (deploy na VPS a partir da master) e backup-db.sh
└── /docs        ← especificações, runbook de produção e documentos legais (índice abaixo)
```

Ambiente local completo sobe com `docker compose up` na raiz: MySQL (host `3307`), MinIO (`9000`/console `9001`), API (`5000`, `dotnet watch`) e frontend (`5173`, Vite). A API roda migrations + seeders (`PlanSeeder`, `LegalDocumentSeeder`) no startup.

---

## Fluxo de trabalho (Git) — obrigatório

A `master` é **oficial**: é o que o deploy puxa na VPS. O objetivo do processo é mitigar falhas **antes** do deploy.

1. **Nunca desenvolver na `master`.** Toda funcionalidade, correção ou ajuste (inclusive docs) nasce em **branch própria** (`feature/...`, `fix/...`, `docs/...`).
2. **Testar antes do merge** — mínimo por camada:
   - Backend: build + suíte `PDV.UnitTests` (roda em container — ver `backend/PDV.UnitTests/README.md`)
   - Frontend: `npx tsc -b` (typecheck real; `tsc --noEmit` sozinho não cobre nada) + `npm run build`
   - Validação funcional na stack de dev (subir e exercitar o fluxo alterado de verdade)
3. Merge na `master` só com a mudança validada. Deploy é um passo separado e manual (runbook).

## Produção (resumo)

VPS Ubuntu com Docker Compose (`/opt/kashing`, branch `master`); frontend + API em `app.kashing.com.br` (API sob `/api`), landing em `kashing.com.br`; storage Cloudflare R2; MySQL em volume Docker; TLS Let's Encrypt.

- **Runbook operacional**: [docs/manutencao-producao.md](docs/manutencao-producao.md) — deploy, rollback, logs, backup/restore, problemas comuns. **Leia antes de qualquer ação na VPS.**
- Como a infra foi montada: [docs/deploy-producao.md](docs/deploy-producao.md).
- Regras de ouro: **nunca** `docker compose down -v` em produção; migrations são só-pra-frente (a API roda `Migrate()` no startup — migration que dropa coluna/tabela apaga dados reais); testar login real após cada deploy.

---

## Multi-tenant

Banco compartilhado com coluna `TenantId` em todas as entidades de negócio. O `TenantId` vem como claim do JWT e é injetado automaticamente no `AppDbContext` via `ITenantContext` — **nunca passar `TenantId` manualmente em queries**.

O `AppDbContext` aplica `HasQueryFilter` por entidade; o predicado **não é uniforme**:
```csharp
// padrão (maioria): isola por tenant + soft delete
.HasQueryFilter(p => p.TenantId == tenantContext.TenantId && p.IsActive);
// Sale/Expense: só tenant (não usam IsActive dessa forma)
.HasQueryFilter(s => s.TenantId == tenantContext.TenantId);
```

**Entidades SEM filtro de tenant** (ver `OnModelCreating`): as de **cobrança** (`Plan`, `Subscription`, `GatewayCustomer`, `Payment`, `WebhookEvent`) — pertencem ao **Owner (`UserId`)** e o webhook anônimo precisa lê-las sem tenant; e as **globais** (`Announcement`, `UserSeenMarker`). Nesses casos o isolamento por `UserId` é feito **explicitamente nos repositórios**.

**Regra crítica:** `IgnoreQueryFilters()` só com comentário explicando o motivo. Qualquer uso sem justificativa é bug de segurança — dados de um tenant podem vazar para outro.

---

## Autorização (três camadas)

Detalhes em [docs/access-control-e-entitlements.md](docs/access-control-e-entitlements.md). Aplicadas via atributos no controller, de fora para dentro:

1. **`[Authorize]`** — exige JWT válido. `[Authorize(Roles = "Owner,Admin")]` restringe por role.
2. **`[RequireModule(OperationModule.X)]`** — gating de **plano**. Lança `PaymentRequiredException` (**402** `NOT_IN_PLAN`) se a capability não estiver no plano efetivo do tenant (`IEntitlementService`).
3. **`[RequirePermission(Permission.X)]`** — permissão granular por cargo (`IPermissionService`).

Gating de **limite numérico** (ex.: máx. de funcionários) é feito no service com `EnsureWithinLimitAsync(...)` → 402 `PLAN_LIMIT_EXCEEDED`.

**Roles** (`UserRole`): `Owner` (acesso total ao tenant), `Employee` (acesso por permissão do cargo), `Admin` (admin da plataforma — `AdminController`, área `/admin` no frontend).

> **Plano não esconde UI.** Feature **com endpoint**: renderizar normalmente — o backend barra com 402 e o erro vira toast amigável de upgrade. Feature **sem endpoint** (ex.: painel analítico): mostrar cadeado/CTA de upsell via `useEntitlements().has(key)`. Não confundir gating de plano (billing) com controle de acesso (role/permissão), que esse sim filtra a UI.

---

## Constantes compartilhadas backend ↔ frontend

Valores fixos e catálogos têm **fonte única no backend** (`PDV.Domain/Constants`); o frontend não os redefine — espelha só as **chaves** (rótulos PT-BR ficam no frontend) ou busca em runtime:

| Fonte (backend) | Espelho no frontend |
|---|---|
| `EntitlementCatalog` (features de plano) + `PlanLimits` | `constants/entitlements.ts` (`FEATURES`, `PLAN_LIMITS`, `UNLIMITED = -1`) |
| `ModuleCatalog` / `OperationModule` (módulos × permissões) | `constants/modules.ts` (keys lowercase) + `GET /api/access/metadata` (`useAccessMetadata`) |
| Enums serializados (ex.: método de pagamento) | `constants/payment.ts` (chave do backend → rótulo/cor) |

Ao criar um valor fixo novo: definir no backend, espelhar a chave no frontend. Comparação de chaves de entitlement é **case-insensitive**.

---

## Assinaturas / cobrança (Stripe)

Referência completa em [docs/subscriptions.md](docs/subscriptions.md); limites e features em [docs/entitlements-e-limits.md](docs/entitlements-e-limits.md). Skill do Stripe em `.claude/skills/stripe-llm.md`; bootstrap de produtos/preços e fixtures de webhook em `.claude/stripe-bootstrap/` e `.claude/webhook-tests/`.

Invariantes centrais:
- **Sem plano Free permanente** — só planos pagos (`PlanSeeder`). Sem assinatura válida, todo módulo gateado → 402.
- **Modelo de planos**: ambos os planos concedem todos os **módulos**; o diferencial Essencial × Pro são as **features** (`EntitlementCatalog`) + **limites numéricos** (`PlanLimits`).
- **Trial de 30 dias, PDV-side** — controlado pela aplicação, **sem tocar o gateway**. Plano escolhido na landing (`?plano=<slug>`) cria `Subscription` `Trialing` na criação do tenant; uma vez por usuário (`User.HasUsedTrial`).
- **Reembolso 7 dias / retenção 90 dias** — cancelar dentro da janela estorna as cobranças e revoga acesso; a loja **nunca é apagada**, sobrevive para exportação/reassinatura.
- **Upgrade cobra proporcional na hora**; downgrade / redução de ciclo é **agendado** via subscription schedule (sem cobrar). `change-plan/preview` devolve o valor exato.
- **Webhooks `customer.subscription.*` são reconciliação** — datas vêm do evento (nunca `DateTime.UtcNow`); `GatewaySyncedAt` descarta reentregas fora de ordem; `Payment` idempotente por `pi_`/`in_`. Preços vêm da config (`Stripe:Prices:<slug>`), não do código.
- **Exportação de dados fica fora do gate de plano** — é o que permite baixar os dados após cancelamento.

---

## Storage — módulo de mídia

Upload **direto frontend↔storage** via presigned URL — nunca passa pelo backend. Dev usa MinIO; produção usa Cloudflare R2 (mesmo `IStorageService`/S3). Imagem convertida para `.webp` no navegador antes do PUT. Banco guarda **só o path relativo** (`{tenantId}/{category}/{entityId}.webp`). Detalhes (categorias, buckets, fluxo completo) em [.claude/media-module.md](.claude/media-module.md).

Regras:
- Banco armazena apenas o path relativo — nunca a URL completa nem a presigned URL.
- O `relativePath` **nunca vem do cliente** — o `confirm` recalcula via `MediaPathHelper` (evita vazamento cross-tenant).
- Converter para `.webp` antes de salvar; máx. **5MB**; tipos aceitos JPEG/PNG/WebP.
- Presigned URL de leitura já vem resolvida no DTO da entidade, com `?v={UpdatedAt.Ticks}` para cache busting.

---

## Autenticação

JWT em **cookie HttpOnly** (`access_token`); refresh token em cookie separado, guardado no banco como **hash SHA256**. Login **local** (senha hasheada) ou **Google OAuth**. Um usuário pode ter múltiplos tenants (`UserTenant`); `SwitchTenant` reemite o JWT com o `tenantId` trocado. Ver [docs/auth.md](docs/auth.md).

---

## Convenções globais

- Código em inglês, interface e comentários em português brasileiro
- Simplicidade acima de tudo — questionar qualquer abstração antes de criar
- Soft delete via `IsActive = false` — **exceções hard-deleted**: `Expense`, `EmployeeSalaryLink` (cobrança/globais têm regras próprias); nunca deletar fisicamente
- Migrations via EF Core — nunca alterar banco manualmente; em produção são **só-pra-frente**
- Secrets e connection strings em `.env` / user-secrets — **nunca commitados**

---

## Índice de docs (`/docs`)

| Assunto | Doc |
|---|---|
| **Manutenção em produção (runbook)** — deploy, rollback, logs, backup, migrations | [manutencao-producao.md](docs/manutencao-producao.md) |
| Montagem da infra de produção (decisões, checklists) | [deploy-producao.md](docs/deploy-producao.md) |
| Assinaturas / cobrança (Stripe) | [subscriptions.md](docs/subscriptions.md) |
| Controle de acesso e entitlements | [access-control-e-entitlements.md](docs/access-control-e-entitlements.md), [entitlements-e-limits.md](docs/entitlements-e-limits.md) |
| Autenticação | [auth.md](docs/auth.md) |
| Exclusão de conta (LGPD) | [account-deletion.md](docs/account-deletion.md) |
| Anúncios | [announcements-module.md](docs/announcements-module.md) |
| Auditoria matemática de relatórios | [auditoria-matematica-relatorios.md](docs/auditoria-matematica-relatorios.md) |
| Documentos legais (versão vigente = v2) | [termos-de-uso-v2.md](docs/termos-de-uso-v2.md), [politica-de-privacidade-v2.md](docs/politica-de-privacidade-v2.md), [pendencias-documentos-legais.md](docs/pendencias-documentos-legais.md) |

---

## O que nunca fazer

- **Desenvolver direto na `master`** — sempre branch própria + testes antes do merge
- Comando destrutivo em produção (`docker compose down -v`, `DROP DATABASE`, apagar volume)
- `IgnoreQueryFilters()` sem comentário justificando
- Esquecer de filtrar por `UserId` em repositório de cobrança/global (não há filtro automático)
- `TenantId` hardcoded em query manual
- Path de arquivo sem prefixo `{tenantId}/`
- URL completa/presigned do storage no banco — só o path relativo
- Aceitar `relativePath` vindo do cliente no confirm de mídia
- Upload de arquivo passando pelo backend como intermediário
- Esconder/desabilitar UI por causa do **plano** quando a feature tem endpoint — deixe o backend retornar 402 (sem endpoint → cadeado/upsell via `has()`)
- Duplicar valor fixo que já existe em `PDV.Domain/Constants` — espelhar a chave, não redefinir
- Datas de `DateTime.UtcNow` em handler de webhook — sempre do evento
- Delete físico de registro onde há soft delete
- Secrets ou connection strings commitados
