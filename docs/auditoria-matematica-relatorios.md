# Auditoria de Matemática — Relatórios & Estatísticas (revisão pré-produção)

> Gerado em 2026-07-06. Reexecução da auditoria de 2026-06-28 (`.claude/reports-math-audit.md`),
> ampliada para as novas superfícies analíticas: **página de Relatórios**, **Dashboard** (que
> reaproveita endpoints de relatório), **Detalhe do Cliente** (`CustomerDetail`) e **Detalhe do
> Funcionário** (`EmployeeDetail`).
>
> Cobre a cadeia completa: componentes React → hooks React Query → services → controllers →
> `ReportService` / `CustomerService` / `EmployeeService` → entidades EF Core.

---

## 1. Sumário executivo

O motor de relatórios está **funcional e bem organizado por camadas**, mas há **um erro de cálculo
de lucro que afeta os números mais importantes para o dono** e **três definições divergentes de
"lucro" convivendo em telas diferentes**. Antes de produção, recomendo tratar os itens de
severidade **Alta** — são justamente os que o comerciante usa para decidir preço, desconto e corte
de custo.

| Severidade | Qtd | Tema |
|---|---|---|
| 🔴 Alta | 4 | Desconto ignorado no lucro; 3 definições de lucro; base de receita inconsistente; margem em bases mistas |
| 🟡 Média | 5 | Top produtos do cliente mistura serviços; categorias de serviço contam agendamentos futuros; "Total gasto" ignora atendimentos; período anterior desalinhado; fuso horário UTC |
| ⚪ Baixa/limpeza | 5 | Endpoint órfão `new-vs-returning`; `cancelledCount` nunca exibido; agrupamento por nome; despesas não pagas na competência; redundâncias |

O detalhamento por estatística está na seção 4; as falhas priorizadas na seção 5; a proposta de
arquitetura/centralização na seção 6.

---

## 2. O que mudou desde a auditoria anterior

A auditoria de 2026-06-28 cobria 11 itens (KPIs + 7 gráficos). Desde então:

