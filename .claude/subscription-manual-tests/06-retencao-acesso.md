# Bloqueio de acesso e retenção — D1 a D7

Referência: [subscriptions.md §8.9, §10](../../docs/subscriptions.md). Invariantes: **90 dias de
retenção após a perda de acesso — inclusive para quem nunca assinou**; a loja **continua ativa** e o
usuário **continua logando** (para exportar dados ou reassinar); **não existe plano gratuito** — sem
assinatura com direito ao plano, todo endpoint gateado responde **402**.

A retenção é uma **reconciliação idempotente** rodada pelo job horário, derivada do estado da
assinatura do **Owner**:

| Estado do Owner | `Tenant.ScheduledDeletionAt` |
|---|---|
| Assinatura com acesso | `NULL` |
| Assinatura sem acesso | `AccessLostAt + 90d` |
| Nenhuma assinatura | `Tenant.CreatedAt + 90d` |

Consulta de verificação, use em todos:
```sql
SELECT t.Name, t.IsActive, t.CreatedAt, t.ScheduledDeletionAt
FROM Tenants t JOIN UserTenants ut ON ut.TenantId = t.Id
JOIN Users u ON u.Id = ut.UserId WHERE u.Email = 'teste@exemplo.com';
```

---

## D1 — Trial expira

**Pré:** T4 executado (`Status = Expired`, trial vencido).

**Esperado**
- `ScheduledDeletionAt = AccessLostAt + 90d` (≈ `TrialEndsAt + 90d`).
- **`Tenants.IsActive = 1`** — a loja **não** é desativada.
- O usuário **loga normalmente**; o dashboard abre; os módulos dão 402.
- *UI:* `DataDeletionBanner` — faixa **não dispensável** com contagem regressiva e os botões
  "Baixar meus dados" / "Assinar um plano".

---

## D2 — Cria loja e nunca assina

**Pré:** T3 executado (loja sem `?plano=`, sem assinatura).

**Esperado**
- `ScheduledDeletionAt = Tenant.CreatedAt + 90d` — o prazo conta da **criação da loja**, não de uma
  perda de acesso que nunca houve.
- Banner de exclusão visível; módulos → 402.

---

## D3 — Assina no dia 80 da retenção (o agendamento é cancelado)

**Pré:** D1 ou D2, com `ScheduledDeletionAt` preenchido. Confirme que está preenchido antes.

**Passos**
1. Assine um plano (C1) e espere o webhook ativar.
2. Rode o job (`docker compose restart api`) ou espere a hora cheia.

**Esperado**
- `ScheduledDeletionAt` volta a **`NULL`**. O banner some. Módulos liberados.

> Idempotente: é uma reconciliação, não um "cancelar agendamento" espalhado por handler. Rodar o job
> duas vezes não muda nada.

---

## D4 — Cancela fora da janela (prazo conta do fim do período pago)

**Pré:** X3 executado (`Canceled` com `CurrentPeriodEnd` no futuro).

**Esperado**
- **Enquanto o período corre:** `ScheduledDeletionAt` = **NULL** (ainda tem acesso!) e os módulos
  funcionam.
- **Depois de o período vencer** (recue `CurrentPeriodEnd` e rode o job): `Status → Expired` e
  `ScheduledDeletionAt = CurrentPeriodEnd + 90d` — conta do **fim do período pago**, não da data do
  clique em cancelar.

---

## D5 — Prazo de retenção vence (apaga tenant **ativo**)

**Pré:** qualquer tenant com `ScheduledDeletionAt` preenchido e **`IsActive = 1`**.

**Passos**
1. ```sql
   UPDATE Tenants SET ScheduledDeletionAt = UTC_TIMESTAMP() - INTERVAL 1 DAY WHERE Id = '<tenantId>';
   ```
2. `docker compose restart api` (o `TenantDeletionBackgroundService` roda na subida).

**Esperado**
- O tenant é **apagado permanentemente** — mesmo estando `IsActive = 1`. Confira que sumiu:
  ```sql
  SELECT * FROM Tenants WHERE Id = '<tenantId>';   -- 0 linhas
  ```
- Os dados do tenant (produtos, vendas...) vão junto.

**Como falha:** se o tenant sobreviver, o job está filtrando por `IsActive` — e justamente os casos de
retenção (loja ativa, sem assinatura) nunca seriam excluídos. Já foi armadilha; não repetir.

> Irreversível. Rode em base de teste. **Não há e-mail de aviso** — a comunicação é in-app.

---

## D6 — Sem acesso, exporta CSV

**Pré:** qualquer usuário sem direito ao plano (`Expired`, `RefundRequested`, ou sem assinatura).

**Passos**
1. Clique em "Baixar meus dados" no banner, ou chame o `DataExportController` direto.

**Esperado**
- **Permitido** — o export fica **fora** do gate de plano por design. É o que dá sentido ao "cancelar e
  ainda baixar seus dados".
- Um `Employee` **sem** a permissão `ViewReports` continua recebendo **403** — o export é gateado por
  **cargo** (403), não por plano (402). Os dois eixos são ortogonais.

---

## D7 — Sem acesso, abre um módulo

**Pré:** o mesmo do D6.

**Passos**
1. Abra Estoque / Vendas / Relatórios pelo menu.

**Esperado**
- **402** com `code: NOT_IN_PLAN`; a UI mostra o toast/convite de upgrade.
- **O item do menu NÃO está escondido nem desabilitado** — o frontend não esconde UI por plano; o 402 é
  que vira convite. Se a UI estiver escondendo, é regra de plano duplicada no frontend (bug).
- Teste também o **limite numérico**: no Essencial (máx. 2 funcionários), cadastre o 3º → **402** com
  `code: PLAN_LIMIT_EXCEEDED` (mensagem diferente de `NOT_IN_PLAN`).
