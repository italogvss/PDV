# Análise do módulo Employee / TenantRole / TenantRolePermission + TenantSettings

## Context

O módulo de funcionários foi recém-refatorado (o git mostra a remoção de `EmployeeTypePermission`,
`EmployeeType` e migração para o modelo `TenantRole` + `TenantRolePermission`). O objetivo desta análise
é avaliar a qualidade da implementação atual de ponta a ponta (entidades, services, controllers,
repositórios, páginas, hooks, services do frontend), encontrar inconsistências, código morto e
propriedades não usadas, e produzir um plano de correção priorizado.

A análise cobre dois módulos conectados:
- **Funcionários**: `Employee`, `TenantRole`, `TenantRolePermission` + páginas/serviços/hooks.
- **Configurações do tenant**: `TenantSettings` (backend) e a página `Settings` com suas seções (frontend),
  com foco no `TeamSection` (onde se criam papéis e se editam permissões).

O modelo de domínio é coerente e segue bem o multi-tenant via query filter global. Os problemas estão
**no fluxo de ligação usuário↔tenant, no enforcement de permissões e em duplicações/código morto no
frontend**. Abaixo, os achados por severidade e o plano de correção.

---

## Visão geral do modelo (como deveria funcionar)

```
User (global, 1 conta)
 ├─ UserTenant (N:N)  → liga User a Tenant + define Role (Owner|Employee) por tenant + JoinedAt
 └─ Employee (1 por tenant) → TenantId, UserId, RoleId, Position, Salary, Phone, AvatarUrl
        └─ TenantRole (N:1) → Name, Description, IsDefault
              └─ TenantRolePermission (N:N) → enum Permission
```

Dois conceitos de "papel" coexistem:
- `UserTenant.Role` / `User.Role` = `Owner | Employee` → controla autorização grossa (`[Authorize(Roles="Owner")]`).
- `Employee.RoleId → TenantRole` = papel granular do tenant (Gerente, Atendente…) → controla `Permission` granular.

O JWT carrega `tenantId` + `role` (Owner/Employee). O `tenantId` é a chave de todo o acesso: `ITenantContext`
lê o claim `tenantId` e o query filter global isola os dados. **Sem `tenantId` no token, nada do tenant é acessível.**

---

## 🔴 Achado #1 (CRÍTICO) — Funcionário criado não consegue acessar o tenant

