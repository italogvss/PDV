# Manutenção em Produção — Runbook do Kashing

> **Para que serve este documento.** Guia operacional para você fazer deploy de novas versões,
> ler logs, identificar erros e resolver os problemas mais comuns **sozinho**, sem depender de
> ninguém. Leia a seção [Regras de ouro](#0-regras-de-ouro-leia-primeiro) antes de qualquer coisa.
>
> Relacionado: [deploy-producao.md](deploy-producao.md) (como a infra foi montada do zero),
> [subscriptions.md](subscriptions.md) (Stripe), [auth.md](auth.md) (cookies/CORS).

---

## Índice

0. [Regras de ouro](#0-regras-de-ouro-leia-primeiro) · 1. [Mapa da produção](#1-mapa-da-produção) ·
2. [Acesso à VPS](#2-acesso-à-vps) · 3. [Deploy de nova versão](#3-deploy-de-uma-nova-versão)
   ([3.4 Alterar `.env`](#34-alterar-variáveis-de-ambiente-envprod)) ·
4. [Rollback](#4-rollback) · 5. [Migrations de banco](#5-migrations-de-banco--o-ponto-mais-perigoso) ·
6. [Ver logs](#6-ver-logs) · 7. [Identificar erros](#7-identificar-erros) ·
8. [Backup e restore](#8-backup-e-restore) · 9. [Certificado HTTPS](#9-certificado-https) ·
10. [Stripe: teste → live](#10-stripe-modo-teste--live) · 11. [Estender trial dos testers](#11-estender-o-trial-dos-testers) ·
12. [Problemas comuns](#12-problemas-comuns-e-soluções) · 13. [Higiene de disco](#13-higiene-de-disco)

---

## 0. Regras de ouro (leia primeiro)

- **NUNCA apague o banco de produção.** A partir do momento em que tiver clientes reais com dados,
  `docker compose down -v`, `DROP DATABASE`, ou apagar o volume `kashing_mysql_data` = perda total e
  irreversível dos dados dos seus clientes. O `-v` no `down` é o inimigo — **nunca** use `-v` em produção.
- **Migrations são só-pra-frente.** A API roda `db.Database.Migrate()` no startup automaticamente. Uma
  migration que dropa coluna/tabela apaga dados de verdade. Ver [seção 5](#5-migrations-de-banco--o-ponto-mais-perigoso).
- **`.env.prod` e `nginx.prod.conf` vivem só na VPS** (são gitignored). Não estão no GitHub. Se a VPS
  morrer sem backup desses arquivos, você reconstrói os segredos do zero. **Guarde uma cópia deles em
  lugar seguro** (gerenciador de senhas).
- **Sempre teste o deploy logo depois.** O `deploy.sh` já faz um health check no final, mas abra o site
  e faça um login real após cada deploy.
- **Stripe está em modo TESTE de propósito.** Nenhuma cobrança real acontece hoje. Ver [seção 10](#10-stripe-modo-teste--live).

---

## 1. Mapa da produção

| Item | Valor |
|---|---|
| Domínio app | `https://app.kashing.com.br` (frontend + API em `/api`) |
| Domínio landing | `https://www.kashing.com.br` e `https://kashing.com.br` |
| VPS | `179.197.230.243` (Ubuntu 24.04, root) |
| Repo na VPS | `/opt/kashing` (branch `master`) |
| Orquestração | Docker Compose — `docker-compose.prod.yml` |
| Storage | Cloudflare R2 (buckets `profile`, `product`, `service`, `tenant`, `backups`) |
| Banco | MySQL 8, volume Docker `kashing_mysql_data` |

**Containers** (nome fixo, usado em todo comando de log/exec):

| Container | Papel | Porta interna |
|---|---|---|
| `pdv-nginx` | Reverse proxy + TLS | 80/443 (expostas) |
| `pdv-api` | API .NET | 8080 |
| `pdv-frontend` | Frontend React (nginx estático) | 80 |
| `pdv-landingpage` | Landing Astro (nginx estático) | 80 |
| `pdv-db` | MySQL 8 | 3306 |

Fluxo: navegador → `pdv-nginx` (443) → `/api/*` vai pro `pdv-api`, resto vai pro `pdv-frontend`
(no `app.`) ou `pdv-landingpage` (no `www.`).

---

## 2. Acesso à VPS

Do seu Windows (Git Bash ou PowerShell), a partir da raiz do projeto (onde está a chave `id_ed25519`):

```bash
ssh -i ./id_ed25519 root@179.197.230.243
```

> A chave `id_ed25519` é gitignored — **não vá para o GitHub e guarde um backup dela**. Sem ela você
> perde o acesso à VPS.

Depois de entrar, quase tudo acontece dentro de `/opt/kashing`:

```bash
cd /opt/kashing
```

---

## 3. Deploy de uma nova versão

O fluxo tem **dois lados**: seu PC (commitar + push) e a VPS (puxar + rebuildar).

### 3.1 No seu PC

```bash
# valide antes de subir — o build de producao roda o typecheck completo
cd frontend && npm run build        # tsc -b && vite build; tem que passar limpo
cd ../backend && dotnet build        # tem que compilar

# commit e push
git add -A
git commit -m "sua mensagem"
git push origin master
```

> **Por que validar antes?** Em produção o frontend é buildado com `tsc -b` (typecheck real). Um erro
> de tipo que passa no `dotnet watch`/`vite dev` **quebra o build do container** na VPS. Sempre rode
> `npm run build` localmente antes do push.

### 3.2 Na VPS

```bash
cd /opt/kashing
./scripts/deploy.sh
```

O `deploy.sh` faz, em ordem: `git pull` no master → `docker compose up -d --build` (rebuilda as imagens
que mudaram) → limpa imagens órfãs → mostra o commit rodando → **health check** em `/api/health`
(200 = OK). As migrations novas são aplicadas sozinhas quando o `pdv-api` sobe.

Se preferir o comando cru (o que o script faz por baixo):

```bash
cd /opt/kashing
git pull origin master
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker image prune -f
```

### 3.3 Deploy de só um serviço

Se mudou só o backend, dá pra rebuildar só ele (mais rápido, não mexe no frontend):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build api
```

Troque `api` por `frontend`, `landingpage` conforme o caso.

> **Downtime:** o `up --build` recria os containers — alguns segundos de indisponibilidade. Aceitável
> na fase de testes. Não é zero-downtime.

### 3.4 Alterar variáveis de ambiente (`.env.prod`)

**A ação depende de qual variável você mudou** — e mudar a errada sem o passo certo não surte efeito
nenhum. O `.env.prod` fica só na VPS (`/opt/kashing/.env.prod`); edite com `nano .env.prod`.

Há duas categorias:

- **Variáveis de backend** — lidas em **tempo de execução** pela API (injetadas via `env_file`). Basta
  **recriar o container da API**, sem rebuild.
- **Variáveis de frontend/landing** (`VITE_*`, `APP_URL`, `GA_MEASUREMENT_ID`, `PUBLIC_API_URL`) — são
  **build args**, ficam **embutidas no bundle estático** no momento do build. Exigem **rebuildar** o
  container correspondente. Só reiniciar não muda nada.

| Variável que você mudou | Serviço | O que fazer |
|---|---|---|
| `Stripe__*`, `JWT_SECRET`, `JWT_EXPIRES_HOURS`, `Storage__*`, `Authentication__Google__ClientId`, `FRONTEND_URL`, `LANDING_URL`, `DB_CONNECTION_STRING` | `api` (runtime) | recriar a API (sem build) |
| `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_LANDING_URL` | `frontend` (build arg) | **rebuildar** o frontend |
| `APP_URL`, `GA_MEASUREMENT_ID`, `PUBLIC_API_URL` | `landingpage` (build arg) | **rebuildar** a landing |
| `DB_ROOT_PASSWORD`, `DB_NAME` | `db` | ⚠️ **não mude com o banco já criado** (ver aviso abaixo) |

**Recriar só a API** (para as variáveis de backend):

```bash
cd /opt/kashing
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate api
```

**Rebuildar frontend ou landing** (para os `VITE_*` / `PUBLIC_*`):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build frontend
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build landingpage
```

> ⚠️ **NUNCA mude `DB_ROOT_PASSWORD` ou `DB_NAME` com o banco já em uso.** A senha e o nome do banco só
> são aplicados no MySQL na **primeira** criação do volume `kashing_mysql_data`. Mudar depois **não altera
> a senha real** do MySQL — só quebra a conexão da API com o banco (a connection string passa a não bater
> com a senha que está gravada no volume). Se um dia precisar trocar a senha do banco, é um procedimento à
> parte (`ALTER USER` dentro do MySQL **e** atualizar a connection string juntos), não é só editar o `.env`.

---

## 4. Rollback

Se um deploy quebrou produção, volte para o commit anterior. Descubra o commit bom:

```bash
cd /opt/kashing
git log --oneline -10        # ache o hash do ultimo commit que funcionava
```

Volte para ele:

```bash
./scripts/deploy.sh <hash-do-commit>     # ex.: ./scripts/deploy.sh 34b3b90
```

Para voltar ao fluxo normal depois (sair do commit fixo e seguir o master de novo):

```bash
./scripts/deploy.sh                       # sem argumento = volta pro master atualizado
```

> Rollback de **código** é fácil. Rollback de **migration de banco** não é — se a versão ruim rodou uma
> migration destrutiva, o rollback de código não traz os dados de volta. Ver [seção 5](#5-migrations-de-banco--o-ponto-mais-perigoso).

---

## 5. Migrations de banco — o ponto mais perigoso

A API roda **`db.Database.Migrate()` automaticamente no startup** (`Program.cs`). Ou seja: qualquer
migration nova entra no banco de produção assim que o `pdv-api` sobe no deploy. Não há passo manual — o
que também significa que **não há uma segunda chance de revisar**.

**Antes de criar/commitar qualquer migration, pense:**

- Ela **dropa** coluna, tabela ou renomeia algo? Isso **apaga dados reais** dos seus clientes. Renomear
  coluna no EF Core costuma virar drop + add (perde o conteúdo).
- Ela adiciona coluna `NOT NULL` sem default numa tabela com dados? Falha ou preenche com lixo.
- **Prefira migrations aditivas** (adicionar coluna/tabela nullable). Para remover algo, faça em duas
  etapas separadas por semanas: primeiro pare de usar no código, só muito depois remova a coluna.

**Sempre teste a migration contra uma cópia do banco de produção antes de subir** — restaure um backup
localmente (ver [seção 8](#8-backup-e-restore)) e rode a migration contra ele.

Ver o histórico de migrations aplicadas:

```bash
docker exec pdv-db mysql -u root -p"$DB_ROOT_PASSWORD" pdv -e "SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId DESC LIMIT 10;"
# (a senha esta no /opt/kashing/.env.prod, variavel DB_ROOT_PASSWORD)
```

> **Sempre tire um backup manual imediatamente antes de um deploy que contém migration** (ver
> [seção 8.3](#83-backup-manual-sob-demanda)).

---

## 6. Ver logs

Todos os logs vêm dos containers via `docker logs`. Rode na VPS.

```bash
# ultimas 100 linhas da API (onde ficam os erros de backend)
docker logs pdv-api --tail 100

# acompanhar em tempo real (Ctrl+C sai) — util enquanto reproduz um bug
docker logs pdv-api -f

# so o que aconteceu nos ultimos 15 minutos
docker logs pdv-api --since 15m

# nginx (erros de proxy, 502, 404 de rota)
docker logs pdv-nginx --tail 100

# banco (erros de conexao, migration falhando no startup da api aparecem no pdv-api)
docker logs pdv-db --tail 100
```

Buscar por erro dentro dos logs:

```bash
docker logs pdv-api --tail 500 2>&1 | grep -i "error\|exception\|fail"
```

> A API loga exceções não tratadas e o `ExceptionMiddleware`. Erros de negócio (400/402/404) são
> esperados e não são bug. Procure por `Exception`, `Unhandled`, stack traces.

---

## 7. Identificar erros

### 7.1 Onde o erro está? (mapa rápido)

| Sintoma no navegador | Provável origem | Onde olhar |
|---|---|---|
| Tela branca / não carrega | Frontend não buildou ou nginx caiu | `docker logs pdv-frontend`, `docker logs pdv-nginx` |
| `404` numa chamada `/api/...` | Rota errada ou nginx | `docker logs pdv-nginx`, [seção 12.1](#121-404-em-todas-as-rotas-da-api) |
| `500` numa chamada `/api/...` | Bug no backend | `docker logs pdv-api` (procure a stack trace) |
| `401` ao logar / desloga sozinho | Cookie/JWT/HTTPS | [auth.md](auth.md), confira se está em `https://` |
| `402` ao usar uma função | Plano não cobre (esperado) | Não é bug — é o gating de plano |
| Imagem não aparece / erro no upload | R2 (bucket, CORS, assinatura) | [seção 12.3](#123-imagem-não-sobe-ou-não-aparece-r2) |
| Erro no login com Google | Config do Google Cloud | [seção 12.4](#124-erro-no-login-com-google) |

### 7.2 A stack está de pé?

```bash
docker compose -f /opt/kashing/docker-compose.prod.yml ps
```

Todos devem estar `Up`; o `pdv-db` deve estar `Up (healthy)`. Se algum estiver `Restarting` ou `Exited`,
olhe o log dele — algo está crashando no boot.

### 7.3 Health checks

```bash
# rapido, da propria VPS
curl -s -o /dev/null -w "%{http_code}\n" https://app.kashing.com.br/api/health   # espera 200

# detalhado (banco + storage) — precisa de login de admin, mas o /health simples ja indica o basico
```

O `/api/health` verifica banco (`mysql`) e storage (`storage`). Se der `503`, um dos dois está fora — o
log da API dirá qual.

---

## 8. Backup e restore

### 8.1 Como funciona hoje

- Script `scripts/backup-db.sh` roda **todo dia às 3h** via cron (dump do MySQL → gzip → `/backups/` na
  VPS → cópia para o bucket R2 `backups`).
- Retenção local: 14 dias. As credenciais e variáveis do backup ficam em `/opt/kashing/.env.backup`.
- Ver o log da última execução: `cat /var/log/kashing-backup.log`.
- Ver os backups locais: `ls -lh /backups/`.

> **Pendência conhecida:** o bucket `backups` no R2 precisa existir e o token de API precisa ter escrita
> nele, senão o dump fica só local (o envio para o R2 falha silenciosamente no log). Confira em
> `/var/log/kashing-backup.log` se aparece `upload failed ... NoSuchBucket`. Enquanto não criar o bucket,
> **o backup existe só na VPS** — se a VPS morrer, você perde tudo. Crie o bucket `backups` no R2 assim
> que possível.

### 8.2 Restore (recuperar de um backup)

> **Cuidado:** restaurar **sobrescreve** o banco atual. Só faça isso sabendo o que está fazendo.

```bash
# na VPS — descompacta e injeta no MySQL (troque a data pelo arquivo desejado)
gunzip -c /backups/pdv-2026-07-21.sql.gz | docker exec -i pdv-db mysql -u root -p"$DB_ROOT_PASSWORD" pdv
# (pegue a senha em /opt/kashing/.env.prod, DB_ROOT_PASSWORD)
```

Para **testar uma migration** sem risco, baixe um backup para sua máquina e restaure num MySQL local, em
vez de mexer no de produção.

### 8.3 Backup manual (sob demanda)

Antes de um deploy com migration, ou antes de qualquer operação arriscada:

```bash
cd /opt/kashing
bash -c 'set -a; source .env.backup; set +a; ./scripts/backup-db.sh'
ls -lh /backups/     # confirme que o arquivo do dia apareceu
```

---

## 9. Certificado HTTPS

- Emitido pelo Let's Encrypt (certbot), renova **sozinho** via `systemd timer` (`certbot.timer`).
- Validade atual: **até 18/10/2026** (renova automaticamente ~30 dias antes).
- Um hook recarrega o nginx após a renovação (`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`).

Conferir validade a qualquer momento:

```bash
echo | openssl s_client -connect app.kashing.com.br:443 -servername app.kashing.com.br 2>/dev/null | openssl x509 -noout -enddate
```

Forçar uma renovação de teste (não altera nada, só valida que funciona):

```bash
certbot renew --dry-run
```

> Se em algum momento o certificado expirar (não deveria, mas se o timer falhar), o site fica inacessível
> por HTTPS e **o login para de funcionar** (cookies são `Secure`). Renovar na mão: `certbot renew`
> seguido de `docker exec pdv-nginx nginx -s reload`.

---

## 10. Stripe: modo teste → live

**Hoje o Stripe está em modo TESTE** (`sk_test_...` no `.env.prod`). Isso é intencional: seus testers
usam o sistema sem risco de cobrança real, porque:

1. A chave é de teste — o checkout não aceita cartão real, só cartões de teste.
2. Você vai **estender o trial** deles ([seção 11](#11-estender-o-trial-dos-testers)), então nem chegam
   na tela de pagamento.

### Quando for para live (com CNPJ)

> **Aviso crítico sobre CPF vs CNPJ:** uma conta Stripe verificada como pessoa física **não pode** ser
> convertida para CNPJ depois — e clientes/assinaturas **não migram** entre contas Stripe diferentes.
> Só vá para modo **live** de verdade depois de ter a conta certa (CNPJ), senão você paga o preço de
> migrar tudo na mão depois. Em modo teste isso não importa.

Passos para virar live, **editando `/opt/kashing/.env.prod`** na VPS:

1. Troque `Stripe__ApiKey` para a chave `sk_live_...`.
2. Troque os 4 `Stripe__Prices__*` pelos IDs `price_...` **do modo live** (criados via "copiar para live"
   no Dashboard ou rodando o bootstrap com a chave live — os IDs de teste não existem em live).
3. Crie o endpoint de webhook no Dashboard (modo live) apontando para
   `https://app.kashing.com.br/api/webhooks/stripe`, com estes eventos: `invoice.paid`,
   `invoice.payment_failed`, `charge.succeeded`, `charge.refunded`, `charge.dispute.created`,
   `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   Copie o `whsec_...` gerado para `Stripe__WebhookSecret`.
4. Recrie só a API (ver [seção 3.4](#34-alterar-variáveis-de-ambiente-envprod) — são variáveis de
   backend, sem `--build`):
   `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate api`.

> Editar o `.env.prod` e recriar o container basta — a chave/preços são lidos do ambiente, não estão
> compilados no código.

---

## 11. Estender o trial dos testers

Enquanto o Stripe está em teste, os testers não devem cair na tela de "assinatura expirada". O trial dura
30 dias (`Subscription.TrialEndsAt`). Para dar mais tempo, atualize a data direto no banco.

Ache a assinatura do tester (pelo email do dono):

```bash
docker exec pdv-db mysql -u root -p"$DB_ROOT_PASSWORD" pdv -e "
  SELECT s.Id, u.Email, s.Status, s.TrialEndsAt
  FROM Subscriptions s JOIN Users u ON u.Id = s.UserId
  WHERE u.Email = 'tester@exemplo.com';"
```

Estenda (ex.: para daqui a 1 ano) — troque o Id pela assinatura certa:

```bash
docker exec pdv-db mysql -u root -p"$DB_ROOT_PASSWORD" pdv -e "
  UPDATE Subscriptions
  SET TrialEndsAt = DATE_ADD(NOW(), INTERVAL 365 DAY), Status = 'Trialing'
  WHERE Id = 'cole-o-id-aqui';"
```

> `Status = 'Trialing'` garante que a assinatura conte como ativa. O `SubscriptionExpiryBackgroundService`
> marca trials vencidos como `Expired` — com a data lá na frente, isso não acontece. Confirme com o SELECT
> depois. **Faça um backup antes de rodar UPDATE em produção** ([seção 8.3](#83-backup-manual-sob-demanda)).

---

## 12. Problemas comuns e soluções

Estes são os problemas que **já aconteceram** neste deploy — se reaparecerem, já sabe a causa.

### 12.1 `404` em todas as rotas da API

**Causa:** o `nginx.prod.conf` estava removendo o prefixo `/api/` antes de repassar para a API (os
controllers usam `[Route("api/...")]`, então precisam do prefixo). O `proxy_pass http://api_backend/`
(com barra no final) tira o prefixo; `proxy_pass http://api_backend` (sem barra) mantém.

**Solução:** no bloco `location /api/` do `nginx.prod.conf`, use `proxy_pass http://api_backend;`
(sem barra final). O `/api/health` tem um `location` próprio que aponta para `/health` (rota anônima sem
prefixo). Depois de editar: copie para a VPS e `docker exec pdv-nginx nginx -t && docker exec pdv-nginx nginx -s reload`.

> Lembre: `nginx.prod.conf` é gitignored. Na VPS há uma cópia `nginx.prod.conf.full` (com HTTPS) que é a
> versão "boa". Se editar localmente, precisa copiar via `scp` para a VPS.

### 12.2 Login funciona mas desloga / `401`

**Causa:** cookies de sessão são `Secure=true` em produção — só funcionam sob HTTPS. Se acessar por
`http://` ou o certificado estiver com problema, o login não gruda.

**Solução:** garanta que está em `https://app.kashing.com.br` e que o certificado é válido
([seção 9](#9-certificado-https)).

### 12.3 Imagem não sobe ou não aparece (R2)

Três causas diferentes que já apareceram:

1. **Bucket não existe.** O código usa buckets no **singular**: `profile`, `product`, `service`,
   `tenant` (do enum `MediaCategory`). Se criou como `products`/`employees` (plural, seguindo doc antiga),
   o upload dá `403`/`NoSuchBucket`. Crie os buckets com os nomes exatos e garanta que o token de API
   tem leitura/escrita neles.
2. **CORS.** Cada bucket (`profile`, `product`, `service`, `tenant`) precisa de policy CORS liberando
   `GET`/`PUT` e **headers**, senão o preflight `OPTIONS` falha:
   ```json
   [{ "AllowedOrigins": ["https://app.kashing.com.br"], "AllowedMethods": ["GET","PUT"], "AllowedHeaders": ["*"] }]
   ```
3. **`SignatureDoesNotMatch` no GET.** Era um bug do código (parâmetro `&v=` anexado depois de assinar a
   URL — MinIO tolerava, R2 não). **Já corrigido** em `MinioStorageService.GenerateReadUrlAsync`. Se
   reaparecer, é sinal de que alguém readicionou um parâmetro à URL depois da assinatura.

**Diagnóstico rápido do R2** (na VPS, usando as credenciais do `.env.prod`):

```bash
export AWS_ACCESS_KEY_ID="<Storage__AccessKey do .env.prod>"
export AWS_SECRET_ACCESS_KEY="<Storage__SecretKey do .env.prod>"
aws s3 ls s3://tenant --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com --region auto
```

### 12.4 Erro no login com Google

Tudo se resolve no **Google Cloud Console**, no projeto **kashing** (não o `pdv-ultra` de dev):

- **`origin_mismatch` / "registre a origem JavaScript":** APIs e serviços → Credenciais → o OAuth Client
  → adicione `https://app.kashing.com.br` em "Origens JavaScript autorizadas".
- **`org_internal` (403):** Tela de consentimento OAuth → mude "Tipo de usuário" de **Interno** para
  **Externo**. Em modo "Teste", só contas adicionadas em "Usuários de teste" conseguem logar (limite
  100); ou publique o app.
- **`play.google.com/log` no console:** é telemetria interna do Google, **não é erro seu** — ignore.

### 12.5 `app.` mostra a landing (ou `www.` mostra o app) — rotas trocadas

**Causa:** o nginx resolve o IP dos upstreams (`frontend`, `landingpage`, `api`) **uma vez, no start**.
Quando um deploy recria esses containers, eles ganham IPs novos (e o Docker pode até trocar os IPs entre
`frontend` e `landingpage`). Se o `pdv-nginx` não for reiniciado, ele fica com os IPs velhos e passa a
rotear `app.` → landing e `www.` → app. O `/api/health` continua funcionando (o bloco `/api/` acerta),
então o sintoma é só a UI trocada.

**Solução:** reiniciar o nginx para re-resolver os IPs:
```bash
docker restart pdv-nginx
```
O `scripts/deploy.sh` já faz isso automaticamente no fim de todo deploy — só cai nesse problema se subir
a stack na mão sem reiniciar o nginx depois.

### 12.6 Um container fica reiniciando (`Restarting`)

```bash
docker logs pdv-api --tail 50      # veja o motivo do crash no boot
```

Causas comuns: `.env.prod` com variável faltando (a API dá `throw` no startup se faltar `JWT_SECRET`,
`Stripe:ApiKey`, `FRONTEND_URL`), banco não subiu ainda, ou migration falhando.

---

## 13. Higiene de disco

Cada `--build` acumula camadas e cache. Com o tempo o disco enche. Verifique e limpe periodicamente:

```bash
df -h /                    # uso do disco (hoje ~15%, folga grande)
docker system df           # quanto o Docker está usando

# limpar imagens/cache orfaos (seguro — nao toca em container rodando nem em volume)
docker image prune -f
docker builder prune -f    # limpa cache de build (pode liberar varios GB)
```

> **NUNCA** rode `docker system prune --volumes` ou `docker volume rm` em produção — apagaria o volume
> `kashing_mysql_data` (o banco). `docker image prune` e `docker builder prune` são seguros.

---

## Resumo dos comandos que você mais vai usar

```bash
# entrar na VPS
ssh -i ./id_ed25519 root@179.197.230.243

# deploy de nova versao (na VPS)
cd /opt/kashing && ./scripts/deploy.sh

# rollback
cd /opt/kashing && ./scripts/deploy.sh <hash-do-commit>

# ver logs da API
docker logs pdv-api --tail 100 -f

# status da stack
docker compose -f /opt/kashing/docker-compose.prod.yml ps

# health check
curl -s -o /dev/null -w "%{http_code}\n" https://app.kashing.com.br/api/health

# backup manual
cd /opt/kashing && bash -c 'set -a; source .env.backup; set +a; ./scripts/backup-db.sh'
```
