@echo off
title Thesis App - Run

echo ============================================
echo   Starting Thesis Application
echo ============================================

REM Always start in this script's folder
cd /d "%~dp0"

REM -------------------------
REM Start Python service
REM -------------------------
echo.
echo Starting Python download service...
start "Python Service" cmd /k "cd /d "%~dp0backend\download-script" && call .venv\Scripts\activate.bat && python downloads.py"

REM -------------------------
REM Start Node backend
REM -------------------------
echo.
echo Starting Node backend...
start "Node Backend" cmd /k "cd /d "%~dp0backend" && node server.js"

REM -------------------------
REM Start Frontend (Expo)
REM -------------------------
echo.
echo Starting Frontend...
start "Expo Frontend" cmd /k "cd /d "%~dp0" && npx expo start"

echo.
echo ============================================
echo All services started.
echo.
echo Python Service: Running on port 5000
echo Node Backend:   Running on port 3000
echo Expo Frontend:  Running on port 8081
echo.
echo Open http://localhost:8081 in your browser
echo ============================================
echo.
pause
