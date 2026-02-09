@echo off
REM Quick start script for Dugout Baseball Coaching Backend (Windows)

echo 🧢 Starting Dugout Baseball Coaching Backend...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Python is not installed
    echo Please install Python 3.11 or higher
    pause
    exit /b 1
)

echo ✓ Python is installed

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate

REM Install/update requirements
echo 📥 Installing dependencies...
pip install -q -r requirements.txt

echo.
echo Checking Ollama connection...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Warning: Ollama is not running
    echo    Start it with: ollama serve
) else (
    echo ✓ Ollama is running
)

echo.
echo ============================================================
echo 🚀 Starting FastAPI server...
echo ============================================================
echo.

REM Start the server
uvicorn main:app --reload --host 127.0.0.1 --port 8100
