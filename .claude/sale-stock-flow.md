# Fluxo de Estoque, Venda e Histórico — PDV-Ultra

Este documento explica **como o estoque, as vendas e o histórico funcionam de ponta a ponta**, desde a seleção de produtos no PDV até o cancelamento de uma venda com devolução ao estoque. Use-o ao trabalhar com qualquer parte desse módulo.

---

## Visão Geral

```
[PDV — Página de Vendas]
  Usuário monta carrinho →
  Seleciona pagamento    →
  POST /api/sales         ──────────────────────────────────────────────┐
                                                                         │
                                                              SaleService.CreateAsync()
                                                              ├── Valida produtos (ativo + estoque suficiente)
                                                              ├── Decrementa product.Stock
                                                              ├── Cria SaleItems (snapshots de preço)
                                                              ├── Cria Sale (Status="Active")
                                                              └── Retorna SaleDetailResponse
                                                                         │
[PDV]  ◀── SaleDetailResponse ───────────────────────────────────────────┘
  Limpa carrinho
  Invalida cache de produtos (estoque mudou)


[Histórico — SalesHistory]
  GET /api/sales          ──────────────────────────────────────────────┐
                                                              Lista paginada de vendas
                                                              (SaleResponse[])
[Histórico]  ◀── SaleResponse[] ─────────────────────────────────────────┘
  Usuário clica em cancelar →
  DELETE /api/sales/{id}  ──────────────────────────────────────────────┐
                                                              SaleService.CancelAsync()
                                                              ├── Valida: Status != Cancelled
                                                              ├── Restaura product.Stock por item
                                                              └── Status="Cancelled", registra quem cancelou
[Histórico]  ◀── 204 No Content ─────────────────────────────────────────┘
  Invalida cache de vendas + produtos
```

---

## 1. Entidades do Domínio

### Product — `backend/PDV.Domain/Entities/Product.cs`

| Atributo | Tipo | Descrição |
|---|---|---|
| `Id` | `Guid` | PK |
| `TenantId` | `Guid` | Isolamento multi-tenant |
| `Name` | `string` (max 200) | Nome do produto |
| `Barcode` | `string?` (max 50) | Código de barras — único por tenant |
| `NCM` | `string?` (max 10) | Código NCM fiscal |
| `Price` | `decimal(10,2)` | Preço de venda |
| `PurchasePrice` | `decimal(10,2)?` | Preço de custo (nullable) |
| `Stock` | `int` | Quantidade em estoque atual |
| `MinStock` | `int?` | Gatilho de "estoque baixo" |
| `MinCriticalStock` | `int?` | Gatilho de "estoque crítico" |
| `CategoryId` | `Guid?` | FK para `ProductCategory` |
| `IsActive` | `bool` | Soft delete (false = excluído) |
| `CreatedAt` / `UpdatedAt` | `DateTime` | Timestamps UTC |

**Regra:** `Stock` nunca vai abaixo de 0. A validação ocorre no `SaleService` antes de qualquer escrita.

---

### Sale — `backend/PDV.Domain/Entities/Sale.cs`

| Atributo | Tipo | Descrição |
|---|---|---|
| `Id` | `Guid` | PK |
| `TenantId` | `Guid` | Isolamento multi-tenant |
| `OperatorId` | `Guid` | FK → `User` (quem fez a venda) |
| `Operator` | `User` | Navigation property |
| `CustomerName` | `string?` (max 200) | Nome do cliente (snapshot) |
| `CustomerDocument` | `string?` | CPF do cliente anônimo |
| `PaymentMethod` | `string` (max 50) | `"Cash"` \| `"PIX"` \| `"Credit Card"` \| `"Debit Card"` |
| `IsInstallment` | `bool` | Se é parcelado |
| `InstallmentCount` | `int?` | Número de parcelas (só se parcelado) |
| `InstallmentValue` | `decimal(10,2)?` | Valor por parcela = Total / InstallmentCount |
| `Total` | `decimal(10,2)` | Soma dos subtotais dos itens |
| `AmountPaid` | `decimal(10,2)` | Valor entregue pelo cliente |
| `Status` | `SaleStatus` enum | `Active` ou `Cancelled` (salvo como string no banco) |
| `CancelledById` | `Guid?` | FK → `User` (quem cancelou) |
| `CancelledBy` | `User?` | Navigation property |
| `CancelledAt` | `DateTime?` | Timestamp do cancelamento |
| `Items` | `ICollection<SaleItem>` | Navigation property |
| `CreatedAt` / `UpdatedAt` | `DateTime` | Timestamps UTC |

