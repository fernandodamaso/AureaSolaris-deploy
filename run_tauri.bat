@echo off
setlocal
pushd "%~dp0"
set "CARGO_TARGET_DIR=%~dp0work\cargo-target-dev"
call npm.cmd run tauri -- dev
set "TAURI_EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %TAURI_EXIT_CODE%
