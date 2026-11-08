@echo off
rem Onda - sobe um servidor local (o navegador exige http para tocar as musicas)
cd /d "%~dp0"
echo.
echo   Onda: abrindo http://localhost:8080
echo   No telemovel (mesma rede Wi-Fi): http://IP-DO-PC:8080
echo.
echo   Enderecos deste PC:
ipconfig | findstr /i "IPv4"
echo.
echo   Feche esta janela para parar o servidor.
echo.
start "" "http://localhost:8080"
py -3 -m http.server 8080 || python -m http.server 8080 || npx --yes http-server -p 8080 -c-1
pause
