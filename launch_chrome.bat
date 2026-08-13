@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch_chrome.ps1" %*
if errorlevel 1 (
    echo.
    echo [ERRO] O Aurea nao conseguiu iniciar.
    pause
    exit /b 1
)
exit /b 0