**Novos endpoints no `ReportService`:**
- `GetRevenueByTypeAsync` — donut Serviços × Produtos (antes documentado, agora confirmado).
- `GetExpensesByCategoryAsync` — usado no **Dashboard**, não na página de Relatórios.
- `GetCustomerNewVsReturningAsync` — **sem nenhum consumidor de UI** (ver Falha #10).
- `GetStockSnapshotAsync` + toda a família `Export*CsvAsync` (vendas, estoque, clientes, serviços,
  despesas, faturamento, equipe) e `ExportForTenantAsync` (LGPD/exclusão de tenant).

**Novas superfícies analíticas fora da página de Relatórios:**
- **Dashboard** (`pages/Dashboard`) — KPIs de faturamento/despesas/lucro estimado + `AnalyticsDashboard`
  (Pro) que reusa `useFinancialSummary`, `useSalesByPaymentMethod`, `useTopProducts`.
- **CustomerDetail** — `CustomerService.GetCrmStatsAsync` (CRM completo: gasto, ticket, top produtos,
  categorias, linha do tempo, agendamentos).
- **EmployeeDetail** — `EmployeeService.GetPerformanceStatsAsync` (vendas no caixa, agendamentos,
  taxa de cancelamento, salário × receita).

**Consequência:** a matemática financeira, que antes vivia num único serviço, agora está
**replicada em 3 serviços de backend e em vários componentes de frontend** — o que amplia o risco de
divergência (é exatamente o que aconteceu com a definição de "lucro").

---

## 3. Fundamentos — modelo de dados e as relações que importam

Confirmado lendo `SaleService.CreateAsync` e as entidades. **Toda análise financeira depende destas
igualdades**, então elas são a base para julgar cada estatística:

```
SaleItem.Subtotal        = UnitPrice × Quantity        ← POR ITEM, PRÉ-DESCONTO
itemsTotal               = Σ SaleItem.Subtotal
Sale.Discount            = clamp(request.Discount, 0, itemsTotal)   ← desconto no NÍVEL DA VENDA
Sale.Total               = itemsTotal − Discount        ← PÓS-DESCONTO
Sale.FeeAmount           = round(Total × FeeRate/100)   ← taxa sobre o Total pós-desconto
Sale.NetAmount           = Total − FeeAmount
```

Pontos críticos que decorrem disso:

1. **O desconto é aplicado só no nível da venda (`Sale.Total`)** — ele **não** é distribuído nos
   `SaleItem.Subtotal`. Logo, qualquer soma de `Subtotal` está **pré-desconto**, e qualquer soma de
   `Sale.Total` está **pós-desconto**. Misturar as duas bases gera números que não fecham.
2. `SaleItem` pode ser **produto** (`ProductId != null`) **ou serviço** (`ServiceId != null`) — uma
   venda no caixa pode conter serviços. Filtrar (ou não) por `ProductId` muda o resultado.
3. `PurchasePriceSnapshot` (custo) só existe em produtos com custo cadastrado. Serviços têm custo
   nulo (legítimo, 100% de margem); produtos sem custo cadastrado têm custo nulo (dado faltando).

**Filtros globais:** `Sale` e `Expense` têm `HasQueryFilter` só por `TenantId` (sem `IsActive`), então
nenhuma query de relatório passa `TenantId` manualmente — correto e consistente com o CLAUDE.md.

---

## 4. Catálogo completo de estatísticas

Legenda de veredito: ✅ correto · ⚠️ correto com ressalva · 🔴 incorreto/enganoso.

### 4.1 Página de Relatórios — KPIs

| # | KPI | Endpoint | Entidade · campos | Cálculo | Veredito |
|---|---|---|---|---|---|
| 1 | Receita total | `GET /reports/sales` | `Sale.Total, Status, CreatedAt` | `Σ Total WHERE Active` | ✅ pós-desconto |
| 2 | Total de vendas | `GET /reports/sales` | `Sale.Status, CreatedAt` | `COUNT WHERE Active` | ✅ |
| 3 | Ticket médio | `GET /reports/sales` | idem | `totalRevenue / totalSales` (0 se 0) | ✅ |
| 4 | Margem de lucro média | `financial-summary` (frontend) | `revenue, netResult` por bucket | `(Σ netResult / Σ revenue) × 100` | 🔴 bases mistas (Falha #4) |

`GetSalesMetricsAsync` carrega ativas **e** canceladas para calcular `cancelledCount` — que é
retornado na API mas **nunca exibido** (Falha #11).

### 4.2 Página de Relatórios — série temporal (`FinancialSummaryPoint`)

**Endpoint:** `GET /reports/financial-summary?groupBy=day|week|month|year`
**Entidades:** `Sale`, `SaleItem`, `Expense`.

```
Por bucket:
  Revenue       = Σ Sale.Total                              ← pós-desconto
  ProfitRevenue = Σ SaleItem.Subtotal  (só serviço OU produto com custo)   ← PRÉ-DESCONTO
  Cost          = Σ PurchasePriceSnapshot × Qty  (mesmos itens)
  Fees          = Σ Sale.FeeAmount
  Expenses      = Σ Expense.Amount  (por DueDate — competência)
  GrossProfit   = ProfitRevenue − Cost      ← ⚠️ NÃO subtrai Discount
  NetResult     = GrossProfit − Fees − Expenses
```

| Gráfico | Séries | Veredito |
|---|---|---|
| FinancialBarChart ("Receita × Resultado líquido") | `revenue`, `netResult` | 🔴 `netResult` superestimado (Falha #1) |
| AccumulatedProfitChart ("Lucro acumulado") | soma cumulativa de `netResult` no frontend | 🔴 herda o erro de #1 |
| RevenueLineChart ("Receita ao longo do tempo") | `revenue` atual vs período anterior | ⚠️ desalinhamento de período (Falha #8) |

> **Falha #1 (a mais importante):** `ProfitRevenue` soma `Subtotal` **pré-desconto** e o
> `Sale.Discount` **nunca é subtraído** do `GrossProfit`/`NetResult`. Só a linha "Receita" enxerga o
> desconto. Resultado: **o lucro é superestimado exatamente pelo valor do desconto concedido.**
>
> Exemplo (1 produto, custo R$40, preço R$100, desconto R$20):
> `Revenue = 80`, `ProfitRevenue = 100`, `Cost = 40` → `GrossProfit = 60`.
> Mas o lucro real = `Total − Cost = 80 − 40 = 40`. **Superestimado em R$20** (todo o desconto).
> Ironicamente, o `TopProductsChart` **rateia** o desconto corretamente (ver 4.3) — ou seja, a mesma
> base já existe no código, só não é usada aqui.

### 4.3 Página de Relatórios — sem série temporal

| # | Gráfico | Endpoint | Cálculo | Veredito |
|---|---|---|---|---|
| 8 | RevenueByTypeDonut (Serviços × Produtos) | `revenue-by-type` | `Σ Subtotal` por `ServiceId null/≠null` | 🔴 **pré-desconto** → não fecha com KPI "Receita total" (Falha #3) |
| 9 | PaymentMethodPieChart | `sales/by-payment-method` | `Σ Total` por método | ✅ pós-desconto, coerente |
| 10 | OperatorRankingChart | `sales/by-operator` | `Σ Total` por `(OperatorId, OperatorName)` | ✅ pós-desconto |
| 11 | TopProductsChart | `products/top` | `Σ (Subtotal − Discount × Subtotal/ItemsTotal)` | ✅ **rateia desconto**; agrupa por nome (Falha #13); só `ProductId≠null` |

### 4.4 Dashboard (reusa endpoints de relatório)

| KPI | Fonte | Cálculo | Veredito |
|---|---|---|---|
| Faturamento | `useSalesMetrics` | `totalRevenue` | ✅ |
| Despesas | `useExpensesByCategory` | `Σ total` (frontend) | ⚠️ competência (Falha #14) |
| **Lucro estimado** | frontend | `totalRevenue − totalExpenses` | 🔴 **ignora COGS e taxas** → 3ª definição de lucro (Falha #2) |
| Estoque baixo / crítico | `useProducts` | `count(stock ≤ minStock)` / `≤ criticalStock` | ✅ |

`AnalyticsDashboard` (Pro) reusa `useFinancialSummary`/`useSalesByPaymentMethod`/`useTopProducts` —
portanto **herda as Falhas #1 e #3** nos seus gráficos.

### 4.5 CustomerDetail — `GetCrmStatsAsync`

**Endpoint:** `GET /customers/{id}/stats` · **Entidades:** `Sale` + `SaleItem` (+`Product.Category`),
`Appointment` + `AppointmentServiceItem`, `Service.Category`.

| Stat | Campos | Cálculo | Veredito |
|---|---|---|---|
| Total gasto | `Sale.Total` (Active) | `Σ Total` | ⚠️ só vendas; ignora atendimentos (Falha #7) |
| Compras realizadas | `Sale` (Active) | `COUNT` | ✅ |
| Ticket médio | — | `totalSpent / totalSales` | ✅ |
| Última compra | `Sale.CreatedAt` | `MAX` (1ª da lista ordenada desc) | ✅ |
| Forma preferida | `Sale.PaymentMethod` | moda por contagem | ⚠️ empate → arbitrário |
| Top produtos comprados | `SaleItem.ProductName, Quantity, Subtotal` | `Σ Qty`, `Σ Subtotal`; top 10 por Qty | 🔴 **inclui serviços** (sem filtro `ProductId`) e usa Subtotal pré-desconto (Falha #5) |
| Categorias de produto | `SaleItem` (`ProductId≠null`) → `Product.Category` | `Σ Subtotal` por categoria | ⚠️ pré-desconto (base ≠ "Total gasto") |
| Linha do tempo de gastos | `Sale.Total` por mês | série contínua 12m, nunca antes da 1ª compra | ✅ (rótulo "12 meses" fixo mesmo com menos) |
| Categorias de serviço | `AppointmentServiceItem.Price` (status ≠ Cancelado) | `Σ Price` por categoria | 🔴 **conta agendamentos futuros** (Pendente/Confirmado) como gasto (Falha #6) |
| Atendimentos (Total/Concluído/Cancelado) | `Appointment.Status` | contagens | ✅ (`InProgress` no DTO não é exibido) |
| Próximo agendamento | `Appointment.Start > now & ≠ Cancelado` | menor `Start` | ✅ |
| Top serviços | `AppointmentServiceItem.ServiceName` | `COUNT`; top 5 | ⚠️ conta **todos** os status (inclui cancelados) — filtro diferente das categorias de serviço |

### 4.6 EmployeeDetail — `GetPerformanceStatsAsync`

**Endpoint:** `GET /employees/{id}/stats` · **Atribuição:** `Sale.OperatorId == Employee.UserId`
(vendas operadas no caixa) e `Appointment.EmployeeId == id`.

| Stat | Campos | Cálculo | Veredito |
|---|---|---|---|
| Vendas no mês | `Sale.Total` (Active, mês corrente UTC) | `Σ Total` | ✅ pós-desconto |
| Ticket médio no mês | frontend | `salesThisMonth / salesCountThisMonth` | ✅ |
| Agendamentos no mês | `Appointment.Start` no mês | `COUNT` (todos os status) | ⚠️ inclui futuros/cancelados do mês |
| Taxa de cancelamento (mês/total) | `Appointment.Status` | `cancelled / total × 100` (frontend) | ✅ |
| Salário × Receita | `Employee.Salary`, `salesThisMonth` | `net = receita − salário` | ✅ (rótulo claro de "custo × receita", não lucro) |
| Vendas no caixa (série) | `dailySales[]` | bucketizado no frontend (`analytics.ts`) | ⚠️ eixo local × data UTC (Falha #9) |
| Agendamentos por status (série) | `dailyAppointments[]` | idem | ⚠️ idem |

`dailySales`/`dailyAppointments` vêm **esparsos** (só dias com atividade) numa janela de 365 dias e o
frontend agrega por granularidade — desenho eficiente e correto, exceto pela borda de fuso.

---

## 5. Falhas priorizadas

### 🔴 Alta

**#1 — Desconto de venda ignorado no lucro.**
`GetFinancialSummaryAsync`, `ExportBillingCsvAsync` e `ExportBillingForTenantAsync` calculam
`GrossProfit = ProfitRevenue − Cost` com `ProfitRevenue` **pré-desconto**. O `Sale.Discount` não
entra em lugar nenhum do lucro. → Lucro/`netResult`/lucro acumulado/margem **superestimados pelo
valor do desconto**. Afeta também o `AnalyticsDashboard` (Pro).
**Correção:** ratear o desconto sobre os itens contáveis (a fórmula já existe em `GetTopProductsAsync`),
ou, quando todos os itens têm custo, usar `GrossProfit = Total − Cost`. Definir num único helper (seção 6).

**#2 — Três definições de "lucro" divergentes.**
- Dashboard "Lucro estimado" = `Receita − Despesas` (sem COGS, sem taxas).
- Reports "Resultado líquido" = `(ProfitRevenue − Cost) − Fees − Expenses`.
- KPI "Margem" = razão do item anterior.
Um mesmo tenant vê 3 lucros diferentes para o mesmo período. **Correção:** uma definição canônica de
lucro (bruto e líquido), reusada em todas as telas.

**#3 — Base de receita inconsistente entre gráficos.**
`RevenueByTypeDonut` usa `Σ SaleItem.Subtotal` (**pré-desconto**); todos os outros usam `Σ Sale.Total`
(**pós-desconto**). Com descontos, o donut soma mais que o KPI "Receita total".
**Correção:** padronizar em pós-desconto (ratear desconto por item de serviço/produto), ou rotular
explicitamente como "receita bruta".

**#4 — Margem de lucro em bases mistas.**
Numerador `netResult` deriva de `ProfitRevenue` (pré-desconto, exclui produtos sem custo); denominador
`revenue` = `Sale.Total` (pós-desconto, inclui tudo). Dois erros de sinal opostos (produto sem custo
subestima; desconto superestima) → o resultado pode enganar em qualquer direção.
**Correção:** numerador e denominador na mesma base, após corrigir #1.

### 🟡 Média

**#5 — "Top produtos comprados" do cliente inclui serviços** e usa Subtotal pré-desconto. O card diz
"produtos" mas agrupa **todos** os `SaleItem` por nome (sem `ProductId != null`, ao contrário de
"Categorias de produto"). **Correção:** filtrar `ProductId != null` e alinhar a base de valor.

**#6 — "Categorias de serviço" do cliente conta agendamentos futuros.** O filtro é `Status ≠ Cancelado`,
que inclui Pendente/Confirmado/EmAtendimento — ou seja, atendimentos **ainda não realizados** entram
como "gasto". **Correção:** restringir a `Status == Concluido` para representar gasto consumido.

**#7 — "Total gasto" do cliente ignora atendimentos.** Só soma `Sale.Total`. Se serviços são cobrados
via `Appointment` sem virar `Sale`, o valor real do cliente é subestimado (e conflita com os cards de
categoria de serviço, que mostram gasto em serviços). **Correção:** decidir o modelo (atendimento vira
venda no checkout?) e refletir de forma coerente entre KPI e gráficos.

**#8 — Período anterior do RevenueLineChart desalinhado.** Os rótulos do eixo X são do período atual; a
série anterior é sobreposta por índice. Em `week`/`month` os dois períodos podem ter contagem de
buckets diferente → o ponto "anterior" não corresponde à data do rótulo. **Correção:** alinhar por
deslocamento de bucket, não por índice posicional.

**#9 — Fuso horário UTC sistêmico.** `CreatedAt`/`DueDate` são UTC; "hoje", "este mês" e os buckets
diários usam UTC no backend, mas `analytics.ts` ancora o eixo em `dayjs()` **local**. Para tenant
BR (UTC−3), vendas entre ~21h e meia-noite caem no dia/mês seguinte, e a série do funcionário mistura
data UTC (backend) com "hoje" local (frontend). **Correção:** introduzir timezone do tenant e converter
na borda (uma vez), aplicando em toda a aplicação.

### ⚪ Baixa / limpeza

**#10 — `customers/new-vs-returning` é código morto.** O endpoint, `reportService.getCustomerNewVsReturning`
e `useCustomerNewVsReturning` existem, mas **nenhum componente os consome**. Pior: `useCustomerNewVsReturning`
é **importado sem uso** em `pages/Reports/index.tsx` — e como `noUnusedLocals: true` está ativo
(`tsconfig.app.json`), isso é erro de build. **Correção:** remover a cadeia inteira ou plugar o gráfico.

**#11 — `cancelledCount` nunca exibido.** Calculado e trafegado em `SalesMetricsResponse`, sem card na
UI. **Correção:** exibir (bom sinal de saúde operacional) ou remover do payload.

**#12 — Redundâncias.** Em `GetCrmStatsAsync`, a query já filtra `Status == Active` e depois refaz
`activeSales = sales.Where(Active)`; `CustomerAppointmentCountsDto.InProgress` é calculado e não exibido.

**#13 — Agrupamento por nome, não por Id.** `TopProductsChart`, "Top produtos comprados" e "Categorias"
agrupam por `ProductName`/`ServiceName`. Produtos homônimos se fundem; produto renomeado se divide
entre snapshots. **Correção:** agrupar por `ProductId`/`ServiceId` e usar o nome mais recente como rótulo.

**#14 — Competência inclui despesas não pagas.** `Expense` entra por `DueDate`, não `PaidAt` — regime
de competência (intencional e consistente com `ExpenseService`), mas surpreende quem espera caixa.
**Correção:** documentar no tooltip, ou oferecer alternância competência × caixa.

---

## 6. Análise de arquitetura e propostas de centralização

### 6.1 Diagnóstico

**O que está bom:**
- Separação de camadas limpa (controller fino → service → EF), coerente com o CLAUDE.md.
- Padrão React Query consistente (`enabled` gateando por módulo/permissão em todos os hooks).
- Bucketização de datas no backend (`BucketKey`/`EnumerateBuckets`) é sólida e reutilizável.
- Segurança multi-tenant correta (filtros globais; `IgnoreQueryFilters` só nos exports de exclusão,
  com comentário).

**O que dói para manutenção:** a **matemática financeira está espalhada e duplicada**:

| Regra | Onde vive hoje |
|---|---|
| Lucro (ProfitRevenue/Cost/GrossProfit/NetResult) | `GetFinancialSummaryAsync`, `ExportBillingCsvAsync`, `ExportBillingForTenantAsync` — **3 cópias** |
| Ratear desconto por item | `GetTopProductsAsync` (só aqui) |
| Base de receita (Total vs Subtotal) | escolhida caso a caso em cada endpoint |
| Margem, lucro acumulado, ticket | recomputados no **frontend** (`Reports/index.tsx`, `AccumulatedProfitChart`, `EmployeeDetail`) |
| Lucro estimado | fórmula própria no **Dashboard** |
| Bucketização | backend (relatórios) **e** frontend (`analytics.ts` do funcionário) |

Foi essa dispersão que produziu as Falhas #1–#4: cada lugar reimplementou "lucro" à sua maneira.

### 6.2 Propostas (ordenadas por custo/benefício)

1. **Um único módulo de cálculo financeiro no domínio.**
   Criar `PDV.Domain` (ou `PDV.Application`) `FinancialMath` / `SaleProfitCalculator` com a definição
   **canônica**: dado um `Sale`, retorna `(RevenueLíquida, CustoContável, LucroBruto, Taxas)` com o
   **desconto rateado** sobre os itens contáveis. `GetFinancialSummaryAsync`, os dois `ExportBilling*`
   e o Dashboard passam a chamar esse método. Elimina as 3 cópias e as Falhas #1–#3 de uma vez.

2. **Padronizar a base de receita** em pós-desconto (com desconto rateado por item onde há split por
   tipo/produto). Se "receita bruta" for desejada em algum gráfico, expor como campo separado e
   rotulado — nunca implícito.

3. **Definir "lucro" uma vez** (bruto e líquido) e reusar no Dashboard e nos Relatórios. Escolher se o
   "lucro estimado" do Dashboard deve incluir COGS/taxas (recomendo que sim, para bater com Relatórios)
   ou renomeá-lo para algo honesto ("Receita − Despesas").

4. **Mover cálculos derivados do frontend para o backend** (ou um util único compartilhado):
   `netResult`, margem, lucro acumulado e ticket deveriam vir prontos e idênticos em toda tela. O
   frontend fica só com apresentação. Reduz a chance de duas telas divergirem.

5. **Resolver o fuso de uma vez** (Falha #9): timezone por tenant, convertido na borda de entrada das
   queries e no rótulo dos buckets. Impacta Relatórios, Dashboard, Customer e Employee juntos.

6. **Podar código morto** (Falha #10) e decidir o destino de `cancelledCount`/`new-vs-returning`.

7. **Agrupar por Id, não por nome** (Falha #13) em produtos e serviços.

8. **Testes de regressão de números.** Com a matemática centralizada, cobrir com testes de unidade os
   casos que hoje quebram: venda com desconto, produto sem custo, serviço no caixa, agendamento futuro.
   São exatamente as bordas que geraram as falhas acima.

---

## 7. Checklist pré-produção

- [ ] **#1** Ratear/subtrair o desconto no `GrossProfit`/`NetResult` (financial-summary + billing CSV + tenant export).
- [ ] **#2** Unificar a definição de lucro entre Dashboard e Relatórios.
- [ ] **#3** Padronizar base de receita do `RevenueByTypeDonut` (pós-desconto) ou rotular como bruta.
- [ ] **#4** Corrigir a margem para numerador/denominador na mesma base.
- [ ] **#5** Filtrar `ProductId != null` em "Top produtos comprados" do cliente.
- [ ] **#6** Restringir "Categorias de serviço" a agendamentos `Concluido`.
- [ ] **#7** Alinhar "Total gasto" do cliente ao modelo de atendimentos.
- [ ] **#8** Alinhar período anterior do RevenueLineChart por bucket.
- [ ] **#9** Introduzir timezone do tenant (sistêmico).
- [ ] **#10** Remover a cadeia `new-vs-returning` (ou plugar o gráfico) — corrige o erro de `noUnusedLocals`.
- [ ] **#11–#14** Limpezas (cancelledCount, redundâncias, agrupamento por Id, tooltip de competência).
- [ ] Extrair `FinancialMath` e cobrir com testes de regressão as bordas (desconto, sem custo, serviço no caixa, agendamento futuro).

---

### Apêndice — arquivos-chave

| Camada | Arquivo |
|---|---|
| Backend — relatórios | `backend/PDV.Infrastructure/Services/ReportService.cs` |
| Backend — CRM cliente | `backend/PDV.Infrastructure/Services/CustomerService.cs` (`GetCrmStatsAsync`) |
| Backend — desempenho funcionário | `backend/PDV.Infrastructure/Services/EmployeeService.cs` (`GetPerformanceStatsAsync`) |
| Backend — montagem da venda | `backend/PDV.Infrastructure/Services/SaleService.cs` (linhas ~129–187) |
| Frontend — Relatórios | `frontend/src/pages/Reports/index.tsx` + `components/` |
| Frontend — Dashboard | `frontend/src/pages/Dashboard/index.tsx` + `components/AnalyticsDashboard/` |
| Frontend — Cliente | `frontend/src/pages/Customers/CustomerDetail/` |
| Frontend — Funcionário | `frontend/src/pages/Employees/EmployeeDetail/` (`components/analytics.ts`) |
| Frontend — hooks/services | `frontend/src/hooks/useReports.ts`, `frontend/src/services/report.service.ts` |
