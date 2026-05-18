# StandOut Modular Interactive Display Application

# Overview

The StandOut application showcases collaboration between students and Nokia.

The current module supports:

- Thesis search from multiple Finnish university repositories.
- Rule-based and OpenAI evaluation.
- MongoDB persistence for collected thesis metadata and labels.
- AI summary generation and QR code based sharing.

# Quick Start

## Windows (recommended)

Install dependencies and create Python virtual environment:

```bat
install_all.bat
```

Run all services:

```bat
run_all.bat
```

Notes:

- The summary service is launched directly with `backend/summary-script/.venv/Scripts/python.exe`.
- Use `install_all_python312.bat` and `run_all_python312.bat` if you are targeting Python 3.12.

## macOS / Linux

This script installs all dependencies and starts all services
(frontend, Node backend, and Python backend) in separate Terminal windows.
Your browser will also open at: http://localhost:8081

## First time setup & run

Open Terminal in the project root and run:

```bash

chmod +x *.sh
./install_all.sh
./run_all.sh

```

## Run later

```bash

./run_all.sh

```

# Runtime Services

- Frontend (Expo): http://localhost:8081
- Node backend (Express): http://localhost:3000
- Python summary + classification service (Flask): http://localhost:5001

