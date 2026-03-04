#!/usr/bin/env bash

echo "===== RUN ALL (macOS, 3 terminals) ====="

# Project root
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo
echo "===================================="
echo "Opening 3 Terminal windows..."
echo "===================================="

osascript <<EOF
tell application "Terminal"
    activate

    -- Frontend
    do script "cd \"$ROOT_DIR\" && npm start"

    -- Node backend
    do script "cd \"$ROOT_DIR/backend\" && node server.js"

    -- Python backend
    do script "cd \"$ROOT_DIR/backend/summary-script\" && source venv/bin/activate && python app.py"
end tell
EOF

echo
echo "All services started in separate terminals."
echo "Frontend: http://localhost:8081"
echo "Node API:  http://localhost:3000"
echo "Python API:http://localhost:5000"
echo

echo "Opening browser at http://localhost:8081 ..."
open "http://localhost:8081"
