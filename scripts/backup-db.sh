#!/usr/bin/env bash
# =============================================================
# Kashing - Backup diario do MySQL de producao
#
# Roda NA VPS (agendar via crontab, ex.: diario as 3h).
# Requer as variaveis abaixo no ambiente de quem chama o script
# (ex.: exportadas no crontab ou lidas de .env.prod antes de chamar).
#
# Variaveis esperadas:
#   DB_ROOT_PASSWORD, DB_NAME
#   R2_BACKUP_BUCKET, R2_ACCOUNT_ID, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
#   (as ultimas 4 sao para o aws-cli apontar pro endpoint do R2)
#
# Uso (crontab -e):
#   0 3 * * * /opt/kashing/scripts/backup-db.sh >> /var/log/kashing-backup.log 2>&1
# =============================================================
set -euo pipefail

BACKUP_DIR="/backups"
RETENTION_DAYS=14
DATE="$(date +%F)"
FILE="$BACKUP_DIR/pdv-$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Dump do MySQL ($DB_NAME)"
docker exec pdv-db mysqldump -u root -p"$DB_ROOT_PASSWORD" "$DB_NAME" | gzip > "$FILE"

echo "==> Removendo backups locais com mais de $RETENTION_DAYS dias"
find "$BACKUP_DIR" -name 'pdv-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "==> Copiando para o bucket R2 'backups'"
aws s3 cp "$FILE" "s3://backups/$(basename "$FILE")" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "==> Backup concluido: $FILE"
