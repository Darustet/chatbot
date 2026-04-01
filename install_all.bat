@echo off
setlocal EnableExtensions
title Thesis App - Installation (Auto Python)

echo.
echo ############################################
echo Installing Thesis Application
echo ############################################

cd /d "%~dp0"

REM -------------------------
REM Check Python >= 3.11
REM -------------------------
set "PYTHON_CMD="
set "PYTHON_VERSION="

py -3.12 --version >nul 2>&1
if not errorlevel 1 set "PYTHON_CMD=py -3.12"
if "%PYTHON_CMD%"=="" (
    python -3.11 --version >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=py -3.11"
)

if "%PYTHON_CMD%"=="" (
    echo ERROR: Python 3.11 or newer is not installed.
    echo Please install Python 3.11+ and try again.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('%PYTHON_CMD% --version 2^>^&1') do set "PYTHON_VERSION=%%i"
%PYTHON_CMD% -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)"
if errorlevel 1 (
    echo ERROR: Python 3.11 or newer is required. Found %PYTHON_VERSION%
    pause
    exit /b 1
)

for /f "tokens=1,2 delims=." %%a in ("%PYTHON_VERSION%") do (
    set "PYTHON_MAJOR=%%a"
    set "PYTHON_MINOR=%%b"
)

echo Found Python %PYTHON_VERSION%
echo WARNING: Some packages ^(like torch^) may fail to install depending on your Python/platform.

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
    %PYTHON_CMD% -m venv .venv
)

call .venv\Scripts\activate.bat

REM --- Step 1: Install requirements except torch ---
echo Installing dependencies from requirements.txt ^(except torch^) ...

set "TMP_REQUIREMENTS=requirements_no_torch.tmp.txt"
if exist %TMP_REQUIREMENTS% del /q %TMP_REQUIREMENTS%
for /f "usebackq delims=" %%L in ("requirements.txt") do (
    set "REQ_LINE=%%L"
    setlocal EnableDelayedExpansion
    for /f "tokens=1 delims=<>=!~ " %%P in ("!REQ_LINE!") do set "REQ_NAME=%%P"
    if /i not "!REQ_NAME!"=="torch" (
        >>%TMP_REQUIREMENTS% echo(!REQ_LINE!
    )
    endlocal
)

python -m pip install --prefer-binary --no-input -r %TMP_REQUIREMENTS%

if errorlevel 1 (
    echo ERROR: Python dependency installation failed
    if exist %TMP_REQUIREMENTS% del /q %TMP_REQUIREMENTS%
    call deactivate
    cd ..\..
    pause
    exit /b 1
)

if exist %TMP_REQUIREMENTS% del /q %TMP_REQUIREMENTS%

REM --- Step 2: Install torch last ---
echo Installing torch as final dependency...
set "TORCH_FAILED="
set "TORCH_NO_MATCH="

if %PYTHON_MAJOR% GEQ 4 (
    python -m pip install --prefer-binary --no-input torch
) else if %PYTHON_MINOR% GEQ 12 (
    python -m pip install --prefer-binary --no-input torch
) else (
    python -m pip install --prefer-binary --no-input torch --index-url https://download.pytorch.org/whl/cpu -v
    if errorlevel 1 (
        python -m pip install --prefer-binary --no-input torch
    )
)

if errorlevel 1 (
    set "TORCH_FAILED=1"
    python -m pip install --prefer-binary --no-input torch >nul 2>torch_install_error.log
    findstr /i /c:"No matching distribution found for torch" torch_install_error.log >nul
    if not errorlevel 1 set "TORCH_NO_MATCH=1"
)

if exist torch_install_error.log del /q torch_install_error.log

REM --- Step 3: Model Check ---
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

if defined TORCH_FAILED (
    echo.
    if defined TORCH_NO_MATCH (
        echo WARNING: No matching distribution found for torch.
    ) else (
        echo WARNING: torch installation failed.
    )
    echo All other Python packages were installed successfully.
    echo You can still test the app without torch.
)

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
