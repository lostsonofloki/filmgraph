@echo off
title Filmgraph Local Preview Launcher
echo.
echo ===============================================
echo   FILMGRAPH - Local UI Preview
echo   Starts Vite + opens browser at 127.0.0.1
echo ===============================================
echo.
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
    echo [X] npm not found in PATH. Install Node.js LTS and retry.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [!] node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [X] npm install failed. Fix dependency issues and retry.
        echo.
        pause
        exit /b 1
    )
    echo.
)

echo [+] Cleaning Vite cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
if exist ".vite" rmdir /s /q ".vite"

echo [+] Killing any process bound to port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [+] Starting Filmgraph development server in a new window...
start "Filmgraph Dev Server" cmd /k "cd /d %~dp0 && npm run dev -- --force"

echo [+] Waiting for startup...
timeout /t 4 /nobreak >nul

set "FILMGRAPH_URL=http://127.0.0.1:3001/?v=%RANDOM%"
echo [+] Opening Filmgraph at %FILMGRAPH_URL%
start "" "%FILMGRAPH_URL%"

echo.
echo Tips for visual QA:
echo   - Open DevTools ^> Toggle Device Toolbar for mobile preview.
echo   - Check bottom nav on mobile widths.
echo.
exit /b 0
