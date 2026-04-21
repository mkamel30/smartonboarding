@echo off
setlocal EnableDelayedExpansion
echo ===================================================
echo Starting Merchant Onboarding Web Application
echo ===================================================
echo.

:: 1. Define possible paths
set "NODE_DIR=C:\Program Files\nodejs"
set "NODE_EXE=node"

:: 2. Check if node is already in path
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo [INFO] Node.js not found in PATH. Checking common locations...
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_DIR=C:\Program Files\nodejs"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "NODE_DIR=C:\Program Files (x86)\nodejs"
    ) else (
        echo [ERROR] Could not find Node.js installation automatically.
        echo Please ensure Node.js is installed from https://nodejs.org/
        pause
        exit /b
    )
    
    :: Add to temporary path
    set "PATH=!NODE_DIR!;C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0\;!PATH!"
    echo [INFO] Found Node.js at: !NODE_DIR!
)

:: Ensure ComSpec is set (required by concurrently/spawn)
if "%COMSPEC%"=="" set "COMSPEC=C:\Windows\System32\cmd.exe"

:: 3. Double check version
node -v >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.exe found but failed to run.
    pause
    exit /b
)

echo [SUCCESS] Node.js version:
node -v
echo.

:: 4. Run the app
:: We use 'call' for npm because it's a .cmd/.bat file itself
echo [INFO] Starting dev server...
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start the application with exit code %errorlevel%.
    echo Try running 'npm install' if dependencies are missing.
    pause
)
