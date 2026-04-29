@echo off
SETLOCAL
echo [1/5] Adding PowerShell to PATH...
set PATH=%PATH%;%SystemRoot%\system32\WindowsPowerShell\v1.0\

echo [2/5] Running Local Build (Please wait)...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed. Please check for errors above.
    pause
    exit /b %errorlevel%
)

echo [3/5] Adding changes to Git...
git add .

echo [4/5] Committing changes...
git commit -m "Update build and rename roles to Branches Management"

echo [5/5] Pushing to repository...
git push

echo.
echo ==========================================
echo Success! Build completed and pushed.
echo ==========================================
pause
