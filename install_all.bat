@echo off
title Thesis App - Installation

echo.
echo ############################################
echo Installing Thesis Application
echo ############################################

cd /d "%~dp0"

REM -------------------------
REM Check Python 3.11
REM -------------------------
py -3.11 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.11 is not installed.
    echo Please install Python 3.11 and try again.
    pause   
    exit /b 1
)

@REM Get Python version
for /f "tokens=2" %%i in ('py -3.11 --version 2^>^&1') do set PYTHON_VERSION=%%i
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
cd backend\summary-script

if not exist .venv (
    py -3.11 -m venv .venv
)

call .venv\Scripts\activate.bat

REM --- Step 1: Install exact requirements ---
echo Installing dependencies from requirements.txt...

python -m pip install -r requirements.txt -v

if errorlevel 1 (
    echo ERROR: Python dependency installation failed
    call deactivate
    cd ..\..
    pause
    exit /b 1
)

REM --- Step 2: Model Check ---
echo Verifying Summarization Pipeline...
python -c "from transformers.pipelines import SUPPORTED_TASKS; print('Summarization Ready!' if 'summarization' in SUPPORTED_TASKS else 'ERROR: Summarization pipeline not available.')"

if errorlevel 1 (
    echo ERROR: Transformers verification failed
    call deactivate
    cd ..\..
    pause
    exit /b 1
)

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
echo You can now run run_all.bat
echo ============================================
pause