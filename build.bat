@echo off
setlocal
set "PROJECT_ROOT=%~dp0"

pushd "%PROJECT_ROOT%"

if not exist ".aurea-build-venv\Scripts\python.exe" (
    echo ERRO: ambiente de build do motor nao encontrado.
    echo Crie .aurea-build-venv e instale requirements-api.txt antes do release.
    popd
    exit /b 1
)

echo [1/2] Gerando o motor astrologico isolado...
".aurea-build-venv\Scripts\python.exe" -m PyInstaller --clean --noconfirm build_sidecar.spec
if errorlevel 1 (
    echo ERRO: falha ao gerar o motor astrologico.
    popd
    exit /b 1
)

copy /Y "dist\astro-engine-x86_64-pc-windows-msvc.exe" "src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe" >nul
if errorlevel 1 (
    echo ERRO: falha ao preparar o motor para o instalador.
    popd
    exit /b 1
)

rem NSIS is the supported Windows installer. MSI/WiX is optional and must not
rem invalidate a successful application build when the external WiX tool fails.
echo [2/2] Gerando o aplicativo e o instalador NSIS...
call npm.cmd run tauri -- build --bundles nsis
set "BUILD_EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %BUILD_EXIT_CODE%
