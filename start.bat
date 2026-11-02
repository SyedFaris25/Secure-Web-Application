@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Starting Secure Web Application
echo ===================================================

set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

echo [1/2] Starting Flask Backend on http://localhost:5000 ...
start "Backend - Flask (Port 5000)" cmd /k "cd /d "%BACKEND_DIR%" && .\venv\Scripts\python.exe app.py"

echo [2/2] Starting Frontend Vite Server on http://localhost:5173 ...
start "Frontend - Vite (Port 5173)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo Waiting 3 seconds for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ===================================================
echo   Application started successfully!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo ===================================================
