#!/bin/bash
# Quick start script for Dugout Baseball Coaching Backend

echo "🧢 Starting Dugout Baseball Coaching Backend..."
echo ""

# Prefer python3.11 when available and enforce 3.11 for compatibility
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    echo "❌ Error: Python is not installed"
    echo "Please install Python 3.11"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$($PYTHON_CMD -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
if [ "$PYTHON_VERSION" != "3.11" ]; then
    echo "❌ Error: Python 3.11 is required (found $PYTHON_VERSION via $PYTHON_CMD)"
    echo "Please install Python 3.11 and try again."
    exit 1
fi

echo "✓ Python version: $PYTHON_VERSION"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    $PYTHON_CMD -m venv venv
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
uvicorn main:app --reload --host 127.0.0.1 --port 8100
