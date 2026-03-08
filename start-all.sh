#!/bin/bash
# ── ShopZone MFE — Start All Services ─────────────────────────
# No backend required — all data served by Firebase / Firestore.
# Usage: bash start-all.sh

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   🛍️  ShopZone MFE — Starting...     ║"
echo "╚══════════════════════════════════════╝"
echo ""

ROOT="$(cd "$(dirname "$0")" && pwd)"

start_service() {
  local name=$1
  local dir=$2
  local port=$3
  echo "▶  $name  →  http://localhost:$port"
  (cd "$ROOT/$dir" && npm start > /tmp/mfe-$dir.log 2>&1) &
}

# Kill anything already on MFE ports
for port in 3000 3001 3002 3004 3005 3006 3007 3008; do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

start_service "Auth MFE         " "auth"            3006
start_service "Search MFE       " "search"          3005
start_service "Navigation MFE   " "navigation"      3004
start_service "Cart MFE         " "cart"            3002
start_service "Product Details  " "product-details" 3001
start_service "Orders MFE       " "orders"          3007
start_service "Admin MFE        " "admin"           3008
start_service "Host App         " "host"            3000

echo ""
echo "⏳  Waiting for services to boot (~25s)..."
sleep 25

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅  All services running                        ║"
echo "║                                                  ║"
echo "║  Host App         →  http://localhost:3000       ║"
echo "║  Product Details  →  http://localhost:3001       ║"
echo "║  Cart             →  http://localhost:3002       ║"
echo "║  Navigation       →  http://localhost:3004       ║"
echo "║  Search           →  http://localhost:3005       ║"
echo "║  Auth             →  http://localhost:3006       ║"
echo "║  Orders           →  http://localhost:3007       ║"
echo "║  Admin Portal     →  http://localhost:3008       ║"
echo "║                                                  ║"
echo "║  Data layer       →  Firebase / Firestore ☁️      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Logs: /tmp/mfe-<module>.log"
echo "Press Ctrl+C to stop all services."

trap 'echo ""; echo "Stopping..."; kill $(jobs -p) 2>/dev/null; exit 0' INT TERM
wait
