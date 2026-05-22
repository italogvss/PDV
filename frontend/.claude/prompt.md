# Tarefa: Implementar autenticação OAuth Google — Frontend React

## 1. Leitura obrigatória antes de qualquer código

Leia os seguintes arquivos antes de escrever qualquer linha:

1. `CLAUDE.md` — regras e convenções do projeto
2. `src/store/slices/auth.slice.ts` — estrutura atual do estado de autenticação
3. `src/services/api.ts` — interceptor do Axios
4. `src/router/index.tsx` — rotas existentes
5. O design em `src/design/` para a página de login, se existir

Após a leitura, liste:
- O que o `AuthState` atual armazena
- Se já existe alguma página de login ou rota `/login`
- Como o interceptor trata erros 401 atualmente

**Não escreva nenhum código antes de apresentar esse diagnóstico.**

---

## 2. Contexto do fluxo

O backend usa httpOnly cookies — o frontend **nunca** toca no token diretamente. O browser envia os cookies automaticamente em toda request para a API.

```
Usuário clica em "Entrar com Google"
    ↓
window.location.href → GET {API_URL}/auth/google
    ↓
Google autentica → backend processa
    ↓
Backend seta cookies httpOnly (access_token + refresh_token)
Backend redireciona para {FRONTEND_URL}/auth/callback
    ↓                          ou
            {FRONTEND_URL}/auth/callback?error=auth_failed
    ↓
Frontend chama GET /auth/me para buscar os dados do usuário
    ↓
Popula Redux → redireciona para /dashboard ou /onboarding
```

### Por que não há token no frontend
Com httpOnly cookies, o JavaScript não consegue ler o token — isso é intencional e mais seguro. O frontend só sabe se o usuário está autenticado perguntando para o backend via `/auth/me`.

---

## 3. O que criar

### Passo 1 — Types
Crie `src/types/auth.types.ts`:
```ts
export interface AuthUser {
  userId: string
  tenantId: string | null
  name: string
  role: 'Owner' | 'Employee'
}
```

### Passo 2 — Auth Service
Crie `src/services/auth.service.ts`:
```ts
// Busca dados do usuário autenticado via cookie (o browser envia automaticamente)
getMe: async (): Promise<AuthUser>
  → GET /auth/me
  → retorna os dados do usuário se o cookie for válido
  → lança erro se 401

// Inicia o fluxo OAuth
getGoogleLoginUrl: () => string
  → retorna `${import.meta.env.VITE_API_URL}/auth/google`

// Logout — o backend limpa os cookies
logout: async (): Promise<void>
  → POST /auth/logout
```

Não há `saveToken`, `getToken` ou `jwt-decode` — o frontend não lida com tokens.

### Passo 3 — Axios
Atualize `src/services/api.ts`:
- Adicione `withCredentials: true` na instância do Axios — **obrigatório** para o browser enviar cookies cross-origin
- No interceptor de response, trate o 401 assim:
  ```ts
  // Se receber 401, tenta o refresh uma vez
  // POST /auth/refresh (sem body — o backend lê o cookie refresh_token)
  // Se o refresh funcionar → repete a request original
  // Se o refresh falhar → despacha logout no Redux → redireciona para /login
  ```
- Use uma flag `isRetry` para evitar loop infinito de refreshes

### Passo 4 — AuthState no Redux
Atualize `src/store/slices/auth.slice.ts`:
```ts
interface AuthState {
  userId: string | null
  tenantId: string | null
  name: string | null
  role: 'Owner' | 'Employee' | null
  isAuthenticated: boolean
  isLoading: boolean  // true enquanto verifica a sessão no boot
}
```
Actions necessárias:
- `setAuth(user: AuthUser)` — popula o estado
- `clearAuth()` — limpa tudo
- `setLoading(boolean)` — controla o estado de verificação inicial

### Passo 5 — Verificação de sessão no boot
Em `src/main.tsx` ou num componente `AuthProvider` na raiz da árvore:
- Ao iniciar o app, dispara `GET /auth/me`
- Enquanto aguarda → `isLoading: true` → renderiza um loading global (evita flash de tela de login)
- Sucesso → `setAuth` + `isLoading: false`
- Falha (401) → `clearAuth` + `isLoading: false`

Isso substitui a leitura do localStorage — o cookie é a fonte da verdade.

### Passo 6 — Página de Login
Crie `src/pages/Login/index.tsx`:
- Botão "Entrar com Google" → `window.location.href = getGoogleLoginUrl()`
- Exibe mensagem de erro se `?error=auth_failed` estiver na URL
- Criar página limpa centralizada com logo e botão

### Passo 7 — Página de Callback
Crie `src/pages/AuthCallback/index.tsx`:
- Se `?error` presente → redireciona para `/login?error=auth_failed`
- Se sem erro → chama `auth.service.getMe()`
  - `tenantId` null → redireciona para `/onboarding`
  - `tenantId` preenchido → redireciona para `/dashboard`
- Exibe loading centralizado enquanto processa — nunca tela em branco

### Passo 8 — Proteção de rotas
Crie `src/router/ProtectedRoute.tsx`:
- Se `isLoading: true` → renderiza loading (aguarda verificação de sessão)
- Se `isAuthenticated: false` → redireciona para `/login`
- Se `isAuthenticated: true` → renderiza `<Outlet />`

Atualize `src/router/index.tsx`:
```
/login          → <Login />         (pública)
/auth/callback  → <AuthCallback />  (pública)
/onboarding     → placeholder vazio por enquanto
/* demais rotas → <ProtectedRoute /> envolvendo <Outlet />
```

---

## 4. Regras que nunca podem ser violadas

- Nunca usar cores hardcoded — sempre via tema MUI
- Nunca usar `React.FC` ou arrow function para componentes
- Nunca usar `any` ou `as` para forçar tipo
- Nunca tentar ler ou manipular o cookie diretamente via JS
- `withCredentials: true` é obrigatório em toda instância do Axios
- O retry de refresh deve ter proteção contra loop — use flag `isRetry`
- Nunca usar `process.env` — sempre `import.meta.env`

---

## 5. Variável de ambiente necessária

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 6. Ao finalizar

- Liste todos os arquivos criados e modificados
- Confirme que `withCredentials: true` está na instância do Axios
- Confirme que o retry de 401 está protegido contra loop
- Liste qualquer decisão em aberto para revisão