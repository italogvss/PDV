# Avisos / Modais "uma vez por usuário"

Sistema para mostrar modais de aviso aos usuários **uma única vez** após o login. Cobre dois casos:

- **Editorial** — conteúdo que muda com o tempo (nova feature, mudança de termos, nova versão). Publicado **via SQL, sem rebuild do frontend**.
- **Ciclo de vida** — conteúdo fixo no código, disparado por estado do app (ex.: apresentação após criar a loja).

---

## Como funciona (visão geral)

Dois mecanismos, um único controle de "visto":

| Tabela | Papel |
|---|---|
| `Announcements` | Conteúdo editorial + regras de segmentação. Entidade **global** (sem `TenantId`). |
| `UserSeenMarkers` | O que cada usuário já viu. Scoped por `UserId`. `Key` genérica. |

A `Key` em `UserSeenMarkers` é o que liga tudo:
- aviso editorial → `Key = Announcement.Id`
- modal de ciclo de vida → `Key = "lifecycle:<nome>"` (ex.: `lifecycle:welcome`)

**Fluxo:** ao entrar no dashboard, o frontend chama `GET /api/announcements/feed`. O backend devolve só os avisos **ativos, dentro da janela de datas, segmentados para o usuário e ainda não vistos**. O `AnnouncementCenter` mostra um modal por vez; ao fechar, chama `POST /api/announcements/seen` e nunca mais mostra aquele aviso para aquele usuário (vale entre dispositivos, pois é no backend).

> O feed fica **desabilitado durante o onboarding** (`/criar-negocio`, sem `tenantId`) — nenhum modal aparece antes da loja existir.

---

## Caso 1 — Publicar um aviso editorial (sem rebuild)

Basta inserir uma linha em `Announcements`. Nenhum deploy necessário.

### Exemplo: aviso para todos

```sql
INSERT INTO Announcements
  (Id, Title, Body, Type, PublishAt, ExpiresAt, TargetPlanCode, TargetRole, Priority, IsActive, CreatedAt, UpdatedAt)
VALUES
  (UUID(),
   'Nova funcionalidade: Relatórios',
   '## Chegou o módulo de Relatórios!\n\nVeja seus números em **Relatórios** no menu lateral.',
   'Feature', NOW(), NULL, NULL, NULL, 0, 1, NOW(), NOW());
```

### Exemplo: aviso com botão (CTA) e imagem

```sql
INSERT INTO Announcements
  (Id, Title, Body, Type, ImageUrl, CtaLabel, CtaUrl, PublishAt, ExpiresAt, TargetPlanCode, TargetRole, Priority, IsActive, CreatedAt, UpdatedAt)
VALUES
  (UUID(),
   'Atualização dos Termos de Uso',
   'Atualizamos nossos termos. Recomendamos a leitura.',
   'Terms', NULL, 'Ler os termos', 'https://pdvultra.com/termos',
   NOW(), NULL, NULL, NULL, 10, 1, NOW(), NOW());
```

### Campos

| Campo | O que faz |
|---|---|
| `Title` | Título do modal. |
| `Body` | Corpo em **markdown** (renderizado no frontend). |
| `Type` | `Info` \| `Feature` \| `Terms` \| `Version` (só estilo/ícone). |
| `ImageUrl` | Opcional — imagem no topo do modal. |
| `CtaLabel` + `CtaUrl` | Opcional — botão extra que abre um link. Os dois juntos. |
| `PublishAt` | A partir de quando aparece. `NULL` = imediatamente. |
| `ExpiresAt` | Até quando aparece. `NULL` = nunca expira. |
| `TargetPlanCode` | `free` \| `starter` \| `pro`. **`NULL` = todos os planos.** |
| `TargetRole` | `Owner` \| `Employee` \| `Admin`. **`NULL` = todos os cargos.** |
| `Priority` | Ordem quando há vários pendentes (**maior = aparece primeiro**). |
| `IsActive` | `1` ativo, `0` desligado (esconde sem apagar). |

> **Segmentação:** qualquer campo `Target*` em `NULL` significa "vale para todos" naquela dimensão. Ex.: `TargetPlanCode='pro'` + `TargetRole=NULL` → todos os usuários de lojas no plano Pro.

### Desligar / corrigir um aviso

```sql
-- Esconder de quem ainda não viu (quem já viu não veria de novo de qualquer forma)
UPDATE Announcements SET IsActive = 0 WHERE Id = '...';

-- "Re-anunciar" para todos: deletar os markers daquele aviso faz ele reaparecer
DELETE FROM UserSeenMarkers WHERE `Key` = '<announcement-id>';
```

---

## Caso 2 — Criar um modal de ciclo de vida (fixo)

Conteúdo fica no código; o "visto" é controlado por uma `Key` com prefixo `lifecycle:`. **Não precisa de migration nem SQL** — só adicionar uma entrada no registro.

Arquivo: [lifecycle.tsx](../frontend/src/components/AnnouncementCenter/lifecycle.tsx)

```tsx
export const LIFECYCLE_MODALS: LifecycleModal[] = [
  {
    key: 'lifecycle:welcome',
    // condição para aparecer (recebe { tenantId, name })
    shouldShow: (ctx) => !!ctx.tenantId,
    title: 'Bem-vindo ao PDV-Ultra! 🎉',
    body: <Box>...conteúdo livre em JSX...</Box>,
  },

  // Novo modal fixo: só acrescentar aqui
  {
    key: 'lifecycle:nova-tela-relatorios',
    shouldShow: (ctx) => !!ctx.tenantId,
    title: 'Conheça a nova tela de Relatórios',
    body: <Typography>...</Typography>,
  },
]
```

Regra de ouro: **cada novo modal precisa de uma `key` única** (sempre com prefixo `lifecycle:`). Os de ciclo de vida aparecem **antes** dos editoriais na fila.

---

## Arquivos

**Backend**
- Entidades: [Announcement.cs](../backend/PDV.Domain/Entities/Announcement.cs), [UserSeenMarker.cs](../backend/PDV.Domain/Entities/UserSeenMarker.cs)
- Tier de plano: [PlanTier.cs](../backend/PDV.Domain/Constants/PlanTier.cs)
- Serviço (targeting + feed): [AnnouncementService.cs](../backend/PDV.Infrastructure/Services/AnnouncementService.cs)
- Endpoints: [AnnouncementsController.cs](../backend/PDV.Api/Controllers/AnnouncementsController.cs)
  - `GET /api/announcements/feed` — avisos pendentes + keys de ciclo de vida vistas
  - `POST /api/announcements/seen` — body `{ "key": "..." }`

**Frontend**
- Service/hook: [announcement.service.ts](../frontend/src/services/announcement.service.ts), [useAnnouncements.ts](../frontend/src/hooks/useAnnouncements.ts)
- Orquestrador + modal + registro: [AnnouncementCenter/](../frontend/src/components/AnnouncementCenter/)
- Montado em: [DashboardLayout/index.tsx](../frontend/src/layouts/DashboardLayout/index.tsx)

---

## Detalhes que importam

- **"Visto" é por usuário e no backend** → sobrevive a troca de dispositivo e limpeza de cache. (Diferente do `NotificationButton`, que usa localStorage.)
- **Plano efetivo** para segmentar vem do `IEntitlementService` (resolve via o Owner da loja atual). Sem assinatura válida = `free`.
- **`free`/`starter`/`pro`** são derivados do nome do plano em [PlanTier.cs](../backend/PDV.Domain/Constants/PlanTier.cs) — não há campo "código" no `Plan`.
- O índice único `UserSeenMarkers (UserId, Key)` garante a marcação idempotente.
