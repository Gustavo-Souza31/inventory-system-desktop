@echo off
cd /d "%~dp0"
start "Inventory Server" cmd /k "cd server && npm run dev"
timeout /t 3 >nul
start "Inventory App" cmd /k "npm run electron:dev"
