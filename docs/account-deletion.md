# Encerramento de Conta e Exclusão de Dados (LGPD / Marco Civil) — Referência de Implementação

> **Documento de manutenção.** Explica *como* funcionam o encerramento de conta, o encerramento de loja e o
> pipeline de exclusão/retenção de dados do Kashing — os fluxos, os casos, as classes e para que serve cada
> peça. Leia isto antes de mexer em qualquer coisa de exclusão/retenção.
>
> Relacionado: [subscriptions.md](subscriptions.md) (cancelamento de assinatura, do qual o encerramento de
> conta reusa a matriz), [termos-de-uso-v2.md](termos-de-uso-v2.md) §6.5 e
> [politica-de-privacidade-v2.md](politica-de-privacidade-v2.md) §8.5–8.7/§9.4.

## Índice

1. [Invariantes](#1-invariantes) · 2. [Modelo conceitual](#2-modelo-conceitual) ·
3. [Os três gatilhos de exclusão](#3-os-três-gatilhos-de-exclusão) ·
4. [O pipeline de duas etapas](#4-o-pipeline-de-duas-etapas-strip--purge) ·
5. [Categorias de retenção](#5-categorias-de-retenção) · 6. [Modelo de dados](#6-modelo-de-dados) ·
7. [Mapa de componentes](#7-mapa-de-componentes) · 8. [Superfície HTTP](#8-superfície-http) ·
9. [Fluxos em detalhe](#9-fluxos-em-detalhe) · 10. [Gate de bloqueio](#10-gate-de-bloqueio) ·
11. [Log de acesso](#11-log-de-acesso-marco-civil) · 12. [Jobs](#12-jobs) ·
13. [Máquina de estados](#13-máquina-de-estados) · 14. [Matriz de cenários](#14-matriz-de-cenários) ·
15. [Como testar](#15-como-testar) · 16. [Armadilhas](#16-armadilhas-de-manutenção)

---

## 1. Invariantes

1. **Só o Owner encerra a conta.** O encerramento abrange a conta inteira — o `User` e **todos** os tenants
   dele. Funcionário (`Employee`) não tem auto-exclusão; é gerido pelo dono em Equipe.
2. **Carência de exclusão explícita = 30 dias** (`RetentionDefaults.DeletionGraceDays`). Reversível enquanto
   o prazo não vence. Distinta da **retenção passiva de 90 dias** (`DaysAfterAccessLoss`, de quem só perde o
   plano sem pedir exclusão).
3. **O Tenant é retido como âncora de legal-hold, não apagado no "strip".** `Sale`, `Expense`, `Customer`,
   `Employee` têm FK **CASCADE** para `Tenant`; apagar a linha do `Tenant` levaria os dados fiscais junto.
   Por isso a exclusão acontece em **duas etapas** (§4).
4. **O `User` é anonimizado in-place, não apagado, enquanto houver transação retida.** `Payment.UserId` é
   FK **Restrict** para `User` — a linha do `User` só cai no expurgo de 5 anos, depois dos `Payment`.
5. **Dado com base legal de guarda é retido bloqueado, não eliminado.** Fiscal/transacional 5 anos; registro
   de acesso 6 meses. Vencido o prazo, expurgo definitivo. Dado anonimizado de forma irreversível sai do
   escopo da LGPD.
6. **A exportação de dados nunca é bloqueada.** Durante a carência a conta fica bloqueada, mas os endpoints
   de exportação (`/api/reports/.../export`) continuam acessíveis (allowlist do gate).

---

## 2. Modelo conceitual

O ciclo de vida de exclusão tem **três janelas de tempo** que não se confundem:

| Janela | Constante | Sinal | O que acontece no fim |
|---|---|---|---|
| **Retenção passiva** (90d) | `DaysAfterAccessLoss` | `Tenant.ScheduledDeletionAt` (calculado pela assinatura) | dispara o **strip** |
| **Carência de exclusão** (30d) | `DeletionGraceDays` | `Tenant.ScheduledDeletionAt` (gravado explicitamente) + `User.AccountDeletionEffectiveAt` | dispara o **strip** (+ anonimiza o User) |
| **Legal-hold** (5a fiscal / 6m acesso) | `LegalHoldYears` / `AccessLogDays` | `Tenant.LegalHoldUntil` / `AccountDeletion.PurgeAfter` | dispara o **purge** |

**`ScheduledDeletionAt` é o gatilho do strip; `LegalHoldUntil`/`PurgeAfter` são o gatilho do purge.** As três
janelas convergem no mesmo pipeline (§4) — o que muda é só quem grava o `ScheduledDeletionAt` e por quanto
tempo.

---

## 3. Os três gatilhos de exclusão

Tudo que leva um tenant a ser excluído grava, no fim das contas, um `Tenant.ScheduledDeletionAt`. Três
caminhos chegam lá:

| Gatilho | Quem grava | Prazo | Anonimiza o User? |
|---|---|---|---|
| **Encerramento de conta** | `AccountDeletionService.RequestAsync` → `ScheduleAccountDeletionForOwnerAsync` (todas as lojas do Owner) | 30d (carência) | **Sim** (todas as lojas + User) |
| **Encerramento de loja** | `TenantService.DeactivateCurrentAsync` (uma loja, exige ≥1 outra ativa) | **90d** (`DaysAfterAccessLoss`) | Não (o Owner segue com as outras lojas) |
| **Retenção passiva** | `DataRetentionRepository.SyncScheduledDeletionAsync` (job horário, derivado da assinatura) | 90d após perda de acesso | Não |

Os três passam pelo **mesmo strip pass** (`TenantDeletionBackgroundService`). Só o encerramento de conta
também anonimiza o `User` (via `AccountDeletion` ledger).

> ⚠️ **Inconsistência conhecida:** o help `exclusao-do-negocio.md` diz "30 dias" para o encerramento de loja,
> mas o código usa **90 dias** (`DeactivateCurrentAsync`). Alinhar (código→30d ou help→90d) é uma pendência.

---

## 4. O pipeline de duas etapas (strip → purge)

Ambas as etapas vivem em **`DataDeletionService`** (`PDV.Infrastructure/Services`), um serviço scoped usado
pelos jobs de background.

### Etapa 1 — STRIP (fim da carência / retenção)
`StripTenantAsync(tenantId)`:
1. **Limpeza física da mídia** (`DeletePhysicalMediaAsync`): enumera `MediaFile` do tenant e apaga cada objeto
   no MinIO (`IStorageService.DeleteAsync`). Ignora URLs absolutas (avatar do Google não está no MinIO).
   Falha em um objeto é logada e não aborta o strip.
2. **Hard-delete do "sem base"** (`NoBasis`): `Appointment`(+items), `Product`, `ProductCategory`, `Service`,
   `ServiceCategory`, `Supplier`, `TenantRole`(+permissions), `MediaFile`, `UserTenant`.
3. **Anonimiza** `Customer` e `Employee` (limpa contato/endereço/foto; mantém nome/documento).
4. **Retém** (legal-hold): `Sale`, `SaleItem`, `Expense`, `EmployeeSalaryLink`, `TenantSettings`, `AuditLog`
   e a **linha do `Tenant`**.
5. Grava `Tenant.LegalHoldUntil = now + 5 anos`, zera `ScheduledDeletionAt` (não reprocessar), `IsActive=false`.

`StripAccountAsync(ledger, tenantIds)` (só no encerramento de conta, depois do strip das lojas):
1. **Anonimiza o `User`** in-place: `Email = deleted+{userId}@deleted.invalid`, limpa `Username/Phone/ImageUrl/
   BirthDate/RefreshToken`; **mantém `Name` + `Document`**.
2. **Hard-delete** `LocalAuth`, `ExternalAuth`, `UserSettings`, `UserSeenMarker`.
3. **Anonimiza `ContactMessage`**: `UserId = Guid.Empty` (mantém a mensagem para suporte).
4. Ledger → `Effected`, `EffectedAt = now`, `PurgeAfter = now + 5 anos`, `TenantIdsJson` gravado.

### Etapa 2 — PURGE (fim do legal-hold, 5 anos)
`PurgeTenantAsync(tenantId)`: hard-delete definitivo do que sobrou (`SaleItem`, `Sale`, `Expense`,
`EmployeeSalaryLink`, `AuditLog`, `Customer`, `Employee`, `UserTenant`, `TenantSettings`, `Tenant`).
`ContactMessage` é preservado (anonimizado, suporte).

`PurgeAccountAsync(ledger)`: `Payment` → `Subscription` → `GatewayCustomer` → `User` (nessa ordem: `Payment`
tem FK Restrict, precisa cair antes do `User`). Ledger → `Purged` (o registro de conformidade permanece).

---

## 5. Categorias de retenção

`RetentionCategory` (enum) + `RetentionPolicy` (`PDV.Domain/Constants`) concentram os prazos num só lugar
auditável. `RetentionPolicy.RetentionFor(categoria)` devolve o prazo; `RetentionPolicy.CategoryOf(auditAction)`
classifica a trilha de auditoria.

| Categoria | Entidades / campos | Prazo | Ação no strip |
|---|---|---|---|
| `NoBasis` | credenciais, preferências, produtos, serviços, agendamentos, fornecedores, cargos, mídia | imediato | hard-delete |
| `MinimalCadastral` | `User`/`Customer` reduzidos a nome+documento | 5 anos | anonimiza o resto |
| `Transactional` | `Sale`, `SaleItem`, `Payment`, `Expense`, `EmployeeSalaryLink`, `Subscription`, `GatewayCustomer` | 5 anos | retém (legal-hold) |
| `SensitiveAudit` | `AuditLog` de ações financeiras/destrutivas | 5 anos | retém |
| `AccessLog` | `AccessLog` + `AuditLog` de login/logout | 6 meses | retém |
| `Housekeeping` | `WebhookEvent` | 90 dias | — (job global) |

Constantes em `RetentionDefaults`: `DeletionGraceDays=30`, `DaysAfterAccessLoss=90`, `AccessLogDays=180`,
`LegalHoldYears=5`, `WebhookEventDays=90`.

---

## 6. Modelo de dados

### Entidade `AccountDeletion` (ledger de conformidade)
Append-only por convenção (nenhum job de cleanup a toca). Scoped por `UserId`, sem query filter de tenant.

| Campo | Significado |
|---|---|
| `UserId` | Owner dono do pedido |
| `Scope` | `Account` (conta inteira) / `SingleStore` (uma loja — reservado; hoje só `Account`) |
| `TenantId` | preenchido só no escopo `SingleStore` |
| `Path` | `DeleteNow` / `AtPeriodEnd` |
| `Status` | `Requested → Cancelled` / `Effected → Purged` |
| `RequestedAt` | quando foi solicitado |
| `CarencyStartsAt` | início da carência (= `User.AccountDeletionEffectiveAt`) |
| `ScheduledDeletionAt` | fim da carência = quando o strip roda (`CarencyStartsAt + 30d`) |
| `EffectedAt` / `PurgeAfter` | quando o strip rodou / quando o purge de 5 anos roda |
| `SubscriptionCanceled` / `RefundRequested` | resultado do cancelamento da assinatura |
| `TenantIdsJson` / `CategoriesJson` | snapshot para a prova de conformidade |

### Entidade `AccessLog` (Marco Civil)
Scoped por `UserId`, GLOBAL (sem query filter). **Sem FK para `User`** (precisa sobreviver à anonimização).
Campos: `UserId`, `Event` (`AccessEvent`: `LoggedIn`/`LoggedOut`), `IpAddress` (45 — IPv6), `UserAgent` (512),
`CreatedAt` (= data/hora do evento).

### Campos novos em entidades existentes
- **`User`**: `AccountDeletionRequestedAt` (discriminador que o reconciliador respeita) e
  `AccountDeletionEffectiveAt` (início da carência bloqueada; o gate bloqueia quando `now >=` este valor).
- **`Tenant`**: `LegalHoldUntil` (âncora de legal-hold; o purge apaga quando vence). Continua tendo
  `ScheduledDeletionAt` (gatilho do strip).
- **`Payment.UserId`**: FK mudou de `Cascade` → **`Restrict`** (senão apagar o `User` levaria o histórico
  fiscal junto).

### Enums novos
`AccountDeletionPath`, `AccountDeletionScope`, `AccountDeletionStatus`, `RetentionCategory`, `AccessEvent`;
`AuditAction` += `UserLoggedIn`/`UserLoggedOut`; `AuditEntityType` += `Authentication`.

### Migrations
`AddAccountDeletion` (ledger + flags do User + FK do Payment), `AddTenantLegalHold`, `AddAccessLog`.

---

## 7. Mapa de componentes

### Backend

| Camada | Arquivo | Papel |
|---|---|---|
| Controller | `PDV.Api/Controllers/AccountDeletionController.cs` | `/status`, `/preview`, `request`, `/cancel` (Owner) |
| Service | `PDV.Infrastructure/Services/AccountDeletionService.cs` | Preview/Request/Cancel/GetStatus; reusa `SubscriptionService.CancelAsync` |
| Service | `.../DataDeletionService.cs` | Pipeline strip/purge (tenant + conta) + limpeza física de mídia |
| Service | `.../AuthEventLogger.cs` (`IAuthEventLogger`) | Grava `AccessLog` + `AuditLog` no login/logout; nunca lança |
| Job | `.../TenantDeletionBackgroundService.cs` | **Strip pass** (24h): contas vencidas + lojas vencidas |
| Job | `.../DataPurgeBackgroundService.cs` | **Purge pass** (24h): loja/conta 5a + webhook 90d + acesso 6m |
| Job | `.../AuditLogCleanupService.cs` | Cleanup de `AuditLog` por categoria (acesso 6m / sensível 5a) |
| Job | `.../SubscriptionExpiryBackgroundService.cs` | (1h) agenda retenção passiva — **com guard** de exclusão de conta |
| Middleware | `PDV.Api/Middleware/AccountDeletionBlockMiddleware.cs` | 423 `ACCOUNT_PENDING_DELETION` (allowlist auth/export/reativar) |
| Repo | `.../Repositories/AccountDeletionRepository.cs` | ledger (Add/Update/GetActiveAccountRequest) |
| Repo | `.../Repositories/DataRetentionRepository.cs` | `ScheduleAccountDeletionForOwnerAsync`, `ClearAccountDeletionForOwnerAsync`, guard no `SyncScheduledDeletionAsync` |
| Repo | `.../Repositories/UserRepository.cs` | `GetAccountDeletionEffectiveAtAsync` (projeção leve p/ o middleware) |
| Constants | `PDV.Domain/Constants/{RetentionDefaults,RetentionPolicy}.cs` | prazos + política por categoria |

### Frontend

| Arquivo | Papel |
|---|---|
| `types/account.types.ts` | contrato (`AccountDeletionPreview/Result/Status`, `AccountDeletionPath`) |
| `services/account.service.ts` | HTTP; **o enum `Path` vai por NÚMERO** (0/1) — não há `JsonStringEnumConverter` global no backend |
| `hooks/useAccountDeletion.ts` | `useAccountDeletionStatus/Preview` + `useRequest/CancelAccountDeletion` |
| `pages/Settings/components/ProfileSection/index.tsx` | botão Owner-only + `ConfirmDialog` (checkbox, Path A/B, export, nota reativar≠reassinar) |
| `components/AccountDeletionBanner/` | faixa pré-carência (Path B) — reativar / baixar dados |
| `components/AccountDeletionOverlay/` | tela cheia bloqueado — export por categoria + reativar + sair |
| `layouts/DashboardLayout/index.tsx` | orquestra faixa/overlay; suprime `DataDeletionBanner` quando pending |
| `hooks/useApiError.ts` | silencia o toast de 423 (o overlay já comunica) |

---

## 8. Superfície HTTP

| Método | Rota | Auth | Papel |
|---|---|---|---|
| GET | `/api/account/deletion` | Autenticado | estado (`pending`, `blocked`, `effectiveAt`, `scheduledDeletionAt`) — acessível durante o bloqueio |
| GET | `/api/account/deletion/preview` | Owner | estado da assinatura + caminhos (Path A/B, janela de 7d, reembolso em curso) |
| POST | `/api/account/deletion` | Owner | solicita (`{ path: 0|1 }`) |
| POST | `/api/account/deletion/cancel` | Owner | reativa (reverte durante a carência) |

O `preview` devolve `{ subscriptionStatus, currentPeriodEnd, withinRefundWindow, refundInProgress,
canScheduleAtPeriodEnd, graceDays }`. O `request` devolve `{ effectiveAt, scheduledDeletionAt,
subscriptionCanceled, refundRequested }`.

---

## 9. Fluxos em detalhe

### 9.1 Solicitar encerramento — `AccountDeletionService.RequestAsync(path)`
1. Bloqueia se já há pedido (`User.AccountDeletionRequestedAt != null`).
2. Bloqueia se a assinatura está `RefundRequested` (estorno anterior em curso — aguardar/suporte).
3. **Cancela a assinatura** se `Active`/`Trialing` reusando `SubscriptionService.CancelAsync` (matriz do
   §subscriptions: trial → acesso cai; ≤7 dias → estorno integral; fora → `Canceled` até o fim do período).
4. Calcula `effectiveAt`: **Path A** (`DeleteNow`) = agora; **Path B** (`AtPeriodEnd`) = `AccessUntil` do
   cancelamento (só válido quando há vigência futura, senão 400).
5. Grava `User.AccountDeletionRequestedAt/EffectiveAt` **antes** de agendar as lojas (para o reconciliador já
   respeitar), agenda `ScheduledDeletionAt = effectiveAt + 30d` em todas as lojas, cria o ledger `Requested`.

### 9.2 Reativar — `AccountDeletionService.CancelAsync`
Só se `Status==Requested` e `ScheduledDeletionAt` no futuro. Limpa `ScheduledDeletionAt` das lojas + as flags
do `User`; ledger → `Cancelled`. **Não** ressuscita a assinatura (a UI avisa: reativar ≠ reassinar).

### 9.3 Matriz da assinatura no pedido
| Estado | Caminhos | Cancelamento |
|---|---|---|
| Trial | só Path A (carência agora) | sem gateway |
| Ativa, dentro de 7d | só Path A (acesso cai) | **estorno integral** (RefundRequested) |
| Ativa, fora de 7d | Path A **ou** B | `Canceled`, acesso até `CurrentPeriodEnd` |
| Sem assinatura / Expired / Canceled | só Path A | nada a cancelar |
| RefundRequested | **bloqueado** | — |

### 9.4 Guard do reconciliador
`SyncScheduledDeletionAsync` (job de 1h) recalcula `ScheduledDeletionAt` pela assinatura. Ele **pula owners
com `AccountDeletionRequestedAt != null`** — senão, no Path B (assinatura `Canceled` com acesso futuro →
`AccessLostAt` nulo), limparia o agendamento explícito em ≤1h.

---

## 10. Gate de bloqueio

`AccountDeletionBlockMiddleware` (depois do `MustChangePasswordMiddleware`, antes do `UseAuthorization`):
- Para todo request autenticado, consulta `User.AccountDeletionEffectiveAt` (projeção leve por PK).
- Se `<= now`, responde **423** com `code: ACCOUNT_PENDING_DELETION`, **exceto** a allowlist:
  `/api/auth/me|logout|refresh`, `/api/account/deletion` (status/reativar) e qualquer rota com `/export`.
- Enforcement **stateful** (consulta o banco): o pedido acontece no meio da sessão e não dá para revogar um
  `access_token` já emitido só por claim; no Path B a carência começa numa data futura.
- O frontend não é deslogado — o overlay cobre o app e o 423 é silenciado no `useApiError`.

---

## 11. Log de acesso (Marco Civil)

`AuthEventLogger.LogAsync(userId, name, tenantId, evt)`, chamado no `AuthService` em **login local**, **login
Google** e **logout**:
- Grava um `AccessLog` (IP via `X-Forwarded-For` → `RemoteIpAddress`; UserAgent; evento).
- Espelha na trilha de auditoria com `AuditAction.UserLoggedIn/Out` + `AuditEntityType.Authentication`
  (`TenantId = LastTenantId ?? Guid.Empty`).
- **Nunca lança**: uma falha de log é apenas registrada e não derruba a autenticação.
- Retenção: `AccessLog` 6 meses (purgado pelo `DataPurgeBackgroundService`); os `AuditLog` de acesso caem na
  categoria `AccessLog` (6m) no `AuditLogCleanupService`, enquanto os demais são `SensitiveAudit` (5a).

---

## 12. Jobs

| Job | Cadência | O que faz |
|---|---|---|
| `SubscriptionExpiryBackgroundService` | 1h | expira vencidos + `SyncScheduledDeletionAsync` (retenção passiva, **com guard**) |
| `TenantDeletionBackgroundService` | 24h | **strip**: contas due (anonimiza User + strip das lojas) e depois lojas due (strip) |
| `DataPurgeBackgroundService` | 24h | **purge**: lojas com `LegalHoldUntil` vencido, contas com `PurgeAfter` vencido, `WebhookEvent` 90d, `AccessLog` 6m |
| `AuditLogCleanupService` | 24h | cleanup de `AuditLog` por categoria (acesso 6m / sensível 5a) |

Ordem no strip: **contas primeiro** (o strip zera o `ScheduledDeletionAt` das lojas da conta), depois as lojas
restantes.

---

## 13. Máquina de estados

**Ledger `AccountDeletion`:**
```
RequestAsync ──▶ Requested ──(CancelAsync, prazo no futuro)──▶ Cancelled
                    │
                    │ (strip pass, ScheduledDeletionAt <= now)
                    ▼
                 Effected ──(purge pass, PurgeAfter <= now)──▶ Purged
```

**Tenant (qualquer gatilho):**
```
ativo ──(ScheduledDeletionAt gravado)──▶ agendado
      ──(strip: ScheduledDeletionAt<=now)──▶ legal-hold (IsActive=false, LegalHoldUntil=+5a, dados fiscais retidos)
      ──(purge: LegalHoldUntil<=now)──▶ apagado definitivamente
```

**User (encerramento de conta):**
```
ativo ──(RequestAsync)──▶ pendente (flags gravadas) ──(now>=EffectiveAt)──▶ bloqueado
      ──(strip)──▶ anonimizado (nome+documento; credenciais apagadas)
      ──(purge, +5a)──▶ apagado (após Payment/Subscription/GatewayCustomer)
```

---

## 14. Matriz de cenários

| # | Cenário | Esperado |
|---|---|---|
| A1 | Pedir sem assinatura (Path A) | carência agora, lojas `+30d`, ledger `Requested`, `blocked=true` |
| A2 | Pedir com assinatura ativa fora de 7d, Path B | assinatura `Canceled`, `effectiveAt=CurrentPeriodEnd`, `blocked=false` até lá |
| A3 | Pedir dentro de 7d | estorno integral emitido (`RefundRequested`), só Path A |
| A4 | Pedir com `RefundRequested` pendente | bloqueado (aguardar estorno) |
| A5 | Endpoint gateado durante bloqueio | **423** `ACCOUNT_PENDING_DELETION` |
| A6 | Exportação durante bloqueio | **200** (allowlist) |
| A7 | Reativar durante a carência | flags/lojas limpas, ledger `Cancelled`; assinatura **não** volta |
| A8 | Reconciliador roda com pedido ativo (Path B) | `ScheduledDeletionAt` **preservado** (guard) |
| S1 | Strip vence | no-basis apagado, `Customer/Employee/User` anonimizados, mídia MinIO limpa, `Sale/Expense` retidos, `LegalHoldUntil=+5a` |
| S2 | ContactMessage no strip da conta | `UserId=Guid.Empty`, corpo preservado |
| P1 | Purge vence (loja) | tudo apagado, inclusive a linha do `Tenant` |
| P2 | Purge vence (conta) | `Payment/Subscription/GatewayCustomer/User` apagados; ledger `Purged` |
| L1 | Login/logout | `AccessLog` (IP+UA) + `AuditLog` `UserLoggedIn/Out` |
| E1 | Encerrar loja (Owner com ≥2) | só aquela loja entra no pipeline; User intacto |

---

## 15. Como testar

O fluxo foi validado E2E dirigindo os endpoints reais (JWT assinado + middleware + jobs) com asserções no
banco. Os scripts ficam no scratchpad da sessão; o roteiro:

1. **Semear** um Owner + tenant (ordem: Tenant antes do User por causa do FK `LastTenantId`), montar um JWT
   HS256 com o `JWT_SECRET` e usá-lo como cookie `access_token`.
2. **Pedido/bloqueio/reativação** (síncrono, via HTTP): `preview` → `request` → confirmar `423` em rota
   gateada e `200` em `/export` → `cancel`.
3. **Strip/purge**: forçar as datas no banco (`ScheduledDeletionAt`/`LegalHoldUntil`/`PurgeAfter` no passado) e
   **reiniciar a API** (`docker compose restart api`) — os jobs rodam `RunOnceAsync` no startup. Verificar
   anonimização/retenção/expurgo por SQL.
4. **Log de acesso**: `POST /api/auth/logout` com o JWT → verificar `AccessLog` + `AuditLog`.

Verificações de invariante que quebram com mais frequência: guard do reconciliador (A8), `Payment` retido no
strip e apagado só no purge (P2), Tenant retido no strip (S1), enum do `request` por número (frontend).

---

## 16. Armadilhas de manutenção

- **Não apague o `Tenant` no strip.** `Sale/Expense/Customer/Employee` são CASCADE para `Tenant` — apagar a
  linha derruba os dados fiscais. O `Tenant` é a âncora de legal-hold; só cai no purge de 5 anos.
- **`Payment.UserId` é `Restrict`.** Apagar o `User` antes dos `Payment` estoura o FK. No purge, a ordem é
  `Payment → Subscription → GatewayCustomer → User`.
- **Guard do reconciliador é obrigatório.** Sem pular owners com `AccountDeletionRequestedAt`, o job de 1h
  limpa o agendamento explícito (especialmente no Path B).
- **`AccessLog` não tem FK para `User`** de propósito — precisa sobreviver à anonimização/exclusão do usuário.
- **O `request` liga o enum por NÚMERO** (`0`/`1`). Se um dia adicionar `JsonStringEnumConverter` global no
  backend, revisar **todos** os DTOs (muda a serialização de enums nas respostas).
- **`dotnet watch` no container** não aplica bem mudança de assinatura de método (ex.: novo parâmetro de
  construtor no `AuthService`); recrie a API (`docker compose up -d --force-recreate api`) antes de testar.
- **`MarkdownRenderer` não tem `remark-gfm`** — no conteúdo servido (help/legal) use **listas**, não tabelas
  markdown, senão renderiza como texto cru.
- **Inconsistência 30/90 do encerramento de loja** (§3): help diz 30d, código usa 90d — decidir e alinhar.
- **Strip mudou a retenção passiva.** Antes o tenant era apagado por completo em 90d; agora é strip +
  legal-hold de 5 anos. Mais aderente à lei, mas é mudança de comportamento do fluxo antigo.
