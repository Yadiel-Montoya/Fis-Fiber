@echo off
chcp 65001 >nul
title API Indicadores FIS FIBER
cd /d "%~dp0"

echo ============================================================
echo   API de Indicadores FIS FIBER
echo   - WMS (embarques reprogramados)
echo   - SAP (almacen materia prima)
echo ============================================================
echo.

REM 1) Verificar Python
where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Python. Instala Python 3 desde python.org
  echo         y marca "Add Python to PATH".
  pause & exit /b 1
)

REM 2) Crear entorno virtual la primera vez
if not exist ".venv\" (
  echo [1/3] Creando entorno virtual...
  python -m venv .venv
)

REM 3) Activar e instalar dependencias
call ".venv\Scripts\activate.bat"
echo [2/3] Instalando/actualizando dependencias...
python -m pip install --upgrade pip -q
python -m pip install flask flask-cors requests urllib3 pyodbc -q

REM 4) Verificar configuracion
if not exist ".env" (
  echo.
  echo [AVISO] No existe el archivo .env
  echo         Copia ".env.example" a ".env" y llena tus datos
  echo         (SAP_PASS y WMS_PASS los pones tu).
  echo.
  pause & exit /b 1
)

echo [3/3] Arrancando API en el puerto 3001...
echo       Deja esta ventana ABIERTA. Ctrl+C para detener.
echo.
python app.py
pause
