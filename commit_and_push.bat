@echo off
SETLOCAL
echo [1/4] Adding PowerShell to PATH...
set PATH=%PATH%;%SystemRoot%\system32\WindowsPowerShell\v1.0\

echo [2/4] Adding changes to Git...
git add .

echo [3/4] Committing changes...
git commit -m "Rename Operations to Branches Management and update role labels"

echo [4/4] Pushing to repository...
git push

echo.
echo ==========================================
echo Done! All changes have been pushed.
echo ==========================================
pause
