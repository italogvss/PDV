#!/usr/bin/env bash
# =============================================================
# Kashing - Deploy/rollback em producao
#
# Roda NA VPS, dentro do clone do repo (ex.: /opt/kashing).
# Unidade de release = tag git (vX.Y.Z). Sem argumento, usa a tag mais recente.
#
# Uso:
#   ./scripts/deploy.sh            # sobe a tag mais recente
#   ./scripts/deploy.sh v1.2.0     # sobe uma tag especifica (tambem serve p/ rollback)
# =============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

git fetch --all --tags

REF="${1:-$(git describe --tags --abbrev=0)}"

echo "==> Checkout: $REF"
git checkout "$REF"

echo "==> Build e restart dos containers"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "==> Limpando imagens antigas"
docker image prune -f

echo "==> Versao rodando agora:"
git describe --tags
