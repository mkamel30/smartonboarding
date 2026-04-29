@echo off
echo ========================================
echo 🚀 SMART ONBOARDING - PRODUCTION BUILD
echo ========================================

echo 1. Cleaning old build...
if exist dist (rd /s /q dist)

echo 2. Running production build...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed! Please check errors.
    pause
    exit /b %ERRORLEVEL%
)

echo 3. Staging changes...
git add .

echo 4. Committing changes...
set msg="Final enhancements: Return-to-sender logic, breathing badges, and UI confirmations"
git commit -m %msg%

echo 5. Pushing to GitHub...
git push origin main

echo ========================================
echo ✅ DONE! Changes are now on GitHub.
echo 👉 Now run the update commands on your server.
echo ========================================
pause
