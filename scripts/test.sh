#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Server Tests ==="
cd "$ROOT/server"
python -m pytest -v

echo ""
echo "=== Frontend Tests ==="
cd "$ROOT/web"
npx vitest run

echo ""
echo "All tests passed."
