# Tarefa: Adicionar Refresh Token + httpOnly Cookie — Backend .NET

## 1. Leitura obrigatória antes de qualquer código

Leia os seguintes arquivos antes de escrever qualquer linha:

1. `AuthController.cs` — endpoints atuais de OAuth
2. O `GenerateToken` atual — entenda as claims que já existem
3. `Program.cs` — configuração de CORS e autenticação
4. O model `User` — para adicionar o campo de refresh token

Após a leitura, liste:
- Como o callback OAuth atual retorna o token para o frontend
- Se já existe algum campo de refresh token no `User`
- Como o CORS está configurado (origins permitidas)

**Não escreva nenhum código antes de apresentar esse diagnóstico.**

---

## 2. O que mudar

### Passo 1 — User model
Adicione os campos:
```csharp
RefreshToken         string nullable
RefreshTokenExpiry   DateTime nullable
```
Crie a migration correspondente.

### Passo 2 — GenerateToken
Mantenha o método atual intacto. Crie um método auxiliar separado:
```csharp
private string GenerateRefreshToken()
```
Deve retornar uma string aleatória segura via `RandomNumberGenerator`.
O refresh token não é JWT — é apenas um token opaco salvo no banco.

### Passo 3 — Callback OAuth
Atualize o endpoint `GET /auth/google/callback`:
- Após emitir o access token JWT, gere também um refresh token
- Salve o refresh token hasheado no banco (`User.RefreshToken`) com expiração de 30 dias
- **Não retorne mais o JWT na URL** — remova o `?token=JWT`
- Setar dois cookies httpOnly na response:
  ```
  access_token  → JWT atual, httpOnly, Secure, SameSite=Strict, MaxAge=8h
  refresh_token → token opaco, httpOnly, Secure, SameSite=Strict, MaxAge=30d
  ```
- Redirecionar para `{FrontendCallbackUrl}` sem parâmetros — o frontend vai ler os cookies automaticamente

Em caso de erro OAuth, redirecionar para `{FrontendCallbackUrl}?error=auth_failed` (este pode continuar na URL pois não é dado sensível).

### Passo 4 — Endpoint de refresh
Crie `POST /auth/refresh`:
- Lê o cookie `refresh_token` da request
- Busca o User pelo refresh token (compare o hash)
- Valida que `RefreshTokenExpiry` não expirou
- Emite novo access token JWT
- Rotaciona o refresh token (gera um novo, invalida o anterior no banco)
- Seta os dois cookies atualizados na response
- Retorna `200 OK` sem body
- Em caso de refresh token inválido ou expirado → retorna `401` e limpa os cookies

### Passo 5 — Endpoint de logout
Crie `POST /auth/logout` (protegido por JWT):
- Limpa `RefreshToken` e `RefreshTokenExpiry` do User no banco
- Expira os dois cookies (`MaxAge=0`)
- Retorna `200 OK`

### Passo 6 — CORS
Para cookies httpOnly funcionarem cross-origin, o CORS precisa estar configurado com:
```csharp
options.AddPolicy("Frontend", policy => policy
    .WithOrigins("http://localhost:5173") // adicionar URL de produção depois
    .AllowCredentials()                   // obrigatório para cookies
    .AllowAnyHeader()
    .AllowAnyMethod());
```
Verifique se já está assim. Se não estiver, ajuste.

---

## 3. Regras que nunca podem ser violadas

- Nunca retornar o JWT no body ou na URL — apenas via cookie httpOnly
- Sempre hashear o refresh token antes de salvar no banco — nunca salvar o valor puro
- Rotacionar o refresh token a cada uso — nunca reutilizar o mesmo
- Cookies devem ter `Secure=true` em produção — use flag de ambiente para desenvolvimento
- O endpoint `/auth/refresh` não exige JWT válido no header — ele existe exatamente para quando o JWT expirou

---

## 4. Ao finalizar

- Liste todos os arquivos criados e modificados
- Mostre os headers de Set-Cookie gerados no callback
- Documente os três endpoints novos/atualizados: callback, refresh, logout
- Liste o que o frontend precisa ajustar para funcionar com cookies ao invés de token na URL