**Troco:** calculado no momento da resposta como `AmountPaid - Total`. Não é armazenado.

---

### SaleItem — `backend/PDV.Domain/Entities/SaleItem.cs`

| Atributo | Tipo | Descrição |
|---|---|---|
| `Id` | `Guid` | PK |
| `SaleId` | `Guid` | FK → `Sale` (cascade delete) |
| `ProductId` | `Guid?` | FK → `Product` (ON DELETE SET NULL) |
| `ProductName` | `string` (max 200) | **Snapshot** do nome no momento da venda |
| `UnitPrice` | `decimal(10,2)` | **Snapshot** do preço de venda |
| `PurchasePriceSnapshot` | `decimal(10,2)?` | **Snapshot** do preço de custo |
| `Quantity` | `int` | Quantidade vendida |
| `Subtotal` | `decimal(10,2)` | `UnitPrice * Quantity` |

**Por que snapshots?** Se o produto for excluído ou tiver o preço alterado depois da venda, o histórico ainda mostra os valores corretos. `ProductId` pode se tornar `null` se o produto for excluído — mas `ProductName` nunca é perdido.

---

## 2. DTOs (Request / Response)

### CreateSaleRequest — `backend/PDV.Application/DTOs/Sales/`

```csharp
record CreateSaleRequest(
    Guid?   CustomerId,           // Cliente cadastrado OU
    string? CustomerDocument,     // CPF avulso (não ambos)
    string  PaymentMethod,        // "Cash" | "PIX" | "Credit Card" | "Debit Card"
    bool    IsInstallment,
    int?    InstallmentCount,     // >= 2 se parcelado
    decimal AmountPaid,
    List<CreateSaleItemRequest> Items   // Não pode ser vazio
);

record CreateSaleItemRequest(Guid ProductId, int Quantity);  // Quantity > 0
```

**Regras de validação (`CreateSaleRequestValidator`):**
- `CustomerId` e `CustomerDocument`: exatamente um dos dois (não ambos, não nenhum — a menos que venda sem cliente)
- `PaymentMethod`: obrigatoriamente um dos quatro valores
- Se `IsInstallment=true`: `InstallmentCount >= 2` e `PaymentMethod = "Credit Card"`
- Todos os `Quantity > 0`

### SaleResponse (lista)

```csharp
record SaleResponse(
    Guid     Id,
    Guid     OperatorId,
    string   OperatorName,
    string?  CustomerName,
    string?  CustomerDocument,
    string   PaymentMethod,
    bool     IsInstallment,
    int?     InstallmentCount,
    decimal? InstallmentValue,
    decimal  Total,
    string   Status,            // "Active" | "Cancelled"
    Guid?    CancelledById,
    DateTime? CancelledAt,
    DateTime CreatedAt
);
```

### SaleDetailResponse (detalhe / criação)

Inclui tudo do `SaleResponse` mais:

```csharp
List<SaleItemResponse> Items,
decimal AmountPaid,
decimal Change               // AmountPaid - Total
```

### SaleItemResponse

```csharp
record SaleItemResponse(
    Guid     Id,
    Guid     SaleId,
    Guid?    ProductId,          // null se produto excluído
    string   ProductName,
    decimal  UnitPrice,
    decimal? PurchasePriceSnapshot,
    int      Quantity,
    decimal  Subtotal
);
```

### AdjustStockRequest

```csharp
record AdjustStockRequest(int Quantity);  // Positivo ou negativo
```

---

## 3. Endpoints da API

### Vendas — `SalesController.cs`

