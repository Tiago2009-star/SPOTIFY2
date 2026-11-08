@echo off
rem Onda - sobe um servidor local (necessario para o player do YouTube)
cd /d "%~dp0"
echo.
echo   Onda: abrindo http://localhost:8080
echo   Feche esta janela para parar o servidor.
echo.
start "" "http://localhost:8080"
py -3 -m http.server 8080 || python -m http.server 8080 || npx --yes http-server -p 8080 -c-1
pause
