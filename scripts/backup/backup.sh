#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/vpn_service}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/vpn}"
RCLONE_REMOTE="${RCLONE_REMOTE:-yc:vpn-backups}"
RETENTION_LOCAL_DAYS="${RETENTION_LOCAL_DAYS:-14}"
RETENTION_REMOTE_DAYS="${RETENTION_REMOTE_DAYS:-60}"

TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
mkdir -p "$BACKUP_DIR"

log() { echo "[$(date -u +%FT%TZ)] $*"; }

COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.prod.yml"

log "dumping postgres"
$COMPOSE exec -T db \
  pg_dump -U vpnuser -d vpnshop --format=custom --compress=9 \
  > "$BACKUP_DIR/db_${TS}.dump"

log "archiving config files"
tar czf "$BACKUP_DIR/files_${TS}.tgz" \
  -C "$PROJECT_DIR" \
  .env nginx/ssl nginx/nginx.conf

log "uploading to $RCLONE_REMOTE"
rclone copy "$BACKUP_DIR/db_${TS}.dump"    "$RCLONE_REMOTE/db/"    --s3-no-check-bucket
rclone copy "$BACKUP_DIR/files_${TS}.tgz"  "$RCLONE_REMOTE/files/" --s3-no-check-bucket

log "pruning local (>${RETENTION_LOCAL_DAYS}d)"
find "$BACKUP_DIR" -type f -mtime +"${RETENTION_LOCAL_DAYS}" -delete

log "pruning remote (>${RETENTION_REMOTE_DAYS}d)"
rclone delete "$RCLONE_REMOTE" --min-age "${RETENTION_REMOTE_DAYS}d"

log "done"
