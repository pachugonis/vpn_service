#!/usr/bin/env bash
# Usage: ./restore.sh <db_dump_file> [files_tgz]
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/vpn_service}"
DUMP="${1:?path to db dump required}"
FILES="${2:-}"

COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.prod.yml"

echo "WARNING: this will overwrite the current database. Ctrl+C in 5s to abort."
sleep 5

echo "restoring database from $DUMP"
$COMPOSE exec -T db dropdb   -U vpnuser --if-exists vpnshop
$COMPOSE exec -T db createdb -U vpnuser vpnshop
$COMPOSE exec -T db pg_restore -U vpnuser -d vpnshop --no-owner --no-privileges < "$DUMP"

if [[ -n "$FILES" ]]; then
  echo "restoring config files from $FILES"
  tar xzf "$FILES" -C "$PROJECT_DIR"
fi

echo "restarting services"
$COMPOSE restart backend celery_worker celery_beat nginx
echo "done"
