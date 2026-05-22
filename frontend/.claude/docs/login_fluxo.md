Fluxo 1 — Boot da aplicação (toda vez que a página carrega)

App.tsx monta
  └─ AuthProvider (useEffect)
       └─ authService.getMe() → GET /api/auth/me
            ├─ Sucesso → dispatch(setAuth) → isAuthenticated: true
            └─ Falha 401 → interceptor tenta refresh (ver Fluxo 3)
                           └─ Se falhar → dispatch(clearAuth) → redirect /login
Enquanto esse getMe() não resolve, o store fica com isLoading: true e ambas as rotas (ProtectedRoute e PublicRoute) mostram um spinner — isso evita o flash de redirect.

Fluxo 2 — Login com Google

/login → clica "Entrar com Google"
  └─ window.location.href → GET /api/auth/google
       └─ Backend: Challenge(Google) → redireciona para accounts.google.com

Google autentica → redireciona para GET /api/auth/google/callback
  └─ Backend (AuthController.GoogleCallback):
       1. Extrai googleId, email, name, avatar do Principal
       2. AuthService.HandleGoogleCallbackAsync():
           ├─ Busca user por googleId ou email
           ├─ Se não existe: cria User + UserSettings padrão
           └─ Resolve tenant ativo (LastTenantId ou primeiro da lista)
           └─ Gera JWT (sub, tenantId, name, role, exp: 8h)
           └─ Gera refresh token (64 bytes aleatórios → SHA256 no banco)
       3. Seta cookies HttpOnly:
           ├─ access_token  → 8 horas
           └─ refresh_token → 30 dias
       4. Redireciona para FrontendCallbackUrl (/auth/callback)

/auth/callback (AuthCallbackPage):
  └─ useEffect → authService.getMe()
       ├─ Sucesso → dispatch(setAuth) → navigate('/' ou '/onboarding')
       └─ Falha   → navigate('/login?error=auth_failed')
Ponto chave: getMe() é chamado duas vezes — uma no AuthProvider (boot) e outra no AuthCallbackPage (pós-OAuth). São contextos distintos e corretos.

Fluxo 3 — Refresh automático (token expira mid-session)
O interceptor em api.ts captura qualquer 401:


Request qualquer → 401
  └─ Interceptor:
       ├─ Já é retry? → rejeita (evita loop)
       └─ POST /api/auth/refresh  ← usa axios puro, não api (não re-intercepta)
            ├─ Backend lê cookie refresh_token → SHA256 → busca no banco
            │   ├─ Válido → gera novo JWT + novo refresh → novos cookies → 200
            │   └─ Inválido → ExpireAuthCookies → 401
            ├─ Refresh OK → repete a request original
            └─ Refresh falha → dispatch(clearAuth) → ProtectedRoute redireciona /login
Fluxo 4 — Logout

Clica "Sair"
  └─ POST /api/auth/logout
       └─ Backend: zera RefreshToken no banco + expira os dois cookies

Frontend:
  └─ dispatch(clearAuth) → ProtectedRoute → /login
Onde o tenantId trafega
O JWT carrega o tenantId do tenant ativo — o backend lê ele para resolução do tenant
O frontend armazena tenantId no Redux e o interceptor injeta X-Tenant-Id em todo request
Se tenantId for null (usuário sem negócio cadastrado), o AuthCallbackPage redireciona para /onboarding
Arquivos envolvidos (por ordem no fluxo)
Arquivo	Papel
App.tsx	Monta AuthProvider fora do RouterProvider
AuthProvider	Dispara getMe() no boot
auth.slice.ts	Estado isAuthenticated, isLoading, tenantId
ProtectedRoute	Guarda rotas privadas
PublicRoute	Guarda /login
Login/index.tsx	Dispara o OAuth via window.location.href
AuthCallback/index.tsx	Recebe o retorno do Google
auth.service.ts	getMe(), logout(), getGoogleLoginUrl()
api.ts	Interceptor 401 → refresh automático
AuthController.cs	Endpoints /google, /callback, /me, /refresh, /logout
AuthService.cs	Criar/buscar usuário, gerar JWT e refresh token
