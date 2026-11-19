@echo off
cd /d "%~dp0"
py -3 setup_font.py
echo Marvel Path Tracker: http://localhost:8765
echo Open the address in your browser if it does not launch automatically.
start "" "http://localhost:8765"
py -3 server.py --port 8765
pause
