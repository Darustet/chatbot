#!/usr/bin/env bash

echo "===== RUN ALL (macOS, 3 terminals) ====="

# Project root
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_PORT="${PORT:-8081}"

start_services_directly() {
    echo
    echo "Starting services in the current shell..."
    echo "Frontend: http://localhost:${FRONTEND_PORT}"
    echo "Node API:  http://localhost:3000"
    echo "Python API:http://localhost:5001"
    echo

    PORT="${FRONTEND_PORT}" npm start > "$ROOT_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!

    (cd "$ROOT_DIR/backend" && node server.js) > "$ROOT_DIR/backend.log" 2>&1 &
    NODE_PID=$!

    (cd "$ROOT_DIR/backend/summary-script" && source venv/bin/activate && python app.py) > "$ROOT_DIR/python.log" 2>&1 &
    PYTHON_PID=$!

    trap 'kill "$FRONTEND_PID" "$NODE_PID" "$PYTHON_PID" 2>/dev/null' EXIT INT TERM

    echo "Services are running in the background. Logs: frontend.log, backend.log, python.log"
    echo "Press Ctrl+C to stop them."
    wait
}

if [[ -n "${RENDER:-}" || -n "${CI:-}" ]]; then
    exec node "$ROOT_DIR/backend/server.js"
elif [[ "$(uname -s)" == "Darwin" ]]; then
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
    echo "Frontend: http://localhost:${FRONTEND_PORT}"
    echo "Node API:  http://localhost:3000"
    echo "Python API:http://localhost:5001"
    echo

    if command -v open >/dev/null 2>&1; then
        echo "Opening browser at http://localhost:${FRONTEND_PORT} ..."
        echo open "http://localhost:${FRONTEND_PORT}"
        echo "Opening browser at http://0.0.0.0:${FRONTEND_PORT} ..."
        open "http://0.0.0.0:${FRONTEND_PORT}"
    else
        echo "Browser open skipped: no local browser command available."
    fi
else
    start_services_directly
fi

echo "Opening browser at https://chatbot-render-y3bs.onrender.com ..."
echo "https://chatbot-render-y3bs.onrender.com"