| Método | Rota | Role | Descrição |
|---|---|---|---|
| `GET` | `/api/sales` | Qualquer autenticado | Lista paginada com filtros (`page`, `pageSize`, `startDate`, `endDate`, `operatorId`, `status`) |
| `GET` | `/api/sales/{id}` | Qualquer autenticado | Detalhe completo com itens |
| `POST` | `/api/sales` | Qualquer autenticado | Cria venda; operador vem do JWT |
| `DELETE` | `/api/sales/{id}` | `Owner` | Cancela venda e restaura estoque |

### Produtos / Estoque — `ProductsController.cs`

| Método | Rota | Role | Descrição |
|---|---|---|---|
| `GET` | `/api/products` | Qualquer autenticado | Lista com filtros (`name`, `barcode`, `categoryId`, `sortBy`, `sortOrder`) |
| `GET` | `/api/products/{id}` | Qualquer autenticado | Detalhe |
| `POST` | `/api/products` | `Owner` | Cria produto com estoque inicial |
| `PUT` | `/api/products/{id}` | `Owner` | Atualiza dados (sem alterar estoque) |
| `DELETE` | `/api/products/{id}` | `Owner` | Soft delete (`IsActive=false`) |
| `PATCH` | `/api/products/{id}/stock` | `Owner` | Ajuste manual de estoque (+/-) |

---

## 4. Lógica de Serviços no Backend

### SaleService — `backend/PDV.Infrastructure/Services/SaleService.cs`

#### `CreateAsync(request, operatorId)`

```
1. Carrega todos os produtos dos itens do request (uma query só)
2. Para cada item:
   a. Produto existe? (não encontrado → 404)
   b. Produto IsActive? (false → erro de negócio)
   c. product.Stock >= item.Quantity? (insuficiente → erro de negócio)
3. Decrementa estoque: product.Stock -= item.Quantity
4. Cria SaleItem com snapshots (ProductName, UnitPrice, PurchasePriceSnapshot)
5. Calcula Total = soma dos subtotais
6. Se parcelado: InstallmentValue = Total / InstallmentCount
7. Cria Sale com Status="Active", OperatorId=operatorId
8. SaveChangesAsync() — tudo em transação
9. Retorna SaleDetailResponse com Change = AmountPaid - Total
```

#### `CancelAsync(id, adminId)`

```
1. Carrega Sale com Items (include)
2. Valida sale.Status != Cancelled (senão → erro)
3. Para cada item onde ProductId != null:
   a. Carrega Product
   b. product.Stock += item.Quantity  (restaura estoque)
4. sale.Status = Cancelled
5. sale.CancelledById = adminId
6. sale.CancelledAt = DateTime.UtcNow
7. SaveChangesAsync() — tudo em transação
```

**Atenção:** Se o `ProductId` do item for `null` (produto foi excluído depois da venda), o estoque **não é restaurado** — não há produto para devolver.

---

### ProductService — `backend/PDV.Infrastructure/Services/ProductService.cs`

#### `AdjustStockAsync(id, request)`

```
1. Carrega produto (com TenantId filter automático)
2. newStock = product.Stock + request.Quantity
3. Valida newStock >= 0 (senão → erro)
4. product.Stock = newStock
5. product.UpdatedAt = DateTime.UtcNow
6. SaveChangesAsync()
7. Retorna ProductResponse atualizado
```

---

## 5. Frontend — Camadas

### Services — `frontend/src/services/`

#### `sale.service.ts`

```typescript
saleService.create(payload)      // POST /sales → SaleDetail
saleService.getAll()             // GET  /sales?page=1&pageSize=200 → SaleListItem[]
saleService.getById(id)          // GET  /sales/{id} → SaleDetail
saleService.cancel(id)           // DELETE /sales/{id}
```

**Tipos principais:**
```typescript
interface CreateSalePayload {
  customerId?: string
  customerDocument?: string
  paymentMethod: string
  isInstallment: boolean
  installmentCount?: number
  amountPaid: number
  items: { productId: string; quantity: number }[]
}

interface SaleDetail {
  id, operatorId, operatorName, customerName, customerDocument,
  paymentMethod, isInstallment, installmentCount, installmentValue,
  total, status, cancelledById, cancelledAt, createdAt,
  items: SaleItemDetail[],
  amountPaid, change              // change = amountPaid - total
}
```

