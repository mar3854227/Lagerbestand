#!/bin/bash
set -euo pipefail

TARGET_DIR="/Users/marcinpanus/Documents/Projekt-Backups/Lagerverwaltung/json-daten-exporte"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

mkdir -p "$TARGET_DIR"

shopt -s nullglob
candidates=(
  "$HOME/Downloads"/lagerverwaltung-backup_*.json
  "$HOME/Downloads"/lagerverwaltung-*.json
  "$HOME/Desktop"/lagerverwaltung-backup_*.json
  "$HOME/Desktop"/lagerverwaltung-*.json
)
shopt -u nullglob

if [ "${#candidates[@]}" -eq 0 ]; then
  echo "Kein JSON-Export gefunden. Bitte zuerst in der App 'Export als JSON' klicken oder npm run export:data ausführen."
  exit 1
fi

latest_file="$(ls -t "${candidates[@]}" | head -n 1)"
target_file="$TARGET_DIR/${TIMESTAMP}_$(basename "$latest_file")"

cp "$latest_file" "$target_file"

echo "JSON-Backup kopiert: $target_file"
