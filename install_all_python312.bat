@echo off
title Thesis App - Installation (Python 3.12)

echo.
echo ############################################
echo Installing Thesis Application (Python 3.12)
echo ############################################

cd /d "%~dp0"

REM -------------------------
REM Check Python 3.12
REM -------------------------
py -3.12 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.12 is not installed.
    echo Please install Python 3.12 and try again.
    pause   
    exit /b 1
)

@REM Get Python version
for /f "tokens=2" %%i in ('py -3.12 --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Found Python %PYTHON_VERSION%

REM -------------------------
REM Check Node.js
REM -------------------------
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

REM -------------------------
REM Setup Python environment
REM -------------------------
echo.
echo Setting up Python environment...
cd backend\download-script

if not exist .venv (
    py -3.12 -m venv .venv
)

call .venv\Scripts\activate.bat

python -m pip install --upgrade pip
pip install -r requirements.txt

call deactivate

REM -------------------------
REM Install Node dependencies
REM -------------------------
echo.
echo Installing Node.js dependencies...
cd ..\..
call npm install

if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo Installation completed successfully!
echo You can now run run_all_python312.bat
echo ============================================
pause