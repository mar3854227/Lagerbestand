#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="/Users/marcinpanus/Documents/Projekt-Backups/Lagerverwaltung"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
ARCHIVE="$TARGET_DIR/code-snapshots/lagerverwaltung_${TIMESTAMP}.tar.gz"

mkdir -p "$TARGET_DIR/code-snapshots" "$TARGET_DIR/json-daten-exporte"

tar -czf "$ARCHIVE" \
  -C "$PROJECT_DIR" \
  --exclude='.git' \
  --exclude='.playwright-cli' \
  --exclude='tmp' \
  Lagerverwaltung.html package.json scripts AKTIVE_DATEI.md

echo "Code-Snapshot: $ARCHIVE"

if [ -f "$PROJECT_DIR/package.json" ]; then
  (cd "$PROJECT_DIR" && npm run backup:data:full) || echo "Hinweis: JSON-Datenbackup übersprungen (kein Export vorhanden)."
fi
