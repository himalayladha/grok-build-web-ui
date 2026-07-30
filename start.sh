#!/usr/bin/env bash

echo "============================================================"
echo "  🚀 Starting Grok Build Web UI..."
echo "============================================================"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/gui"

if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing dependencies..."
    npm install
fi

if [ ! -d "dist" ]; then
    echo "[2/3] Building Web UI bundle..."
    npm run build
fi

echo "[3/3] Launching Web UI Server on http://localhost:3001"
if command -v open &> /dev/null; then
    open http://localhost:3001
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3001
fi

node server.js
