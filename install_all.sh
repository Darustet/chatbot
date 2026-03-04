#!/usr/bin/env bash

echo "===== INSTALL & RUN ALL (macOS, 3 terminals) ====="

# Project root
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# -------------------
# INSTALL FIRST
# -------------------

echo
echo "== Frontend install =="
cd "$ROOT_DIR" || exit 1
npm install || exit 1

echo
echo "== Backend Node install =="
cd "$ROOT_DIR/backend" || exit 1
npm install || true

echo
echo "== Backend Python setup =="
cd "$ROOT_DIR/backend/summary-script"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install flask-cors

