#!/usr/bin/env bash

set -e

TARGET_PATH="$1"

if [ -z "$TARGET_PATH" ]; then
  echo "Usage: $0 <target-project-path>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NUI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_PATH="$NUI_ROOT/src"

mkdir -p "$(dirname "$TARGET_PATH")"

ln -s "$SOURCE_PATH" "$TARGET_PATH"

echo "Symlinked:"
echo "  $TARGET_PATH -> $SOURCE_PATH"