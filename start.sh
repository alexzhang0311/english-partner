#!/bin/bash

# English Partner - Quick Start Script

echo "🚀 Starting English Partner..."

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python -m venv venv
    cd ..
fi

# Start backend
echo "🐍 Starting backend server..."
cd backend
source venv/bin/activate  # Use venv\Scripts\activate on Windows
pip install -r requirements.txt > /dev/null 2>&1
python main.py &
BACKEND_PID=$!
cd ..

# Start frontend
echo "⚛️  Starting frontend server..."
cd frontend
npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ English Partner is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
