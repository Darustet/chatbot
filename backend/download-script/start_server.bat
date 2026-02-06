@echo off
echo ===== THESIS SUMMARY SERVER LAUNCHER =====
echo This script will help you run the thesis backend server.

echo:
echo Choose a server type:
echo 1. Standard server (requires more memory)
echo 2. Low-memory server (recommended for most users)
echo 3. Simple server (minimal functionality, very low memory usage)

set /p server_type=Enter option (1-3): 

echo:
echo Starting server...

if "%server_type%"=="1" (
    echo Running standard server
    python downloads.py
) else if "%server_type%"=="2" (
    echo Running low-memory server 
    python low_memory_server.py
) else if "%server_type%"=="3" (
    echo Running simple server
    python simple_summary_server.py
) else (
    echo Invalid option, running low-memory server
    python low_memory_server.py
)

pause
