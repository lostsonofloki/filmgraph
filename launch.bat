@echo off
title Filmgraph v1.3.8
echo.
echo ========================================
echo   FILMGRAPH - Movie Logging Platform
echo   Version: 1.3.8 - Logo Text Fixed
echo ========================================
echo.
cd /d "%~dp0"

if not exist "node_modules" (
    echo [!] node_modules not found. Installing dependencies...
    call npm install
    echo.
)

echo [+] Starting Filmgraph development server...
echo [+] Opening http://localhost:3001
echo.
start http://localhost:3001
call npm run dev

pause
