@echo off
title Grok Build Web UI
echo ============================================================
echo   🚀 Starting Grok Build Web UI...
echo ============================================================
echo.

cd /d "%~dp0"
echo [1/3] Installing GUI dependencies...
call npm install --prefix gui

echo [2/3] Building Web UI bundle...
call npm run build --prefix gui

echo [3/3] Launching Web UI Server on http://localhost:3001
start http://localhost:3001
call node gui/server.js
pause
