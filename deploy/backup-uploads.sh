#!/usr/bin/env bash
# Daily copy of uploaded photos. Add to crontab:
#   0 2 * * * /home/deploy/an-nafi/deploy/backup-uploads.sh
# The database itself is backed up by Neon (point-in-time restore).
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/an-nafi-uploads}"
KEEP_DAYS="${KEEP_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/uploads-$(date +%F).tar.gz" -C "$APP_DIR" storage/uploads
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
