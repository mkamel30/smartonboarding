@echo off
echo ==========================================
echo FIXING TERMINAL PATH PERMANENTLY
echo ==========================================
echo.

set "PS_PATH=%SystemRoot%\system32\WindowsPowerShell\v1.0"

echo Checking if PowerShell path is already in PATH...
echo %PATH% | find /I "%PS_PATH%" >nul
if %errorlevel%==0 (
    echo PowerShell path is already in your PATH.
) else (
    echo Adding PowerShell to User PATH...
    :: Using setx to permanently add to User PATH
    for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH') do set "USERPATH=%%B"
    setx PATH "%USERPATH%;%PS_PATH%"
    
    if %errorlevel%==0 (
        echo.
        echo SUCCESS: PowerShell has been added to your Environment Variables.
        echo IMPORTANT: You MUST restart your Editor (VS Code) or Terminal for changes to take effect.
    ) else (
        echo ERROR: Failed to update Environment Variables. Please try running as Administrator.
    )
)

echo.
echo ==========================================
pause
