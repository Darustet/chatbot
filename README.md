# StandOut Modular Interactive Display Application

# Overview
The StandOut application is an innovation project which aims to showcase collaboration between students and Nokia. So far one module has been implemented, which is a thesis search, where users can browse theses completed by students at different universities that have some relation to Nokia. This module also gerenates key points about a thesis using AI and provides an qr code which allow users to easily download.

# Install all and start application (macOS)

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
This will opening 3 Terminal windows and start all services automatically. Your browser will also open at:  http://localhost:8081

```bash

./run_all.sh

```
