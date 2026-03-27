@echo off
chcp 65001 >nul
title Aurea Solaris - Dev Server
color 0A

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║          AUREA SOLARIS - INICIANDO SERVIDOR 🌟            ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

REM Verifica se npm está instalado
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] npm não encontrado. Instale o Node.js.
    pause
    exit /b 1
)

REM Verifica se node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependências pela primeira vez...
    echo.
    call npm install
    echo.
)

echo [OK] Servidor Vite encontrado
echo.
echo  Abrindo http://localhost:1420/ automaticamente...
echo  Pressione Ctrl+C para parar o servidor
echo  ════════════════════════════════════════════════════════════
echo.

REM Inicia o servidor e abre o navegador
npm start
