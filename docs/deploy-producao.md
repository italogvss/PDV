# Deploy em Produção — Roadmap e Checklist

> **Documento de manutenção.** Registra o estado atual da stack de produção do Kashing (o que já existe e
> funciona), as lacunas identificadas para o primeiro deploy público e as decisões de infraestrutura já
> tomadas. Serve como checklist de execução e como referência para revisitar decisões depois.
>
> Relacionado: [subscriptions.md](subscriptions.md) (Stripe), [auth.md](auth.md) (cookies/CORS),
> [politica-de-privacidade-v2.md](politica-de-privacidade-v2.md) (menção a provedor de storage).

## Índice

1. [Estado atual](#1-estado-atual) · 2. [Decisões de infraestrutura](#2-decisões-de-infraestrutura) ·
3. [Lacunas encontradas](#3-lacunas-encontradas) · 4. [Mudança de código — região do storage](#4-mudança-de-código--região-do-storage) ·
5. [Checklist — Cloudflare R2](#5-checklist--cloudflare-r2) · 6. [Checklist — VPS e domínio](#6-checklist--vps-e-domínio) ·
7. [Checklist — HTTPS (Let's Encrypt)](#7-checklist--https-lets-encrypt) · 8. [Checklist — `.env.prod`](#8-checklist--envprod) ·
9. [Bug conhecido — landing page](#9-bug-conhecido--landing-page) · 10. [Integrações externas](#10-integrações-externas-teste--produção) ·
11. [Backup](#11-backup) · 12. [Fora de escopo (por ora)](#12-fora-de-escopo-por-ora) · 13. [Verificação pós-deploy](#13-verificação-pós-deploy) ·
14. [Atualizações e rollback](#14-atualizações-e-rollback)

---

## 1. Estado atual

A arquitetura de produção já foi desenhada antes deste levantamento — não é um projeto do zero:

- `docker-compose.prod.yml` (raiz): stack completa — `nginx` (reverse proxy), `api` (.NET, target `final`),
  `frontend` (build estático via nginx), `landingpage` (build estático via nginx), `db` (MySQL 8).
- `nginx.prod.conf` (raiz, gitignored): roteia `app.<domínio>` → API (`/api/*`) + frontend (resto), e
  `www.<domínio>`/`<domínio>` → landing page.
- `.env.prod.example` (raiz): template de variáveis de produção, consumido via `env_file`.
- O código já foi escrito pensando em produção:
  - Cookies de sessão (`access_token`, `refresh_token`) já são `Secure=true` condicionalmente a
    `ASPNETCORE_ENVIRONMENT=Production` (`AuthController.cs`, `TenantController.cs`) e `SameSite=Strict`.
  - CORS restrito a uma única origem via `FRONTEND_URL`/`LANDING_URL` (env var, obrigatória — `Program.cs`).
  - Nenhum secret hardcoded — tudo lido de variável de ambiente, com `throw` explícito quando falta
    (`JWT_SECRET`, `Stripe:ApiKey`, `FRONTEND_URL`).
  - `IStorageService`/`MinioStorageService` já foi desenhado para "MinIO em dev, S3 em prod" — mesmo client
    quando `Endpoint == PublicEndpoint`.

Ou seja: a maior parte do trabalho de arquitetura para produção já está feita. O que falta é fechar lacunas
pontuais e provisionar a infraestrutura externa (VPS, domínio, storage, certificado).

---

## 2. Decisões de infraestrutura

Decisões já tomadas (2026-07-17) para o primeiro deploy:

| Decisão | Escolha |
|---|---|
| Domínio | **kashing.com.br** (registro.br) — já registrado |
| VPS | Já provisionada, chave SSH já configurada; Docker Engine/Compose ainda não instalados |
| Storage de arquivos em produção | **Cloudflare R2** (S3-compatível, sem custo de egress) — buckets já criados |
| Certificado HTTPS | **Let's Encrypt via certbot**, direto na VPS (sem Cloudflare proxy na frente) |
| Backup automático do banco | Incluído já no primeiro deploy (não adiado) |

---

## 3. Lacunas encontradas

| # | Lacuna | Impacto | Status |
|---|---|---|---|
| 1 | `nginx.prod.conf` só escuta na porta 80, sem certificado | **Bloqueante** — cookies `Secure=true` não são aceitos sem HTTPS, login não funciona | ✅ Blocos 443 + redirect adicionados (§7). Falta só emitir o certificado real na VPS. |
| 2 | Nenhum serviço de storage configurado para produção (`docker-compose.prod.yml` não tem MinIO nem variáveis `Storage__*` em `.env.prod.example`) | **Bloqueante** — upload de imagens quebrado | ✅ `Storage__*` (R2) adicionado ao `.env.prod.example`; `Storage__Region` implementado no código (§4). Falta preencher as credenciais reais. |
| 3 | `.env.prod` real (local) não tem `Stripe__*` nem `Storage__*` preenchidos | **Bloqueante** — API dá `throw` no startup por falta de `Stripe:ApiKey` | ⏳ Pendente — depende de criar o `.env.prod` real na VPS com valores de produção. |
| 4 | `docker-compose.prod.yml` não passa `PUBLIC_API_URL` como build arg pro serviço `landingpage` | Páginas de Termos/Privacidade da landing caem no fallback `http://localhost:5000/api` em produção | ✅ Corrigido (§9). |
| 5 | Nenhuma rotina de backup do MySQL | Risco de perda total de dados em caso de falha da VPS | ✅ `scripts/backup-db.sh` criado (§11). Falta agendar via crontab na VPS. |
| 6 | `docs/politica-de-privacidade-v2.md` cita "Amazon S3" como provedor de storage | Desalinhado com a implementação real (MinIO/R2) | ⏳ Pendente (baixa prioridade, ver §12). |

---

## 4. Mudança de código — região do storage

`MinioStorageService.cs` hoje hardcoda `AuthenticationRegion = "us-east-1"` no `AmazonS3Config`. A Cloudflare
recomenda `region: auto` para a assinatura SigV4 no R2 — usar um valor fixo arrisca `SignatureDoesNotMatch`
em produção.

Mudança necessária:
- `StorageOptions.cs`: novo campo `Region` (default `"us-east-1"`, mantém dev/MinIO funcionando sem mudança).
- `MinioStorageService.BuildClient`: usar `_options.Region` em vez do literal.
- `.env.example` / `.env.prod.example`: documentar `Storage__Region` (dev = `us-east-1`, prod/R2 = `auto`).

Nenhuma outra mudança de código é necessária para trocar o storage de MinIO para R2.

---

## 5. Checklist — Cloudflare R2

- [x] Criar/ativar conta Cloudflare com R2.
- [x] Criar os 3 buckets usados pela aplicação: `products`, `expenses`, `employees`.
- [ ] Criar também o bucket `backups` (usado pelo `scripts/backup-db.sh`, §11).
- [ ] Gerar API Token com escopo **"Object Read & Write"** restrito a esses 4 buckets (não "Admin").
  > O token de escopo restrito não pode criar bucket em runtime — `EnsureBucketExistsAsync` falharia se o
  > bucket não existir. Por isso os buckets precisam existir **antes** do primeiro deploy.
- [ ] Configurar CORS em cada bucket (dashboard → bucket → Settings → CORS), liberando `PUT`/`GET` para
  `https://app.<domínio>` — equivalente ao `MINIO_API_CORS_ALLOW_ORIGIN` que hoje só existe em dev.
- [ ] Anotar: Account ID, Access Key ID, Secret Access Key, endpoint
  (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).

---

## 6. Checklist — VPS e domínio

- [x] Registrar um domínio — **kashing.com.br**.
- [x] Provisionar VPS Ubuntu 22.04/24.04 (2 vCPU / 4GB RAM é confortável para MySQL + API + 2 nginx estáticos
  + reverse proxy). Chave SSH já configurada.
- [ ] Instalar Docker Engine + Docker Compose plugin na VPS (ainda pendente).
- [ ] Clonar o repo na VPS (ex.: `/opt/kashing`) — é onde `scripts/deploy.sh` roda e onde `.env.prod` real
  vai viver (nunca commitado, criado direto na VPS a partir do `.env.prod.example`).
- [ ] Criar 3 registros DNS tipo A apontando para o IP da VPS: `app.kashing.com.br`, `www.kashing.com.br`,
  `kashing.com.br` (apex). Não é necessário registro para storage — o R2 já serve com TLS próprio.
- [ ] Abrir portas 80 e 443 no firewall da VPS.

---

## 7. Checklist — HTTPS (Let's Encrypt)

Arquivos envolvidos: `nginx.prod.conf` (raiz) e `docker-compose.prod.yml`.

- [x] Em cada `server { listen 80; }` do `nginx.prod.conf`, adicionar
  `location /.well-known/acme-challenge/ { root /var/www/certbot; }` (desafio HTTP-01) e redirecionar o
  resto para HTTPS (`return 301 https://$host$request_uri;`).
- [x] Adicionar blocos `listen 443 ssl;` correspondentes, com `ssl_certificate`/`ssl_certificate_key`
  apontando para `/etc/letsencrypt/live/kashing.com.br/{fullchain,privkey}.pem`.
- [x] Adicionar headers de segurança nos blocos 443: `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`.
- [x] `docker-compose.prod.yml`: expor `443:443` no serviço `nginx`; montar
  `/etc/letsencrypt:/etc/letsencrypt:ro` e um webroot compartilhado (`./certbot-webroot:/var/www/certbot:ro`).
- [ ] **Ordem de bootstrap importa**: os blocos 443 do `nginx.prod.conf` já referenciam
  `/etc/letsencrypt/live/kashing.com.br/...`, que não existe até o certbot emitir o certificado — o nginx
  vai falhar ao subir se tentar carregar os blocos 443 antes disso. Na primeira subida: comente
  temporariamente os dois blocos `listen 443 ssl` (deixe só os `listen 80`), suba a stack, rode o certbot
  em modo webroot (próximo item), depois descomente os blocos 443 e rode `docker compose ... up -d --build`
  de novo (ou `docker exec pdv-nginx nginx -s reload`).
- [ ] No host (fora do Docker): `apt install certbot`; emitir o certificado inicial em modo webroot:
  `certbot certonly --webroot -w ./certbot-webroot -d app.kashing.com.br -d www.kashing.com.br -d kashing.com.br`.
- [ ] Configurar hook de renovação (`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`) rodando
  `docker exec pdv-nginx nginx -s reload` — o certbot já instala o timer/cron de renovação automática.

---

## 8. Checklist — `.env.prod`

O `.env.prod.example` já foi atualizado com as chaves novas (`Storage__*`, `APP_URL`, `GA_MEASUREMENT_ID`,
`PUBLIC_API_URL`). Falta criar o `.env.prod` real na VPS a partir dele, preenchendo:

- [ ] `JWT_SECRET`: gerar novo, aleatório, ≥32 chars — não reaproveitar o de dev (`openssl rand -base64 48`).
- [ ] `DB_ROOT_PASSWORD` / `DB_CONNECTION_STRING`: senha forte nova.
- [ ] `FRONTEND_URL=https://app.kashing.com.br`, `LANDING_URL=https://www.kashing.com.br`.
- [ ] `Storage__Endpoint` / `Storage__PublicEndpoint` = `<ACCOUNT_ID>.r2.cloudflarestorage.com` (mesmo valor
  nos dois — sem split interno/externo, diferente do dev com MinIO), `Storage__AccessKey`,
  `Storage__SecretKey` (do token do bucket, §5), `Storage__UseSSL=true`, `Storage__Region=auto`.
- [ ] `Stripe__ApiKey=sk_live_...`, `Stripe__WebhookSecret=whsec_...` (do endpoint de produção, §10),
  `Stripe__Prices__*` com IDs **live** (os de teste não existem no modo live — reexecutar o bootstrap).
- [ ] `Authentication__Google__ClientId`: Client ID de produção (§10).
- [ ] `VITE_API_URL=/api`, `VITE_GOOGLE_CLIENT_ID`, `VITE_LANDING_URL=https://www.kashing.com.br`.
- [ ] Novas para a landing: `APP_URL=https://app.kashing.com.br`, `GA_MEASUREMENT_ID` (se houver Analytics),
  `PUBLIC_API_URL=https://app.kashing.com.br/api` (ver §9 — já corrigido no código).

---

## 9. Bug conhecido — landing page

✅ **Corrigido.** `docker-compose.prod.yml`, serviço `landingpage`, bloco `args:` agora inclui
`PUBLIC_API_URL: ${PUBLIC_API_URL}`. Sem isso, `landingpage/src/pages/termos-de-uso.astro` e
`politica-de-privacidade.astro` caíam no fallback `http://localhost:5000/api` em produção. Falta apenas
definir `PUBLIC_API_URL` no `.env.prod` real (§8).

---

## 10. Integrações externas — teste → produção

- **Stripe**: recriar produtos/preços em modo live (reexecutar `.claude/stripe-bootstrap/bootstrap.ps1` com
  `sk_live_...`); criar endpoint de webhook de produção no Dashboard apontando para
  `https://app.kashing.com.br/api/webhooks/stripe`; copiar o `whsec_...` gerado para `.env.prod`.
- **Google Sign-In**: no Google Cloud Console, adicionar `https://app.kashing.com.br` às origens JavaScript
  autorizadas do OAuth Client (usar o client existente ou criar um dedicado a produção).

---

## 11. Backup

Como o storage de arquivos passa a ser gerenciado pela Cloudflare (R2), o único dado que precisa de backup
próprio é o **MySQL**.

- [x] Script na VPS: `scripts/backup-db.sh` (já criado no repo) — dump + gzip, rotação de 14 dias, cópia
  para o bucket R2 `backups` via `aws-cli` (`aws s3 cp ... --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
- [ ] Criar o bucket `backups` no R2 (ver §5) e garantir que o token S3 tem escopo de escrita nele.
- [ ] Instalar `aws-cli` na VPS (`apt install awscli` ou `pip install awscli`) e exportar
  `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` (mesmas credenciais do `Storage__AccessKey`/`SecretKey`) e
  `R2_ACCOUNT_ID`, `DB_ROOT_PASSWORD`, `DB_NAME` no ambiente que chama o script (ex. via `crontab` ou um
  `.env` próprio carregado antes de rodar).
- [ ] Agendar via `crontab -e` na VPS (ex. diário às 3h):
  `0 3 * * * /opt/kashing/scripts/backup-db.sh >> /var/log/kashing-backup.log 2>&1`.
- [ ] Documentar o passo a passo de restore:
  `docker exec -i pdv-db mysql -u root -p"$DB_ROOT_PASSWORD" "$DB_NAME" < dump.sql`.

---

## 12. Fora de escopo (por ora)

- **CI/CD automatizado** — hoje o deploy é manual (`docker compose -f docker-compose.prod.yml --env-file
  .env.prod up -d --build`). Aceitável para a fase de testes/piloto.
- **Rate limiting no nginx** (proteção de força bruta no login) — considerar depois do ar.
- **Senha hardcoded `Password=admin`** em `AppDbContextFactory.cs` — fallback usado só por `dotnet ef`
  local (design-time), nunca em produção. Baixo risco, cosmético.
- Redação de `politica-de-privacidade-v2.md` sobre o provedor de storage ("Amazon S3") — vale trocar para
  uma redação genérica ("provedor de armazenamento de objetos compatível com S3") para não precisar editar
  o texto legal a cada troca de infraestrutura.

---

## 13. Verificação pós-deploy

1. `./scripts/deploy.sh` (ou `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
   diretamente) sobe sem erro.
2. `https://app.kashing.com.br` carrega o frontend; `https://app.kashing.com.br/api/health` responde 200.
3. Login (local e Google) funciona — confirma que os cookies `Secure` estão sendo aceitos.
4. Upload de imagem de produto funciona ponta a ponta (presigned URL → PUT direto no R2 → confirm) — valida
   CORS do bucket e a assinatura com `Storage__Region`.
5. `https://www.kashing.com.br/termos-de-uso` carrega sem erro de rede (valida o fix do `PUBLIC_API_URL`).
6. Disparar um evento de teste do Dashboard Stripe (modo live) contra o endpoint de produção; checar log/200.
7. Rodar `scripts/backup-db.sh` manualmente uma vez; confirmar que o dump aparece localmente e no bucket
   `backups`.
8. `curl -I http://app.kashing.com.br` retorna redirect 301 para https.

---

## 14. Atualizações e rollback

A partir do primeiro deploy, novas versões sobem via `scripts/deploy.sh` (criado neste levantamento) — não
há CI/CD automatizado (§12 mantém essa decisão), o gatilho é sempre manual e deliberado.

**Convenção de release.** Sem registry de imagens (o `docker-compose.prod.yml` builda tudo localmente a
partir do código-fonte), a unidade de versão é uma **tag git** (`vX.Y.Z`) no `master`. Quando algo está
pronto para produção:

```bash
git tag v1.1.0
git push --tags
```

**Onde o repo vive na VPS.** Clonado uma vez em `/opt/kashing` (ajustar o caminho se preferir outro). É
nesse clone que `scripts/deploy.sh` roda e onde `.env.prod` (gitignored, nunca commitado) fica.

**Deploy:**
```bash
cd /opt/kashing
./scripts/deploy.sh v1.1.0     # sobe a tag v1.1.0
./scripts/deploy.sh            # sobe a tag mais recente (git describe --tags --abbrev=0)
```
O script faz `git fetch --tags` → `git checkout <tag>` → `docker compose ... up -d --build` → limpa imagens
órfãs → imprime a versão que ficou rodando. A API roda `db.Database.Migrate()` automaticamente no startup
(`Program.cs`), então migrations novas já são aplicadas nesse mesmo passo, sem comando extra.

**Rollback:** mesmo script, tag anterior — `./scripts/deploy.sh v1.0.9`. Não é zero-downtime (o
`up --build` recria os containers, alguns segundos de indisponibilidade), aceitável para a fase de piloto.

**Acesso do Claude à VPS — sob demanda, não permanente.** Não instalar o Claude Code como processo de
longa duração na VPS. O modelo é: você pede explicitamente, numa conversa, para uma ação pontual ser feita
na VPS (ex. "confere o log do nginx", "ajusta o crontab do backup") — a sessão local do Claude Code
conecta via SSH, executa e termina; nunca fica um agente rodando sozinho em background no servidor.
Recomendado:
- Chave SSH **dedicada** para isso (não reaproveitar a chave pessoal).
- Usuário não-root na VPS (ex. `deploy`, no grupo `docker`) em vez de `root`, limitando o raio de ação.
- Se preferir também abrir uma sessão interativa do Claude Code diretamente dentro da VPS (você mesmo
  entra por SSH e roda `claude` lá), a mesma regra vale: sempre sessão pontual, nunca daemon autônomo.
