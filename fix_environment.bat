@echo off
echo ===================================================
echo Environment Repair & Prisma Generator
echo ===================================================
echo.

:: 1. Force restore standard Windows paths
set "PATH=C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0\;C:\Program Files\nodejs;%PATH%"

echo [INFO] Restoring PATH...
echo [INFO] Path is now set to include System32 and Nodejs.
echo.

:: 1.5 KILL ALL NODE PROCESSES (To release file locks)
echo [INFO] Closing all active Node.js processes to release file locks...
taskkill /F /IM node.exe /T >nul 2>&1
echo [SUCCESS] Processes cleared.
echo.

:: 2. Verify Node
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js still not found in C:\Program Files\nodejs
    echo Please make sure Node.js is installed correctly.
    pause
    exit /b
)

echo [SUCCESS] Node.js found.
echo [INFO] Cleaning Prisma cache...
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma"
)
echo [INFO] Running Prisma Generate...
echo.

:: 3. Run Prisma Generate using the restored path
call npx prisma generate

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo [SUCCESS] Environment repaired and Prisma updated!
    echo You can now close this window and run launch_app.bat
    echo ===================================================
) else (
    echo.
    echo [ERROR] Failed to run Prisma generate.
)

pause
