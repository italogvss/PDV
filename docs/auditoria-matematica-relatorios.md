# Auditoria de Matemática — Relatórios & Estatísticas

> **Quarta revisão — 2026-07-08.** Substitui a terceira revisão (2026-07-07) como fonte de verdade.
> A pedido, esta revisão é **enxuta**: contém apenas quatro tópicos — Sumário, Arquitetura do
> módulo, Catálogo completo de gráficos e Falhas/bugs. Foram propositalmente removidas as seções
> de rastreabilidade de falhas fechadas, propostas de arquitetura, checklist e histórico das
> revisões anteriores.
>
> **Atualização 2026-07-08 (correções aplicadas):** desta rodada, **9 das 10 falhas foram
> corrigidas no código** (só o fuso UTC ficou de fora, por decisão de escopo). Cada item em §4
> traz o status `✅ corrigido` / `⏸ não corrigido` e o que foi feito; os vereditos do catálogo (§3)
> já refletem o comportamento novo. A base oficial de receita de agendamento passou a ser
> `Σ AppointmentServiceItem.Price`, e há uma nova configuração em **Configurações › Operação ›
> Agendamentos** controlando o valor personalizado (padrão desligado).
>
> Cobre as quatro superfícies analíticas do produto: **página de Relatórios** ("Lucros &
> relatórios"), **Dashboard**, **Detalhe do Cliente** (`CustomerDetail`) e **Detalhe do
> Funcionário** (`EmployeeDetail`). Reverificado linha a linha contra o código atual.
>
> **Mudança estrutural desde a 3ª revisão:** as seções **Agendamentos** e **Clientes** da página
> de Relatórios — que eram *placeholders* vazios — foram **totalmente implementadas** (7 gráficos
> de agendamento + ranking de clientes + rankings/listas de funcionário/cliente). Toda a matemática
> nova foi auditada aqui pela primeira vez.

---

## 1. Sumário

A matemática de lucro continua **centralizada** em `PDV.Application/Helpers/SaleFinancials.cs`
(uma fórmula, seis consumidores, zero cópias divergentes). Nenhuma falha de severidade **Alta**
está aberta. Nesta rodada, **9 das 10 falhas catalogadas foram corrigidas**; permanece aberto,
por decisão de escopo, apenas o fuso horário UTC (sistêmico). A nota 📌 fora do escopo matemático
(gate de entitlement em `EmployeesController`) segue em aberto — não estava na lista de correção.

| Severidade | Aberto | Corrigido | Temas |
|---|---|---|---|
| 🔴 Alta | 0 | — | — |
| 🟡 Média | 1 | 4 | ✅ base da margem documentada no KPI; ⏸ **fuso UTC sistêmico (não corrigido)**; ✅ agrupamento por Id; ✅ "Lucro bruto" no Dashboard; ✅ base única de receita de agendamento (`Σ AppointmentServiceItem.Price`) + setting de valor personalizado |
| ⚪ Baixa | 0 | 6 | ✅ `cancelledCount` removido do payload; ✅ toggle competência × caixa; ✅ `GET /reports/stock` removido; ✅ cancelados excluídos de todos os agregados de agendamento; ✅ operador/funcionário agrupam por Id+nome (mantido, aceito); ✅ listas de funcionário/cliente agora vêm de endpoints de Relatórios |
| 📌 Fora do escopo matemático | 1 | — | `EmployeesController.GetStats` não aplica o gate de entitlement Pro que Clientes/Relatórios aplicam |

Catálogo completo: §3. Detalhe das falhas e status de cada correção: §4.

---

## 2. Arquitetura do módulo de relatórios

### 2.1 Cadeia de dados (frontend → banco)

```
┌─ Páginas ────────────────┐   ┌─ Hooks (React Query) ─────┐   ┌─ Services (HTTP+map) ──────┐
│ Reports/index.tsx         │   │ hooks/useReports.ts        │   │ services/report.service.ts  │
│ Dashboard/index.tsx       │──▶│ (useSalesMetrics,          │──▶│ customer.service.ts         │
│ Customers/CustomerDetail  │   │  useFinancialSummary,      │   │ employee.service.ts         │
│ Employees/EmployeeDetail  │   │  useAppointmentSummary…)   │   │ (map backend→frontend)      │
└───────────────────────────┘   └────────────────────────────┘   └──────────────┬──────────────┘
                                                                                 │ api (axios)
                                                                                 ▼
┌─ Controllers (PDV.Api) ────────────────────────────────────────────────────────────────────┐
│ ReportsController         [RequireModule(Reports)] [RequireEntitlement(AdvancedReports)]      │
│                           [RequirePermission(ViewReports)]  ← gate único p/ TODOS os endpoints│
│ CustomersController.GetCrmStats  [RequireEntitlement(InformativeCustomerData)]                │
│ EmployeesController.GetStats     [RequireModule(Employees)] [RequirePermission(ViewEmployees)]│
│                                  ⚠ SEM [RequireEntitlement] — ver §4 (📌)                     │
└──────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                            ▼
┌─ Services (PDV.Infrastructure) ────────────────────────────────────────────────────────────┐
│ ReportService              → toda a página de Relatórios + widgets do Dashboard              │
│ CustomerService.GetCrmStatsAsync    → CustomerDetail                                          │
│ EmployeeService.GetPerformanceStatsAsync → EmployeeDetail                                     │
│        └──── todos usam ────▶  PDV.Application/Helpers/SaleFinancials.cs  (fonte única)        │
└──────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                            ▼
┌─ Entidades EF Core (AppDbContext) ──────────────────────────────────────────────────────────┐
│ Sale · SaleItem · Expense · Appointment · AppointmentServiceItem · Product · Service ·        │
│ Customer · Employee                                                                            │
│  Filtro global: Sale e Expense → só TenantId (sem IsActive); as demais → TenantId && IsActive │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Fonte única da matemática de lucro — `SaleFinancials`

```csharp
// Itens "contáveis" = serviços (custo zero legítimo) OU produtos com PurchasePriceSnapshot.
// countedSubtotal/countedCost somam só esses itens; itemsTotal soma TODOS os itens da venda.
countedRevenue = itemsTotal > 0
    ? countedSubtotal − discount × (countedSubtotal / itemsTotal)   // desconto rateado pelo peso
    : countedSubtotal
grossProfit    = countedRevenue − countedCost
Compute(...)  → (Revenue: Sale.Total inteiro, Cost: countedCost, Fees: FeeAmount, GrossProfit)

NetItemRevenue(itemSubtotal, saleDiscount, saleItemsTotal)          // receita de UM item,
    = itemSubtotal − saleDiscount × (itemSubtotal / saleItemsTotal) // desconto rateado por item
```

Duas decisões de design válidas em toda a aplicação:
- `Revenue` devolvido é `Sale.Total` **inteiro** (todos os itens, pós-desconto) — mesma base do KPI
  "Receita total". Já `GrossProfit` usa só a fatia dos itens **contáveis**. É intencional (receita
  nunca esconde uma venda; lucro só onde há custo conhecido) e é a origem da Falha de base mista (§4).
- `NetItemRevenue` rateia o desconto proporcionalmente ao peso do item sobre **todos** os itens da
  venda — somar os itens sempre fecha com `Sale.Total`. É a fórmula dos rankings.

**Consumidores de `SaleFinancials`:** `GetFinancialSummaryAsync`, `GetTopProductsAsync`,
`GetRevenueByTypeAsync`, `ExportBillingCsvAsync`, `ExportBillingForTenantAsync` e
`CustomerService.GetCrmStatsAsync`.

### 2.3 Igualdades fundamentais da venda (`SaleService.CreateAsync`)

```
SaleItem.Subtotal = UnitPrice × Quantity           ← POR ITEM, PRÉ-DESCONTO
itemsTotal        = Σ SaleItem.Subtotal
Sale.Discount     = clamp(request.Discount, 0, itemsTotal)   ← desconto no NÍVEL DA VENDA
Sale.Total        = itemsTotal − Discount            ← PÓS-DESCONTO
Sale.FeeAmount    = round(Total × FeeRate/100)       ← taxa sobre o Total pós-desconto
Sale.NetAmount    = Total − FeeAmount
```

O desconto vive **só** em `Sale.Discount` (nunca por item). `ProductName`/`ServiceName`/
`OperatorName`/`CustomerName`/`EmployeeName` gravados nas vendas/agendamentos são **snapshots** do
momento — agrupar por eles (em vez do Id) fragmenta o histórico se o nome mudar (§4).

### 2.4 Receita de agendamento — base única (✅ corrigido)

`AppointmentService` grava **dois** valores:
- **`AppointmentServiceItem.Price`** = `service.Price` do catálogo, por serviço (snapshot). **É a
  base oficial de receita de agendamento** — usada em **todos** os gráficos da seção Agendamentos
  (`summary`, `by-employee`, `by-category`, `top-services`).
- **`Appointment.Price`** = `request.Price` (valor total da UI). Só é usado como o "valor do
  agendamento" exibido na agenda; **não** alimenta mais nenhum relatório.

Uma configuração nova — **Configurações › Operação › Agendamentos › "Permitir valor personalizado
no agendamento"** (`OperationSettings.AllowCustomAppointmentPrice`, **padrão `false`**) — controla
o campo "Valor" do `NewAppointmentModal`:
- **`false` (padrão):** o campo fica **bloqueado** e sempre igual à soma dos serviços escolhidos →
  `Appointment.Price` == `Σ AppointmentServiceItem.Price`.
- **`true`:** o campo aceita valor digitado à mão (pode divergir da soma). Mesmo assim, os
  relatórios continuam somando `AppointmentServiceItem.Price` — a base oficial não muda.

---

## 3. Catálogo completo de gráficos

Legenda de veredito: ✅ correto · ⚠️ correto com ressalva · 🔴 incorreto/enganoso.
Todos os endpoints abaixo estão sob `GET /api/reports/...` salvo indicação.

### 3.1 Relatórios › seção **Vendas**

| # | Gráfico / KPI | Endpoint | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|---|
| 1 | KPI **Receita total** | `sales` | `Sale.Total, Status, CreatedAt` | `Σ Total WHERE Active` | ✅ pós-desconto |
| 2 | KPI **Total de vendas** | `sales` | `Sale.Status, CreatedAt` | `COUNT WHERE Active` | ✅ |
| 3 | KPI **Ticket médio** | `sales` | idem | `totalRevenue / totalSales` (0 se 0) | ✅ |
| 4 | KPI **Margem de lucro média** | `financial-summary` (agregado no frontend) | `revenue, netResult` por bucket | `(Σ netResult / Σ revenue) × 100` | ✅ base mista agora explicada no tooltip do card (Falha #1) |
| 5 | **SalesCompositionChart** ("Composição do resultado") | `financial-summary` | `FinancialSummaryPoint.{cost,fees,expenses,netResult}` ← `SaleItem.PurchasePriceSnapshot·Qty`, `Sale.FeeAmount`, `Expense.Amount`, desconto rateado | barras empilhadas `cost+fees+expenses+netResult` | ⚠️ altura da barra = `GrossProfit+Cost` = receita **só** dos itens contáveis; ≤ receita real quando há produto sem custo. Documentado no tooltip |
| 6 | **SalesCompositionDonut** ("Composição do período") | `financial-summary` | idem, somado no período | mesma composição, em % | ⚠️ idem, documentado no tooltip |
| 7 | **FinancialBarChart** ("Receita × Lucro líquido") | `financial-summary` | `revenue`, `netResult` | 2 barras por bucket | ⚠️ barras em bases diferentes (uma toda a receita, outra só a margem dos itens com custo) — subtítulo avisa |
| 8 | **AccumulatedProfitChart** ("Lucro acumulado") | `financial-summary` | `netResult` | soma cumulativa no frontend | ✅ herda a base de `netResult` |
| 9 | **RevenueLineChart** ("Receita ao longo do tempo") | `financial-summary` (atual + período anterior) | `revenue` | série atual × anterior, alinhada por posição de bucket, `null` no padding | ✅ |
| 10 | **PaymentMethodPieChart** ("Vendas por forma de pagamento") | `sales/by-payment-method` | `Sale.PaymentMethod, Total` | `Σ Total` por método (Active) | ✅ pós-desconto |
| 11 | **RevenueByTypeDonut** ("Serviços vs Produtos") | `revenue-by-type` | `SaleItem.ServiceId, Subtotal`, `Sale.Discount` | `Σ NetItemRevenue` por `ServiceId null/≠null` | ✅ soma fecha com "Receita total" |
| 12 | **TopProductsChart** ("Top produtos vendidos") | `products/top` | `SaleItem.{ProductId,ProductName,Quantity,Subtotal}` (`ProductId≠null`), `Sale.Discount` | `Σ NetItemRevenue`, `Σ Qty`; **agrupado por `ProductId`**, rótulo = nome mais recente | ✅ desconto rateado + agrupado por Id (Falha #3) |

### 3.2 Relatórios › seção **Funcionário**

| # | Gráfico | Origem | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|---|
| 13 | **EmployeeListGrid** ("Funcionários") | `GET /reports/employees` | `Employee.{UserName, RoleName, Salary, ImageUrl}` (só ativos) | lista ativos, ordenada por nome no backend | ✅ servido pelo módulo de Relatórios (Falha #6) |
| 14 | **OperatorRankingChart** ("Ranking por operador") | `sales/by-operator` | `Sale.{OperatorId, OperatorName, Total, Status}` | `Σ Total` + `COUNT`, agrupado por `{OperatorId, OperatorName}` | ✅ pós-desconto; agrupamento por par Id+nome aceito (Falha #6) |

### 3.3 Relatórios › seção **Agendamentos** (nova)

**Endpoints:** `appointments/summary` (série), `appointments/by-category`, `appointments/top-services`,
`appointments/by-employee`, `appointments/peak-hours`. **Entidades:** `Appointment`,
`AppointmentServiceItem`, `Service.Category`.

| # | Gráfico | Endpoint | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|---|
| 15 | **AppointmentsOverTimeChart** ("Agendamentos ao longo do tempo") | `summary` | `Appointment.{Start, Status}` | por bucket: `total = COUNT não-cancelados`, `completed`, `cancelled` (série própria) | ✅ Total exclui cancelados (Falha #7) |
| 16 | **AppointmentStatusDonut** ("Agendamentos por status") | `summary` | idem | soma `completed+cancelled+inProgress+pending`; `pending = Pendente∪Confirmado` | ✅ cobre os 5 status |
| 17 | **AppointmentRevenueChart** ("Receita de agendamentos") | `summary` | **`Σ AppointmentServiceItem.Price`**, `Status` | barra `revenueRealized = Σ WHERE Concluído`; linha `revenueTotal = Σ WHERE ≠ Cancelado` | ✅ base oficial (serviços) + sem cancelados (Falhas #5, #7) |
| 18 | **ServiceCategoryDonut** ("Categorias de serviço") | `by-category` | **`AppointmentServiceItem.Price`** (só `Concluído`), `Service.Category.{Name,Color}` | `Σ Price` por categoria | ✅ mesma base de #17 |
| 19 | **TopServicesRanking** ("Top serviços") | `top-services` | `AppointmentServiceItem.{ServiceId,ServiceName,Price}`, `Appointment.Status` | agrupa por **`ServiceId`**; `count = não-cancelados`; `revenue = Σ Price WHERE Concluído` | ✅ por Id, mesma base de #17 |
| 20 | **EmployeeAppointmentsRanking** ("Agendamentos por funcionário") | `by-employee` | `Appointment.{EmployeeId,EmployeeName,Status}`, **`Σ AppointmentServiceItem.Price`** | agrupa por `{EmployeeId, EmployeeName}`; `count = não-cancelados`; `revenue = Σ Price WHERE Concluído` | ✅ base oficial (serviços); agrupamento por par aceito (Falhas #5, #6) |
| 21 | **PeakHoursChart** ("Horário de pico") | `peak-hours` | `Appointment.Start.Hour, Status` | `COUNT` por hora (0–23), só não-cancelados | ✅ (fuso UTC — Falha #2) |

### 3.4 Relatórios › seção **Clientes** (nova)

| # | Gráfico | Origem | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|---|
| 22 | **CustomersListPanel** ("Clientes cadastrados") | `GET /reports/customers` | `Customer.{Id, Name}` | lista simples, ordenada por nome | ✅ servido pelo módulo de Relatórios (Falha #6) |
| 23 | **TopCustomersRanking** ("Top clientes por receita") | `customers/top` | `Sale.{CustomerId, Total}`, `Customer.Name` | `Σ Total` + `COUNT`, agrupado por **`CustomerId`** (só `CustomerId≠null`, Active) | ✅ por Id; balcão anônimo fica fora (documentado) |

### 3.5 **Dashboard**

**KPIs do topo** (`Dashboard/index.tsx`):

| # | KPI | Fonte | Cálculo | Veredito |
|---|---|---|---|---|
| 24 | **Faturamento** | `useSalesMetrics` | `totalRevenue` | ✅ |
| 25 | **Estoque baixo / crítico** | `useProducts` | `count(stock ≤ minStock)` / `≤ criticalStock` (atrás de `advancedExpenses`) | ✅ |
| 26 | **Despesas** | `useExpensesByCategory` | `Σ total` no frontend | ⚠️ competência (Falha #14) |
| 27 | **Lucro estimado** | `useFinancialSummary` | `Σ netResult` por bucket | ✅ mesma definição de Relatórios (comentário explícito no código) |

**AnalyticsDashboard** (feature Pro `advancedDashboard`):

| # | Componente | Fonte | Cálculo | Veredito |
|---|---|---|---|---|
| 28 | **RevenueAreaChart** ("Faturamento") | `useFinancialSummary` (N dias, `day`) | série `revenue` + série **"Lucro bruto" = `grossProfit`** | ✅ série renomeada para "Lucro bruto", distinta do KPI "Lucro estimado" (`netResult`) — Falha #4 |
| 29 | **PaymentMethodsDonut** | `useSalesByPaymentMethod` | `Σ Total` por método **habilitado no tenant** | ✅ |
| 30 | **TopProductsRanking** | `useTopProducts` (mês corrente, top 5) | idem `GetTopProductsAsync` | ✅ agora agrupa por Id (Falha #3); nota: ignora o seletor de dias e sempre mostra o mês corrente (comportamento intencional) |
| 31 | **RecentSalesTable** ("Últimas vendas") | `useSales` (client-side) | filtra `createdAt` = "hoje" com `dayjs` local | ⚠️ "hoje" local × `createdAt` UTC (Falha #2) |

| # | Superfície | Fonte | Cálculo | Veredito |
|---|---|---|---|---|
| 32 | **EssentialDashboard** — "Faturamento em <mês>" | `useSales` (client-side) | `Σ Total` de vendas ativas do mês corrente | ✅ matemática independente, não toca `ReportService` |

*(Widgets não-analíticos do Dashboard — `StockAlertsCard`, `PendingBillsCard`, `ActiveTeamCard`,
`EmployeeDashboard` — são listas/atalhos sem cálculo estatístico e ficam fora deste catálogo.)*

### 3.6 **CustomerDetail** — `GET /customers/{id}/stats` (`GetCrmStatsAsync`)

Entitlement `InformativeCustomerData`. Entidades: `Sale`+`SaleItem` (+`Product.Category`),
`Appointment`+`AppointmentServiceItem`, `Service.Category`.

| # | Stat | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|
| 33 | Total gasto | `Sale.Total` (Active) | `Σ Total` | ✅ (serviço é cobrado via `Sale` no caixa → já incluso) |
| 34 | Compras realizadas | `Sale` (Active) | `COUNT` | ✅ |
| 35 | Ticket médio | — | `totalSpent / totalSales` | ✅ |
| 36 | Última compra | `Sale.CreatedAt` | `MAX` (1ª da lista desc) | ✅ |
| 37 | Forma preferida | `Sale.PaymentMethod` | moda por contagem | ⚠️ empate → arbitrário |
| 38 | Top produtos comprados | `SaleItem.{ProductId,ProductName,Quantity,Subtotal}` (`ProductId≠null`), `Sale.Discount` | `Σ Qty`, `Σ NetItemRevenue`; agrupado por **`ProductId`**; top 10 por Qty | ✅ por Id, desconto rateado |
| 39 | Categorias de produto | mesmas linhas, `Product.Category.{Name,Color}` | `Σ NetSpent` por categoria | ✅ pós-desconto |
| 40 | Linha do tempo de gastos | `Sale.Total, CreatedAt` | `Σ Total` por mês (12m, nunca antes da 1ª compra) | ✅ |
| 41 | Categorias de serviço | `AppointmentServiceItem.Price` (só `Concluído`), `Service.Category` | `Σ Price` por categoria | ✅ só consumo real |
| 42 | Atendimentos (Total/Concluído/Cancelado/EmAtend.) | `Appointment.Status` | contagens | ⚠️ `InProgress` calculado mas a UI só mostra Total/Concluídos/Cancelados |
| 43 | Próximo agendamento | `Appointment.{Start,Status}` | menor `Start > now & ≠ Cancelado` | ✅ |
| 44 | Top serviços | `AppointmentServiceItem.{ServiceId,ServiceName}`, `Appointment.Status` | `COUNT` agrupado por **`ServiceId`** (rótulo = nome mais recente), só não-cancelados; top 5 | ✅ por Id e sem cancelados (Falhas #3, #7) |
| 45 | Vendas recentes | `Sale.{Id,Items,PaymentMethod,Total,CreatedAt}` | 10 últimas | ✅ (lista) |

### 3.7 **EmployeeDetail** — `GET /employees/{id}/stats` (`GetPerformanceStatsAsync`)

Atribuição: `Sale.OperatorId == Employee.UserId`; `Appointment.EmployeeId == id`.

| # | Stat | Entidade · propriedades | Cálculo | Veredito |
|---|---|---|---|---|
| 46 | Vendas no mês | `Sale.{Total,CreatedAt,OperatorId,Status}` (Active, mês corrente UTC) | `Σ Total` | ✅ pós-desconto |
| 47 | Ticket médio no mês | frontend | `salesThisMonth / salesCountThisMonth` | ✅ |
| 48 | Agendamentos no mês | `Appointment.{Start,EmployeeId}` no mês | `COUNT` (todos os status) | ⚠️ inclui futuros/cancelados |
| 49 | Taxa de cancelamento | `EmployeeCancellationDto(monthCancelled, monthTotal, totalCancelled, total)` | `cancelled/total × 100`, toggle Mês↔Total | ✅ "Total" é `COUNT` histórico (sem janela) |
| 50 | Salário × Receita | `Employee.Salary`, `salesThisMonth` | `net = receita − salário` | ✅ rótulo avisa "não considera comissões/outros custos" |
| 51 | Vendas no caixa (série) | `dailySales[]` (365d esparso) | bucketizado no frontend (`analytics.ts`, 7d/30d diário · 3m semanal · 6m/12m mensal) | ⚠️ eixo ancorado em "hoje" **local**; datas UTC (Falha #2) |
| 52 | Agendamentos por status (série) | `dailyAppointments[]` | idem | ⚠️ idem |

---

## 4. Falhas e bugs encontrados

Status por item: **✅ corrigido** nesta rodada · **⏸ não corrigido** (decisão de escopo).

### 🟡 Média

**#1 — Margem/composição em base mista (residual, by design). ✅ corrigido (documentação).**
`GrossProfit`/`NetResult` contam receita e custo **só** dos itens contáveis (serviços + produtos com
custo cadastrado); produtos sem custo entram em `Revenue` (KPI "Receita total") mas não no
`GrossProfit`. Intencional (não fingir margem 100% em produto sem custo), mas faz a "Margem de lucro
média" e a composição **subestimarem** a margem quanto mais produtos sem custo o tenant tiver.
**Aplicado:** o KPI "Margem de lucro média" (§3.1 #4) agora passa a prop `tooltip` do `PageKpiCard`
com o texto que explica a base mista — o comportamento (by design) não mudou, só ficou explícito.

**#2 — Fuso horário UTC sistêmico. ⏸ não corrigido (por decisão).**
`Sale.CreatedAt`, `Expense.DueDate`, `Appointment.Start` e os buckets diários usam UTC no backend
sem conversão. O frontend usa `dayjs()` **local** em ao menos três pontos: `EmployeeDetail/
analytics.ts` (eixo), o filtro "vendas de hoje" do `AnalyticsDashboard` e `RecentSalesTable`. Para
tenant BR (UTC−3), vendas/agendamentos perto da meia-noite podem cair no dia/bucket vizinho.
**Sistêmico** (toca todo o app) — pede solução única (timezone do tenant, convertido na borda).
Mantido em aberto de propósito, para um PR próprio.

**#3 — Agrupamento por nome, não por Id. ✅ corrigido.**
`ReportService.GetTopProductsAsync` (alimenta o #12 de Relatórios e o #30 do Dashboard) e o "Top
serviços" do cliente (`CustomerService.GetCrmStatsAsync`, §3.6 #44) passaram a **agrupar por
`ProductId`/`ServiceId`** e rotular com o nome mais recente. Produtos/serviços homônimos não se
fundem mais; item renomeado não fragmenta o histórico. Junta-se aos que já estavam por Id
(`GetTopServicesAsync`, `GetTopCustomersAsync`, "Top produtos comprados" do cliente).

**#4 — "Lucro" do Dashboard analítico ≠ KPI "Lucro estimado". ✅ corrigido.**
A série do `RevenueAreaChart` (#28) — `Σ grossProfit`, sem taxas nem despesas — foi **renomeada de
"Lucro" para "Lucro bruto"**, distinguindo-a do KPI "Lucro estimado" (`Σ netResult`) na mesma tela.
O tooltip do gráfico também aponta o KPI para o lucro líquido. Cálculo inalterado, só o rótulo.

**#5 — Receita de agendamentos em base única. ✅ corrigido.**
A **base oficial** de receita de agendamento passou a ser `Σ AppointmentServiceItem.Price` (preços
dos serviços do catálogo) em **todos** os gráficos da seção — `AppointmentRevenueChart` (#17) e
`EmployeeAppointmentsRanking` (#20) deixaram de usar `Appointment.Price`. Agora #17 fecha com a soma
das fatias de #18. Além disso, criou-se a configuração **Operação › Agendamentos › "Permitir valor
personalizado no agendamento"** (`AllowCustomAppointmentPrice`, padrão `false`): desligada, o campo
"Valor" do `NewAppointmentModal` fica bloqueado e igual à soma dos serviços; ligada, aceita valor à
mão (mas os relatórios continuam usando a soma dos serviços). Ver §2.4.

### ⚪ Baixa

**#6 — Snapshot de nome / dependência de módulo em Relatórios. ✅ corrigido.**
(a) O agrupamento por par `{Id, Nome-snapshot}` em `GetSalesByOperatorAsync` (#14) e
`GetAppointmentsByEmployeeAsync` (#20) foi **mantido de propósito** (aceito): como o Id está na
chave, não fragmenta, e o par é inofensivo. (b) `EmployeeListGrid` (#13) e `CustomersListPanel` (#22)
agora consomem **novos endpoints de Relatórios** (`GET /reports/employees` e `GET /reports/customers`),
gateados pelo mesmo entitlement da página — não dependem mais dos módulos Employees/Customers.

**#7 — Tratamento de cancelados inconsistente nos gráficos de agendamento. ✅ corrigido.**
Cancelados foram **excluídos de todos os agregados de demanda/receita**: em
`GetAppointmentSummaryAsync`, a série "Total" (#15) e a "Receita agendada" (#17) agora contam só
não-cancelados; o "Top serviços" do cliente (#44) idem. As séries que existem **para medir
cancelamento** (linha/fatia de "Cancelados") seguem contando cancelados — é o propósito delas.

**#8 — `cancelledCount` removido do payload. ✅ corrigido.**
Removido de `SalesMetricsResponse` (backend), de `GetSalesMetricsAsync` (que agora só carrega vendas
ativas) e dos tipos/serviço do frontend. Nenhuma UI o exibia.

**#9 — Alternância competência × caixa para despesas. ✅ corrigido.**
`GetFinancialSummaryAsync` recebeu o parâmetro `expenseBasis` (`accrual` = por `DueDate`, padrão;
`cash` = só despesas pagas, por `PaidAt`). A página de Relatórios ganhou um toggle **"Despesas por:
Competência | Caixa"** na seção Vendas, que realimenta os gráficos de composição/lucro. O Dashboard
segue em competência (padrão).

**#10 — `GET /reports/stock` (JSON) removido. ✅ corrigido.**
`GetStockSnapshotAsync`, o endpoint `GET /reports/stock`, o DTO `StockSnapshotResponse` e o método da
interface foram removidos. O export CSV irmão (`/reports/stock/export`), que é usado, permanece.

### 📌 Fora do escopo matemático (em aberto)

**Gate de plano ausente em `EmployeesController.GetStats`.**
As estatísticas de cliente e o módulo de relatórios são Pro e **reforçados no backend**
(`ReportsController` tem `[RequireEntitlement(AdvancedReports)]`; `CustomersController.GetCrmStats`
tem `[RequireEntitlement(InformativeCustomerData)]`). Já `EmployeesController.GetStats`
(`GET /employees/{id}/stats`) tem só `[RequireModule(Employees)]` + `[RequirePermission(ViewEmployees)]`
— **não** tem `[RequireEntitlement(AdvancedEmployee)]`, apesar de o frontend usar
`FEATURES.advancedEmployee` para decidir se mostra os cards. Um tenant no plano Essencial pode
chamar a rota direto e receber o payload completo de performance que a UI esconde atrás do paywall.
**Correção:** adicionar `[RequireEntitlement(EntitlementCatalog.AdvancedEmployee)]` em `GetStats`,
no mesmo padrão dos outros dois controllers.

---

## Apêndice — arquivos-chave

| Camada | Arquivo |
|---|---|
| Backend — matemática de lucro | `backend/PDV.Application/Helpers/SaleFinancials.cs` |
| Backend — relatórios (inclui agendamentos) | `backend/PDV.Infrastructure/Services/ReportService.cs` |
| Backend — controller de relatórios | `backend/PDV.Api/Controllers/ReportsController.cs` |
| Backend — CRM cliente | `backend/PDV.Infrastructure/Services/CustomerService.cs` (`GetCrmStatsAsync`) |
| Backend — desempenho funcionário | `backend/PDV.Infrastructure/Services/EmployeeService.cs` (`GetPerformanceStatsAsync`) |
| Backend — controller de funcionários | `backend/PDV.Api/Controllers/EmployeesController.cs` |
| Backend — preço do agendamento | `backend/PDV.Infrastructure/Services/AppointmentService.cs`; setting `AllowCustomAppointmentPrice` em `TenantSettings` / `TenantService` |
| Frontend — setting de agendamento | `frontend/src/pages/Settings/components/OperationSection/index.tsx`; `NewAppointmentModal` |
| Frontend — Relatórios | `frontend/src/pages/Reports/index.tsx` + `components/` |
| Frontend — Dashboard | `frontend/src/pages/Dashboard/index.tsx` + `components/{AnalyticsDashboard,EssentialDashboard}/` |
| Frontend — Cliente | `frontend/src/pages/Customers/CustomerDetail/` |
| Frontend — Funcionário | `frontend/src/pages/Employees/EmployeeDetail/` (`components/analytics.ts`) |
| Frontend — hooks/tipos | `frontend/src/hooks/useReports.ts`, `frontend/src/types/report.types.ts` |
</content>
</invoke>
