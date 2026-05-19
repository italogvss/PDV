Tarefa: Implementar autenticação OAuth Google — Frontend React
1. Leitura obrigatória antes de qualquer código
Leia os seguintes arquivos antes de escrever qualquer linha:

CLAUDE.md — regras e convenções do projeto
src/store/slices/auth.slice.ts — estrutura atual do estado de autenticação
src/services/api.ts — interceptor do Axios
src/router/index.tsx — rotas existentes

Após a leitura, liste:

O que o AuthState atual armazena
Se já existe alguma página de login ou rota /login
Se o interceptor já injeta o token nos headers

Não escreva nenhum código antes de apresentar esse diagnóstico.

2. Contexto do fluxo
O backend já está implementado e emite um JWT próprio após o OAuth. O frontend nunca lida com o Google diretamente.
Usuário clica em "Entrar com Google"
    ↓
window.location.href → GET {API_URL}/auth/google
    ↓
Google autentica → backend processa
    ↓
Backend redireciona para {FRONTEND_URL}/auth/callback?token=JWT
    ↓                              ou
                    {FRONTEND_URL}/auth/callback?error=auth_failed
    ↓
Frontend lê o token da URL → decodifica → popula Redux → redireciona
Claims presentes no JWT
sub       → userId (Guid)
tenantId  → loja ativa (Guid ou string vazia se primeiro acesso)
name      → nome do usuário
role      → "Owner" | "Employee"
exp       → expiração
jti       → id único do token
Se tenantId vier vazio no token → usuário é novo → redirecionar para /onboarding após o callback. (não implementar o onboarding agora, só o redirecionamento)

3. O que criar
Passo 1 — Dependência
bashnpm install jwt-decode
Passo 2 — Types
Crie src/types/auth.types.ts:
tsexport interface TokenClaims {
  sub: string
  tenantId: string
  name: string
  role: 'Owner' | 'Employee'
  exp: number
  jti: string
}
Passo 3 — Auth Service
Crie src/services/auth.service.ts com as seguintes funções:

getGoogleLoginUrl() → retorna ${import.meta.env.VITE_API_URL}/auth/google
decodeToken(token: string): TokenClaims → decodifica o JWT com jwt-decode
saveToken(token: string): void → salva em localStorage
getToken(): string | null → lê do localStorage
removeToken(): void → remove do localStorage
isTokenValid(token: string): boolean → verifica se exp ainda não passou

Passo 4 — AuthState no Redux
Atualize src/store/slices/auth.slice.ts para garantir essa estrutura:
tsinterface AuthState {
  userId: string | null
  tenantId: string | null
  name: string | null
  role: 'Owner' | 'Employee' | null
  isAuthenticated: boolean
}
Adicione a action logout que limpa o estado e chama auth.service.removeToken().
Passo 5 — Página de Login
Crie src/pages/Login/index.tsx:

Botão "Entrar com Google" → chama window.location.href = getGoogleLoginUrl()
Se existir design em src/design/, converter para componente seguindo o padrão do CLAUDE.md — nunca editar o original
Se não existir design, criar uma página limpa centralizada com o logo do app e o botão

Passo 6 — Página de Callback
Crie src/pages/AuthCallback/index.tsx:

Lê ?token= e ?error= da URL via useSearchParams
Se ?error presente → redireciona para /login?error=auth_failed
Se ?token presente:

Valida com isTokenValid(token)
Decodifica com decodeToken(token)
Salva com saveToken(token)
Despacha setAuth no Redux
tenantId vazio → redireciona para /onboarding
tenantId preenchido → redireciona para /dashboard


Exibe um loading centralizado enquanto processa — nunca deixar tela em branco

Passo 7 — Proteção de rotas
Crie src/router/ProtectedRoute.tsx:

Verifica isAuthenticated no Redux
Se falso → redireciona para /login
Se verdadeiro → renderiza <Outlet />

Atualize src/router/index.tsx adicionando:
/login          → <Login />
/auth/callback  → <AuthCallback />
/onboarding     → placeholder vazio por enquanto (será implementado depois)
Envolva todas as rotas autenticadas existentes com <ProtectedRoute />.
Passo 8 — Persistência de sessão
Em src/main.tsx ou no componente raiz, antes de renderizar:

Leia o token do localStorage via getToken()
Se existir e for válido → decodifique e despache setAuth no Redux
Isso garante que o usuário continua logado ao recarregar a página


4. Regras que nunca podem ser violadas

Nunca usar cores hardcoded — sempre via tema MUI
Nunca usar React.FC ou arrow function para componentes
Nunca usar any ou as para forçar tipo
O token nunca deve ser lido diretamente fora do auth.service.ts
A página de callback nunca exibe o token na tela ou no console
Nunca usar process.env — sempre import.meta.env


5. Variável de ambiente necessária
Confirme que existe no .env:
envVITE_API_URL=http://localhost:5000/api

6. Ao finalizar

Liste todos os arquivos criados e modificados
Confirme se o tenantId está chegando corretamente no JWT
Liste qualquer decisão em aberto para revisão