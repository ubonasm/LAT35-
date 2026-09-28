#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "============================================"
echo " Kotoba Lens - first time setup"
echo "============================================"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js was not found. Install it from https://nodejs.org/ and try again."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Installing pnpm with npm..."
  npm install -g pnpm
fi

echo "[1/2] Installing packages..."
pnpm install --config.strict-dep-builds=false

echo "[2/2] Building the app..."
pnpm build

echo "Setup finished. Run ./start.sh to launch the app."