#### `product.service.ts`

```typescript
productService.getAll()           // GET  /products?page=1&pageSize=500 → Product[]
productService.create(payload)    // POST /products → Product
productService.update(id, payload)// PUT  /products/{id} → Product
productService.delete(id)         // DELETE /products/{id}
productService.adjustStock(id, n) // PATCH /products/{id}/stock → Product
```

**Mapeamento de nomes Frontend ↔ Backend:**

| Frontend | Backend |
|---|---|
| `costPrice` | `purchasePrice` |
| `criticalStock` | `minCriticalStock` |

---

### Hooks — `frontend/src/hooks/`

#### `useSales.ts`

```typescript
useSales()            // useQuery  — lista de vendas
useSaleDetail(id)     // useQuery  — detalhe (só ativo se id != null)
useCreateSale()       // useMutation — invalida PRODUCTS_KEY (estoque mudou)
useCancelSale()       // useMutation — invalida SALES_KEY + PRODUCTS_KEY
```

#### `useProducts.ts`

```typescript
useProducts()         // useQuery  — lista de produtos com estoque
useCreateProduct()    // useMutation — invalida cache
useUpdateProduct()    // useMutation — invalida cache
useDeleteProduct()    // useMutation — invalida cache
useAdjustStock()      // useMutation — invalida cache
```

**Invalidação de cache:** Criar ou cancelar uma venda sempre dispara refetch dos produtos, mantendo o estoque exibido sincronizado.

---

## 6. Páginas do Frontend

### PDV (Vendas) — `frontend/src/pages/Sales/index.tsx`

**Fluxo de uso:**

```
1. Lista produtos: isActive=true && stock > 0
2. Filtros: busca por nome (debounce 3s) + categoria
3. Usuário clica no produto → adiciona ao carrinho
   - Valida: quantidade no carrinho < product.stock
4. Ajusta quantidades no carrinho
5. Seleciona cliente (cadastrado OU digita CPF OU sem cliente)
6. Escolhe forma de pagamento:
   - Dinheiro → campo de valor recebido → calcula troco
   - PIX / Débito → sem parcelamento
   - Crédito → pode parcelar em 2–12x
7. Clica "Finalizar venda"
8. POST /api/sales
9. Sucesso → carrinho limpo + toast + produtos refetchados
```

**Tipo local de carrinho:**
```typescript
interface CartLine {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  maxQuantity: number   // product.stock no momento da adição
}
```

---

### Histórico de Vendas — `frontend/src/pages/SalesHistory/index.tsx`

**Funcionalidades:**

1. **Tabela** (DataGrid) com colunas:
   - ID (6 primeiros chars do UUID)
   - Horário
   - Cliente
   - Operador
   - Forma de pagamento (chip colorido)
   - Total
   - Status (`Ativo` em verde / `Cancelado` em vermelho)
   - Menu de ações

2. **Filtros locais** (aplicados no frontend sobre os dados carregados):
   - Status: `Todos` | `Ativo` | `Cancelado`
   - Pagamento: `Todos` | `Pix` | `Dinheiro` | `Crédito` | `Débito`
   - Operador: selecionado da lista de operadores únicos

3. **Modal de detalhe** (ao clicar na venda):
   - Dados gerais: data/hora, operador, cliente, pagamento, parcelas, status
   - Tabela de itens: `ProductName`, `Quantity`, `UnitPrice`, `Subtotal`
   - Rodapé: Subtotal, Valor pago, Troco, **Total**

4. **Cancelamento:**
   - Dialog de confirmação: *"Esta ação irá cancelar a venda e devolver os itens ao estoque"*
   - `DELETE /api/sales/{id}` — somente `Owner`
   - Sucesso → invalida cache de vendas + produtos