**O que acontece:** `EmployeeService.CreateAsync` ([EmployeeService.cs:34-82](backend/PDV.Infrastructure/Services/EmployeeService.cs#L34-L82))
cria um `User` (Role=Employee, com senha temporária) e um `Employee`, **mas nunca cria um `UserTenant`**.
O único lugar que cria `UserTenant` é `TenantService.CreateAsync` ([TenantService.cs:62](backend/PDV.Infrastructure/Services/TenantService.cs#L62)) — e só para o Owner.

**Por que isso quebra o login (explicação do problema do `UserTenant`):**
O `UserTenant` é a tabela de ligação que diz "este usuário pertence a este tenant, com este papel". É ela que
dá acesso. No login ([AuthService.cs:105-122](backend/PDV.Infrastructure/Services/AuthService.cs#L105-L122)) o
backend monta o `tenantId` do JWT **exclusivamente** a partir de `user.UserTenants`:

```csharp
var tenants = user.UserTenants.ToList();
Guid? tenantId = null;
if (tenants.Count > 0)
{
    var active = user.LastTenantId.HasValue
        ? tenants.FirstOrDefault(ut => ut.TenantId == user.LastTenantId) ?? tenants[0]
        : tenants[0];
    tenantId = active.TenantId;
}
return (GenerateToken(user.Id, tenantId, ...), ...);
```

Fluxo real do funcionário recém-criado:
1. Owner cadastra o funcionário → cria `User` + `Employee`, **sem `UserTenant`**.
2. Funcionário faz login com a senha temporária.
3. `user.UserTenants` está **vazio** → `tenantId = null` → JWT sai **sem tenant**.
4. No frontend, usuário autenticado **sem tenant** cai na `OnboardingRoute` (fluxo de "criar um negócio").
5. Resultado: o funcionário nunca chega ao tenant onde foi contratado. O registro `Employee` fica órfão do
   caminho de autenticação — existe no banco, mas é inacessível. Além disso, qualquer chamada de API falharia:
   `ITenantContext.TenantId` ([TenantContext.cs]) lança exceção quando o claim `tenantId` está ausente.

**Correção:** em `EmployeeService.CreateAsync`, ao criar o `User`, criar também:
```csharp
user.UserTenants = [ new UserTenant {
    UserId = user.Id,
    TenantId = tenantContext.TenantId,
    Role = UserRole.Employee,
    JoinedAt = DateTime.UtcNow,
} ];
user.LastTenantId = tenantContext.TenantId; // garante que o login resolva o tenant certo
```
(Idealmente dentro da mesma persistência do `User`, antes do `AddAsync`.)

---

## 🔴 Achado #2 (CRÍTICO, mas é seu próximo passo) — Permissões granulares nunca são aplicadas

`PermissionService.RequireAsync` ([PermissionService.cs](backend/PDV.Infrastructure/Services/PermissionService.cs))
existe, está registrado no DI ([Program.cs:102](backend/PDV.Api/Program.cs#L102)), mas **não tem nenhum call site**
em controllers ou services (confirmado por busca). Hoje a autorização real é apenas:
- `[Authorize]` → qualquer autenticado;
- `[Authorize(Roles = "Owner")]` → só Owner.

Consequência: o enum `Permission`, a tabela `TenantRolePermission` e toda a matriz do `TeamSection` **não têm
efeito em runtime**. Um `Employee` passa ou não por um endpoint só pela regra grossa Owner/Employee.

**Você já vai implementar isso** (matriz cargo × permissão). Pré-requisitos e abordagem recomendada para a
implementação ficar correta:
- **Depende do Achado #1**: sem `UserTenant`/`tenantId` no token, o funcionário nem chega aos endpoints. Corrigir #1 primeiro.
- **Onde aplicar**: criar um atributo/filter declarativo, ex. `[RequirePermission(Permission.SellProducts)]`,
  que chama `IPermissionService.RequireAsync` — evita injetar o service manualmente em cada action. Aplicar nos
  endpoints de venda, estoque, despesas, relatórios (os que hoje só têm `[Authorize]`).
- **Owner curto-circuita** (já implementado em `RequireAsync`): Owner sempre passa; granularidade só vale para Employee.
- A escrita das permissões já funciona: `PUT /team-roles/{id}/permissions` → `ReplacePermissionsAsync` (delete+insert).
  A leitura para enforcement já existe: `HasPermissionAsync(roleId, permission)`.

---

## 🟠 Achado #3 — Origem do claim `role` é inconsistente entre os fluxos

- Login ([AuthService.cs:122](backend/PDV.Infrastructure/Services/AuthService.cs#L122)) usa `user.Role` (global).
- Refresh ([AuthService.cs:144](backend/PDV.Infrastructure/Services/AuthService.cs#L144)) usa `active.Role` (do `UserTenant`),
  com **default `"Owner"` quando não há tenants** ([AuthService.cs:136](backend/PDV.Infrastructure/Services/AuthService.cs#L136)).

Dois problemas: (a) duas fontes de verdade para o mesmo claim — após um refresh, o `role` pode divergir do login;
(b) o default `"Owner"` para usuário sem tenant é um cheiro de escalonamento de privilégio (mitigado hoje porque
sem `tenantId` o acesso é barrado, mas é frágil). **Recomendação:** padronizar o `role` do token para vir sempre de
`UserTenant.Role` do tenant ativo; quando não houver tenant, não emitir `role` de Owner por default. Considerar se
`User.Role` (global) ainda faz sentido coexistindo com `UserTenant.Role` — em multi-tenant o papel deveria ser por tenant.

---

## 🟠 Achado #4 — `TenantSettings` não tem GET/PUT (Settings do frontend não persiste)

`TenantController` ([TenantController.cs](backend/PDV.Api/Controllers/TenantController.cs)) só expõe `POST` (criar tenant).
`TenantSettings` é populado uma única vez na criação e nunca mais lido/atualizado por API. No frontend, as seções
`BusinessSection`, `OperationSection` e `AppearanceSection` usam `useState` local — **nada é salvo**; ao dar refresh, perde tudo.

Note ainda que o tipo frontend `TenantSettings` (settings.types.ts) tem sub-objetos `payments/fiscal/printing/backup/
integrations/advanced` sem qualquer contrapartida no backend (`TenantSettings` backend só tem negócio + endereço +
`BusinessHoursJson` + `TaxRegime`). **Recomendação:** criar `GET /api/tenants/settings` e `PUT /api/tenants/settings`
+ service/hook no frontend, e alinhar o tipo frontend ao que o backend realmente guarda.

---

## 🟠 Achado #5 — Desativar funcionário desativa o `User` global

`DeactivateAsync` ([EmployeeService.cs:112-113](backend/PDV.Infrastructure/Services/EmployeeService.cs#L112-L113)) faz
`employee.IsActive = false` **e** `employee.User.IsActive = false`. Como o `User` é global (pode ter vários `UserTenant`
em tenants diferentes), desativar um funcionário em um tenant **bloqueia a conta do usuário em todos os tenants** e
impede o login. **Recomendação:** desativar apenas o `Employee` (e/ou remover o `UserTenant` daquele tenant), preservando
a conta global. Mesma lógica vale para `ReactivateAsync`.

---

## 🟡 Achado #6 — Modal de criar funcionário duplicada

Existem duas implementações do mesmo formulário, ambas batendo no mesmo endpoint:
- `pages/Employees/components/AddEmployeeModal` — correta, segue as convenções de modal (usa `CurrencyField`, `ModalHeader`, `FormModalActions`).
- `EmployeeFormModal` **inline** dentro de [TeamSection/index.tsx:162-320](frontend/src/pages/Settings/components/TeamSection/index.tsx#L162-L320)
  — `TextField` + `InputAdornment` manual para salário, schema divergente (`salary.positive()` vs `salary.min(0)`), parse manual.

Isso gera drift de validação/UX e manutenção dobrada. **Recomendação:** o `TeamSection` deve reusar `AddEmployeeModal`
(ou extrair um form compartilhado). O `RoleFormModal` inline pode permanecer no TeamSection (é específico de papéis).

---

## 🟡 Achado #7 — Código morto / propriedades e tipos não usados

**Frontend:**
- [pages/Employees/types.ts](frontend/src/pages/Employees/types.ts) é da era de mock: `Employee` (com `initials`,
  `colorKey`, `role`, `shift`, `status`, `salesToday`, `commission`), `EmployeeRole`, `EmployeeShift`, `EmployeeStatus`,
  `EMPLOYEE_ROLES`, `EMPLOYEE_SHIFTS` — **nenhum é usado** (a página usa o `Employee` real de `types/employee.types.ts`).
  Apenas `AvatarColorKey` sobrevive. → remover os tipos mortos e mover `AvatarColorKey` para junto do `EmployeeAvatar`.
- `EmployeeStatusChip` ([components/EmployeeStatusChip](frontend/src/pages/Employees/components/EmployeeStatusChip/index.tsx))
  — definido, nunca importado/renderizado. → remover (ou usar, se houver intenção de status de turno).
- `PermissionsTab` ([components/PermissionsTab](frontend/src/pages/Employees/components/PermissionsTab/index.tsx)) —
  placeholder que aponta para Settings → Equipe, **nunca renderizado**. → remover ou wirar como aba real.
- Tipo `TeamSettings` (`Record<TeamPermission, Record<TeamRole, boolean>>`) em settings.types.ts é um modelo de
  permissão paralelo e conflitante com `TenantRole.permissions: string[]` (a fonte real). → remover.

**Backend:**
- `IEmployeeRepository.GetByUserIdAsync(Guid userId, Guid tenantId)` — o parâmetro `tenantId` é ignorado na
  implementação ([EmployeeRepository.cs:25-30]) porque o query filter já isola o tenant. → remover o parâmetro.
- `Employee.AvatarUrl` — mapeado em DTO/response, mas não há fluxo de upload nem geração da URL; fica sempre `null`.
  → implementar upload (skill `image-upload.md`) ou remover do response até existir.
- `TenantRole.IsDefault` — exposto no DTO, mas nunca usado para proteger os papéis padrão. Hoje é possível **renomear
  ou excluir** "Gerente"/"Atendente"/"Estoquista" (o delete só é barrado se houver membros). → bloquear edição/exclusão
  quando `IsDefault == true`.

---

## 🟡 Achado #8 — Inconsistências menores

- **Validação de salário**: backend `GreaterThan(0)` ([CreateEmployeeRequestValidator.cs]) vs frontend `min(0)` /
  `positive()`. Pequena divergência de borda (0 é tratado como "não informado" no front, então ok na prática). Padronizar.
- **`SetRolePermissionsRequest` sem validator FluentValidation**: as strings são parseadas para enum no service e
  lançam `BusinessException` se inválidas — funciona, mas foge do padrão (validar na entrada).
- **Cross-tenant em `TenantRolePermission`**: a entidade não tem `TenantId` nem query filter; `HasPermissionAsync`
  consulta direto por `roleId`. Seguro hoje (o `roleId` já vem de um `Employee` isolado por tenant), mas é um caminho
  estrutural sem isolamento — documentar/guardar com comentário.
- **Doc drift**: `backend/CLAUDE.md` afirma "não há BaseEntity", porém **todas** as 17 entidades herdam `BaseEntity`
  ([Employee.cs:3], [TenantRole.cs:5], etc). → atualizar o CLAUDE.md (ou era a intenção não ter BaseEntity?).
- **Settings com 6 de 10 seções comentadas** no `NAV_ITEMS` ([Settings/index.tsx]) com componentes órfãos
  (`PaymentsSection`, `FiscalSection`, etc.). Aceitável como roadmap, mas é peso morto — confirmar intenção.

---

## Plano de correção (priorizado)

### Fase 0 — Bugs que quebram o fluxo core (fazer primeiro)
1. **Criar `UserTenant` na criação do funcionário** — `EmployeeService.CreateAsync`: adicionar `UserTenant`
   (Role=Employee, JoinedAt) e `LastTenantId` ao novo `User`. *(Achado #1)*
2. **Desativação não deve derrubar o `User` global** — `DeactivateAsync`/`ReactivateAsync`: agir sobre `Employee`
   (e o `UserTenant` do tenant), não sobre `User.IsActive`. *(Achado #5)*
3. **Padronizar o claim `role`** — derivar de `UserTenant.Role` do tenant ativo nos fluxos de login/refresh; remover
   o default `"Owner"` para usuário sem tenant. *(Achado #3)*

### Fase 1 — Habilitar permissões (você vai implementar)
4. Atributo `[RequirePermission(Permission.X)]` chamando `IPermissionService.RequireAsync`, aplicado aos endpoints
   de venda/estoque/despesas/relatórios. A matriz do `TeamSection` já grava/limpa permissões corretamente. *(Achado #2)*

### Fase 2 — Persistência de configurações
5. `GET` + `PUT /api/tenants/settings` (service + DTOs no backend; `tenantSettings.service.ts` + hook no frontend);
   ligar `BusinessSection`/`OperationSection`/`AppearanceSection`; alinhar o tipo `TenantSettings` do frontend. *(Achado #4)*

### Fase 3 — Consistência e limpeza
6. Consolidar a modal de funcionário: `TeamSection` reusa `AddEmployeeModal`; remover `EmployeeFormModal` inline. *(Achado #6)*
7. Remover código morto: tipos da era mock em `pages/Employees/types.ts` (preservando `AvatarColorKey`),
   `EmployeeStatusChip`, `PermissionsTab`, tipo `TeamSettings`, parâmetro `tenantId` de `GetByUserIdAsync`. *(Achado #7)*
8. Proteger papéis `IsDefault` de rename/delete; validator para `SetRolePermissionsRequest`; alinhar validação de
   salário; decidir sobre `Employee.AvatarUrl`; atualizar `backend/CLAUDE.md` (BaseEntity). *(Achados #7, #8)*

---

## Arquivos críticos a tocar

| Item | Arquivo |
|---|---|
| Criar UserTenant + desativação | [EmployeeService.cs](backend/PDV.Infrastructure/Services/EmployeeService.cs) |
| Claim role | [AuthService.cs](backend/PDV.Infrastructure/Services/AuthService.cs) |
| Enforcement de permissão | [PermissionService.cs](backend/PDV.Infrastructure/Services/PermissionService.cs) + novo atributo em PDV.Api |
| Settings CRUD | [TenantController.cs](backend/PDV.Api/Controllers/TenantController.cs), `ITenantService`/`TenantService`, novos DTOs |
| Consolidar modal | [TeamSection/index.tsx](frontend/src/pages/Settings/components/TeamSection/index.tsx), [AddEmployeeModal](frontend/src/pages/Employees/components/AddEmployeeModal/index.tsx) |
| Código morto front | [pages/Employees/types.ts](frontend/src/pages/Employees/types.ts), EmployeeStatusChip, PermissionsTab, [settings.types.ts](frontend/src/types/settings.types.ts) |
| Param não usado | [EmployeeRepository.cs](backend/PDV.Infrastructure/Repositories/EmployeeRepository.cs) + interface |

---

## Verificação

- **Achado #1 (fix principal)**: criar funcionário → deslogar → logar com a senha temporária → confirmar que cai no
  dashboard do tenant (não no onboarding) e que `GET /auth/me` retorna o tenant na lista. Cobrir com teste de
  integração em `EmployeeService.CreateAsync` checando que um `UserTenant` é criado.
- **Achado #5**: desativar funcionário → confirmar que o `User` global continua ativo e que o login dele perde acesso
  só àquele tenant.
- **Permissões (#2)**: com um funcionário de papel "Atendente" (só SellProducts/ViewStock), tentar endpoint de despesas
  → esperar 401/403; Owner → passa.
- **Settings (#4)**: editar Negócio/Aparência, salvar, dar refresh → valores persistem.
- **Limpeza/typecheck frontend**: `cd frontend && npx tsc -b` (o `tsc --noEmit` na raiz não checa nada — ver memória).
- **Build backend**: `dotnet build` na pasta `backend`.
