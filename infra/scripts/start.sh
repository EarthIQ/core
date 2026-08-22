#!/bin/bash
# Production startup script

set -e

echo "Starting application..."

# Start the application
echo "Starting FastAPI server..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --loop uvloop \
    --http httptools \
    --log-level info