**Tipos locais:**
```typescript
type SaleStatus = 'Ativo' | 'Cancelado'
type SalePaymentMethod = 'Pix' | 'Dinheiro' | 'Crédito' | 'Débito'

interface FilterState {
  status: SaleStatus | 'Todos'
  payment: SalePaymentMethod | 'Todos'
  operator: string
}
```

---

### Estoque (Inventário) — `frontend/src/pages/Inventory/index.tsx`

**KPIs calculados no frontend:**

| Card | Cálculo |
|---|---|
| Valor total em estoque | `Σ (price * stock)` |
| Total de unidades | `Σ stock` |
| Produtos com estoque baixo | `count where stock <= minStock` |
| Produtos em nível crítico | `count where stock <= criticalStock` |

**Nível de estoque (coluna da tabela):**

```typescript
function getStockLevel(stock, minStock, criticalStock): 'OK' | 'Baixo' | 'Crítico' {
  if (criticalStock !== undefined && stock <= criticalStock) return 'Crítico'  // barra vermelha
  if (minStock !== undefined && stock <= minStock)           return 'Baixo'    // barra amarela
  return 'OK'                                                                  // barra verde
}
```

**Ações disponíveis:**
- **Novo produto**: abre modal → `POST /api/products` (com estoque inicial)
- **Editar produto**: abre modal → `PUT /api/products/{id}` (sem alterar estoque)
- **Ajustar estoque**: abre modal separado → `PATCH /api/products/{id}/stock`
- **Excluir produto**: soft delete → `DELETE /api/products/{id}`

---

## 7. Fluxos Completos

### Fluxo 1 — Criar Venda (estoque decrementado)

```
Frontend (Sales/index.tsx)
  │
  ├── Cart montado localmente (nenhuma chamada ao backend ainda)
  ├── Usuário clica "Finalizar"
  └── useCreateSale().mutate(payload)
        │
        └── POST /api/sales
              │
              Backend (SaleService.CreateAsync)
              ├── Valida: produto ativo e stock >= qty
              ├── product.Stock -= qty    (para cada item)
              ├── Cria SaleItems (snapshots)
              ├── Cria Sale (Status=Active)
              └── SaveChangesAsync() ─ transação
                    │
                    └── SaleDetailResponse
                          │
              Frontend
              ├── Limpa carrinho
              ├── Toast de sucesso
              └── queryClient.invalidateQueries(PRODUCTS_KEY)
                    └── useProducts() refetch → estoque atualizado na UI
```

---

### Fluxo 2 — Cancelar Venda (estoque restaurado)

```
Frontend (SalesHistory/index.tsx)
  │
  ├── Usuário abre detalhe da venda
  ├── Clica "Cancelar"
  ├── Dialog de confirmação
  └── useCancelSale().mutate(saleId)
        │
        └── DELETE /api/sales/{saleId}
              │
              Backend (SaleService.CancelAsync)
              ├── Valida Status != Cancelled
              ├── product.Stock += qty    (para cada item com ProductId != null)
              ├── sale.Status = Cancelled
              ├── sale.CancelledById = adminId (JWT)
              ├── sale.CancelledAt = now
              └── SaveChangesAsync() ─ transação
                    │
                    └── 204 No Content
                          │
              Frontend
              ├── Toast de sucesso
              ├── queryClient.invalidateQueries(SALES_KEY)
              └── queryClient.invalidateQueries(PRODUCTS_KEY)
```

---

### Fluxo 3 — Ajuste Manual de Estoque

```
Frontend (Inventory/index.tsx)
  │
  ├── Usuário clica "Ajustar Estoque" no produto
  ├── AdjustStockModal abre (exibe stock atual)
  ├── Usuário digita quantidade (+/-)
  └── useAdjustStock().mutate({ id, quantity })
        │
        └── PATCH /api/products/{id}/stock  { quantity: N }
              │
              Backend (ProductService.AdjustStockAsync)
              ├── newStock = product.Stock + quantity
              ├── Valida newStock >= 0
              ├── product.Stock = newStock
              └── SaveChangesAsync()
                    │
                    └── ProductResponse (atualizado)
                          │
              Frontend
              ├── Toast de sucesso
              └── queryClient.invalidateQueries(PRODUCTS_KEY)
```

