#!/bin/bash
# Quick start script for Dugout Baseball Coaching Backend

echo "🧢 Starting Dugout Baseball Coaching Backend..."
echo ""

# Check if Python 3.11+ is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    echo "Please install Python 3.11 or higher"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✓ Python version: $PYTHON_VERSION"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install/update requirements
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

echo ""
echo "Checking Ollama connection..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Ollama is running"
    
    # Check if lyra-coach model exists
    if curl -s http://localhost:11434/api/tags | grep -q "lyra-coach"; then
        echo "✓ lyra-coach model found"
    else
        echo "⚠️  Warning: lyra-coach model not found"
        echo "   Create it with: ollama create lyra-coach -f Modelfile"
    fi
else
    echo "⚠️  Warning: Ollama is not running"
    echo "   Start it with: ollama serve"
fi

echo ""
echo "============================================================"
echo "🚀 Starting FastAPI server..."
echo "============================================================"
echo ""

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

