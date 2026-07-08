@echo off
echo ===================================================
echo   Glaucoma EyeCare AI Platform - Quick Launch
echo ===================================================

:: 1. Navigate and set up Backend
echo [1/3] Setting up Python FastAPI Backend...
cd backend
if not exist venv (
    echo Creating Python Virtual Environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing Backend dependencies...
pip install -r requirements.txt
start cmd /k "title FastAPI Backend && call venv\Scripts\activate && python run.py"
cd ..

:: 2. Navigate and set up Frontend
echo [2/3] Setting up React Frontend...
cd frontend
if not exist node_modules (
    echo Installing npm dependencies...
    call npm install
)
start cmd /k "title React Frontend && npm run dev"
cd ..

:: 3. Finish and launch browser
echo [3/3] Launching Web Browser...
timeout /t 5 >nul
start http://localhost:5173

echo ===================================================
echo   Web Server started on http://localhost:5173
echo   API Server started on http://localhost:8000
echo   To close, close the cmd windows that were opened.
echo ===================================================
pause
