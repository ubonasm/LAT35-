#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  ./setup.sh
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "Building the app..."
  pnpm build
fi

URL="http://localhost:3000"
echo "============================================"
echo " LAT35++ v0.1 is starting: $URL"
echo " Press Ctrl+C to stop."
echo "============================================"

(
  sleep 4
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1
  fi
) &

pnpm start
