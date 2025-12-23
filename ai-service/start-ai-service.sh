#!/bin/bash

# Start AI Service Script
# This ensures the correct Python environment is used

echo "🤖 Starting AI Service..."
echo ""

# Change to ai-service directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please create it first:"
    echo "  python3 -m venv .venv"
    echo "  source .venv/bin/activate"
    echo "  pip install -r requirements.txt  # or uv sync"
    exit 1
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source .venv/bin/activate

# Check if dependencies are installed
if ! python -c "import uvicorn" 2>/dev/null; then
    echo "❌ Dependencies not installed!"
    echo "Installing dependencies..."
    pip install -r requirements.txt 2>/dev/null || uv sync
fi

# Start the service
echo "🚀 Starting uvicorn server..."
echo "   URL: http://0.0.0.0:8000"
echo "   Press Ctrl+C to stop"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
