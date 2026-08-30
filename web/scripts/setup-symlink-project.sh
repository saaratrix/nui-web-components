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

if [ -e "$TARGET_PATH" ] || [ -L "$TARGET_PATH" ]; then
  echo "Target already exists: $TARGET_PATH"
  read -r -p "Do you want to overwrite it? [y/N] " CONFIRM

  case "$CONFIRM" in
    [yY])
      rm -rf "$TARGET_PATH"
      ;;
    *)
      echo "Cancelled."
      exit 0
      ;;
  esac
fi

TARGET_DIR="$(cd "$(dirname "$TARGET_PATH")" && pwd)"
RELATIVE_SOURCE_PATH="$(realpath --relative-to="$TARGET_DIR" "$SOURCE_PATH")"

ln -s "$RELATIVE_SOURCE_PATH" "$TARGET_PATH"

echo "Symlinked:"
echo "  $TARGET_PATH -> $RELATIVE_SOURCE_PATH"