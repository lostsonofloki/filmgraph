@echo off
echo Starting Ignes...
cd /d "%~dp0"
start http://localhost:3000
npm run dev
pause
