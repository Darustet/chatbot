# StandOut Modular Interactive Display Application

# Overview

The StandOut application showcases collaboration between students and Nokia.

The current module supports:

- Thesis search from multiple Finnish university repositories.
- Rule-based + ML-assisted collaboration labeling.
- SQLite persistence for collected thesis metadata and labels.
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

## First time setup & run

Open Terminal in the project root and run:

```bash

chmod +x *.sh
./install_all.sh
./run_all.sh

```

## Run later

### Start all services automatically

This will opening 3 Terminal windows and start all services automatically. Your browser will also open at: http://localhost:8081

```bash

./run_all.sh

```

# Runtime Services

- Frontend (Expo): http://localhost:8081
- Node backend (Express): http://localhost:3000
- Python summary + classification service (Flask): http://localhost:5001

# Collection Flow (Admin)

`POST /api/admin/collect-theses` runs one end-to-end sequence:

1. Fetch theses from configured providers.
2. Score with rule-based relevance logic.
3. Classify with ML service (`POST /classify-thesis` on port 5001).
4. Save merged result to SQLite database (`backend/theses.sqlite`).
