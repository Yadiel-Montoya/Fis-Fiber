@echo off
title WMS Proxy - FIS FIBER
echo ============================================
echo   WMS Proxy - FIS FIBER - Embarques
echo   Puerto: 3001
echo   Deja esta ventana ABIERTA mientras usas
echo   el dashboard. Ctrl+C para detener.
echo ============================================
echo.
pip install requests urllib3 -q
python wms_proxy.py
pause
