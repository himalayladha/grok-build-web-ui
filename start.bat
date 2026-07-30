@echo off
title Grok Build Web UI
echo ============================================================
echo   🚀 Starting Grok Build Web UI...
echo ============================================================
echo.

cd /d "%~dp0gui"
if not exist "node_modules" (
    echo [1/3] Installing dependencies...
    call npm install
)

if not exist "dist" (
    echo [2/3] Building Web UI bundle...
    call npm run build
)

echo [3/3] Launching Web UI Server on http://localhost:3001
start http://localhost:3001
call node server.js
pause
