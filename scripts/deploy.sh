#!/usr/bin/env bash
# =============================================================
# Kashing - Deploy/rollback em producao
#
# Roda NA VPS, dentro do clone do repo (/opt/kashing).
#
# Uso:
#   ./scripts/deploy.sh                # deploy: puxa o ultimo master e rebuilda tudo
#   ./scripts/deploy.sh <commit|tag>   # rollback: volta para um commit/tag especifico
#
# .env.prod e nginx.prod.conf sao gitignored e vivem so na VPS —
# git pull/checkout nunca os toca.
# =============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.prod ]; then
  echo "ERRO: .env.prod nao encontrado em $(pwd). Abortando." >&2
  exit 1
fi

git fetch --all --tags --prune

if [ -n "${1:-}" ]; then
  echo "==> ROLLBACK para: $1"
  git checkout "$1"
else
  echo "==> Deploy: atualizando master"
  git checkout master
  git pull --ff-only origin master
fi

echo "==> Build e restart dos containers"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# O nginx resolve os IPs dos upstreams (frontend/landingpage/api) UMA vez, no start.
# Quando o build acima recria esses containers, eles ganham IPs novos — e o Docker pode
# ate trocar os IPs entre eles. Como o compose nao recria o nginx (config dele nao mudou),
# ele fica com IPs velhos e passa a rotear para o container errado (app<->landing trocados).
# Reiniciar o nginx forca a re-resolucao dos IPs atuais. NAO remover este passo.
echo "==> Reiniciando o nginx (re-resolve IPs dos upstreams)"
docker restart pdv-nginx

echo "==> Limpando imagens orfas"
docker image prune -f

echo "==> Commit rodando agora:"
git log -1 --oneline

echo "==> Health check (aguardando a API subir)..."
sleep 5
for i in $(seq 1 12); do
  code=$(curl -s -o /dev/null -w "%{http_code}" https://app.kashing.com.br/api/health || true)
  if [ "$code" = "200" ]; then
    echo "OK: /api/health respondeu 200."
    exit 0
  fi
  sleep 5
done
echo "AVISO: /api/health nao respondeu 200 a tempo. Cheque os logs: docker logs pdv-api --tail 50" >&2
exit 1
