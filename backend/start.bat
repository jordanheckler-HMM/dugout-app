@echo off
REM Quick start script for Dugout Baseball Coaching Backend (Windows)

echo 🧢 Starting Dugout Baseball Coaching Backend...
echo.

set "PYTHON_CMD="

REM Prefer Python 3.11 via py launcher
py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=py -3.11"
) else (
    REM Fallback to python if it resolves to 3.11
    python --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Error: Python is not installed
        echo Please install Python 3.11
        pause
        exit /b 1
    )

    for /f %%v in ('python -c "import sys; print(f\"{sys.version_info[0]}.{sys.version_info[1]}\")"') do set "PYTHON_VERSION=%%v"
    if not "%PYTHON_VERSION%"=="3.11" (
        echo ❌ Error: Python 3.11 is required
        echo Found Python %PYTHON_VERSION%
        echo Install Python 3.11 or use py -3.11
        pause
        exit /b 1
    )

    set "PYTHON_CMD=python"
)

for /f %%v in ('%PYTHON_CMD% -c "import sys; print(f\"{sys.version_info[0]}.{sys.version_info[1]}\")"') do set "PYTHON_VERSION=%%v"
echo ✓ Python version: %PYTHON_VERSION%

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    %PYTHON_CMD% -m venv venv
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
