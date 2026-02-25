@echo off
REM English Partner - Quick Start Script for Windows

echo 🚀 Starting English Partner...

REM Check if virtual environment exists
if not exist "backend\venv" (
    echo 📦 Creating Python virtual environment...
    cd backend
    python -m venv venv
    cd ..
)

REM Start backend
echo 🐍 Starting backend server...
cd backend
call venv\Scripts\activate
pip install -r requirements.txt >nul 2>&1
start /B python main.py
cd ..

REM Start frontend
echo ⚛️  Starting frontend server...
cd frontend
call npm install >nul 2>&1
start /B npm run dev
cd ..

echo.
echo ✅ English Partner is running!
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop
pause
