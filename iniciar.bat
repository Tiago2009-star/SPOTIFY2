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

rem o audio em segundo plano vem do yt-dlp: instala-o na primeira vez
python -c "import yt_dlp" 2>nul
if errorlevel 1 (
  echo   A instalar o suporte de audio ^(yt-dlp^)...
  python -m pip install --quiet --disable-pip-version-check yt-dlp
)

start "" "http://localhost:8080"
python servidor.py || py -3 servidor.py
pause
