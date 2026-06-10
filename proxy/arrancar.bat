@echo off
echo Iniciando WMS Proxy - FIS FIBER...
echo Puerto: 3001
echo Presiona Ctrl+C para detener.
echo.
pip install requests -q
python wms_proxy.py
pause