---

## 8. Banco de Dados

### Índices relevantes

```sql
-- Barcode único por tenant
UNIQUE INDEX IX_Products_TenantId_Barcode (TenantId, Barcode)

-- Filtros comuns em vendas
INDEX IX_Sales_TenantId (TenantId)
INDEX IX_SaleItems_SaleId (SaleId)
INDEX IX_SaleItems_ProductId (ProductId)
```

### Cascade / referência

```sql
-- Ao deletar uma venda: itens são deletados em cascata
SaleItem.SaleId → Sales.Id  ON DELETE CASCADE

-- Ao deletar um produto: ProductId do item vira null (histórico preservado)
SaleItem.ProductId → Products.Id  ON DELETE SET NULL
```

---

## 9. Arquivos-Chave

### Backend

| Arquivo | Responsabilidade |
|---|---|
| `Domain/Entities/Product.cs` | Entidade com `Stock`, `MinStock`, `MinCriticalStock` |
| `Domain/Entities/Sale.cs` | Entidade com `Status`, `Total`, `AmountPaid`, `CancelledById` |
| `Domain/Entities/SaleItem.cs` | Itens com snapshots de preço e nome |
| `Infrastructure/Services/SaleService.cs` | Criação (decrementa estoque) e cancelamento (restaura) |
| `Infrastructure/Services/ProductService.cs` | Ajuste manual de estoque, CRUD de produto |
| `Application/DTOs/Sales/` | `CreateSaleRequest`, `SaleResponse`, `SaleDetailResponse` |
| `Application/Validators/Sales/CreateSaleRequestValidator.cs` | Regras de validação do request |
| `Api/Controllers/SalesController.cs` | Endpoints de vendas |
| `Api/Controllers/ProductsController.cs` | Endpoints de produto e estoque |

### Frontend

| Arquivo | Responsabilidade |
|---|---|
| `services/sale.service.ts` | Chamadas HTTP para `/sales` |
| `services/product.service.ts` | Chamadas HTTP para `/products` |
| `hooks/useSales.ts` | Queries + mutations de vendas, invalidação de cache |
| `hooks/useProducts.ts` | Queries + mutations de produtos, invalidação de cache |
| `pages/Sales/index.tsx` | PDV: carrinho, pagamento, criação de venda |
| `pages/SalesHistory/index.tsx` | Histórico, filtros, detalhe, cancelamento |
| `pages/Inventory/index.tsx` | Gestão de produtos, KPIs, ajuste de estoque |
| `types/product.types.ts` | Tipos `Product`, `ProductCategory`, `StockLevel` |
| `pages/SalesHistory/types.ts` | Tipos `SaleRecord`, `FilterState`, `SaleStatus` |

---

## 10. Diagnóstico de Problemas Comuns

### Venda falha ao criar

| Causa | Onde resolver |
|---|---|
| `product.Stock < Quantity` | Verificar estoque do produto antes de tentar vender |
| Produto com `IsActive=false` | Produto foi excluído; remover do carrinho |
| `ProductId` não encontrado | Produto foi deletado fisicamente (não deveria acontecer — soft delete) |
| `InstallmentCount < 2` com parcelamento | Frontend deve garantir mínimo 2 parcelas |
| `PaymentMethod` inválido | Verificar enum no frontend vs. strings aceitas pelo backend |

### Cancelamento não restaura estoque de um item

**Causa esperada:** `ProductId` do item é `null` — produto foi excluído depois da venda. Por design, o estoque de produtos excluídos não é restaurado.

### Estoque exibido desatualizado após venda

**Causa:** `invalidateQueries(PRODUCTS_KEY)` não rodou. Verificar se `useCreateSale` e `useCancelSale` estão invalidando corretamente no `onSuccess`.

### Troco calculado errado

**Lembrar:** troco = `AmountPaid - Total`. O `AmountPaid` deve ser o valor que o cliente entregou, não o total da venda. Para PIX, Débito e Crédito, `AmountPaid` deve ser igual ao `Total`.
