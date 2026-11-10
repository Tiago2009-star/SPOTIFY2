"""Servidor local do Onda.

Serve a pasta do projeto em http://0.0.0.0:8080, obriga o navegador a
revalidar sempre os ficheiros (senão o telemóvel fica com a versão antiga em
cache) e entrega o áudio das músicas do YouTube em /audio/<id>.

O áudio é extraído pelo yt-dlp e reenviado por este servidor: assim o
telemóvel toca um <audio> normal, que continua a tocar com a app em segundo
plano — coisa que o iframe do YouTube não faz no Android.
"""

import os
import re
import threading
import time
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))

AUDIO_RE = re.compile(r'^/audio/([A-Za-z0-9_-]{6,20})/?$')
AUDIO_CACHE = {}
AUDIO_LOCK = threading.Lock()
AUDIO_TTL = 3 * 3600


def resolve_audio(video_id):
    """Devolve o endereço do áudio (m4a) do vídeo, com os cabeçalhos do YouTube."""
    now = time.time()
    with AUDIO_LOCK:
        hit = AUDIO_CACHE.get(video_id)
        if hit and hit[2] > now:
            return hit[0], hit[1]

    import yt_dlp

    options = {
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'nocheckcertificate': True,
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
    }
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(
            'https://www.youtube.com/watch?v=' + video_id, download=False)

    if info.get('entries'):
        info = info['entries'][0]

    url = info.get('url')
    if not url:
        formats = [f for f in (info.get('formats') or [])
                   if f.get('acodec') not in (None, 'none') and f.get('url')]
        if not formats:
            raise RuntimeError('sem faixa de áudio')
        formats.sort(key=lambda f: f.get('abr') or f.get('tbr') or 0, reverse=True)
        url = formats[0]['url']

    headers = dict(info.get('http_headers') or {})
    headers.pop('Accept-Encoding', None)
    with AUDIO_LOCK:
        AUDIO_CACHE[video_id] = (url, headers, now + AUDIO_TTL)
    return url, headers


def open_audio(video_id, range_header):
    """Abre o áudio no YouTube, tentando de novo se o endereço tiver expirado."""
    for attempt in (0, 1):
        url, headers = resolve_audio(video_id)
        req_headers = dict(headers)
        req_headers.setdefault('User-Agent', 'Mozilla/5.0')
        if range_header:
            req_headers['Range'] = range_header
        try:
            request = urllib.request.Request(url, headers=req_headers)
            return urllib.request.urlopen(request, timeout=30)
        except urllib.error.HTTPError as err:
            if attempt or err.code not in (403, 410):
                raise
            with AUDIO_LOCK:
                AUDIO_CACHE.pop(video_id, None)
    raise RuntimeError('não foi possível abrir o áudio')


class OndaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        # mantém a janela limpa; os erros continuam a aparecer
        if args and str(args[1]).startswith(('4', '5')):
            super().log_message(fmt, *args)

    # ------------------------------ áudio ------------------------------
    def do_HEAD(self):
        if AUDIO_RE.match(urlsplit(self.path).path):
            self.serve_audio(head_only=True)
            return
        super().do_HEAD()

    def do_GET(self):
        if AUDIO_RE.match(urlsplit(self.path).path):
            self.serve_audio(head_only=False)
            return
        super().do_GET()

    def serve_audio(self, head_only=False):
        match = AUDIO_RE.match(urlsplit(self.path).path)
        video_id = match.group(1)

        try:
            upstream = open_audio(video_id, self.headers.get('Range'))
        except Exception as err:  # noqa: BLE001 - qualquer falha vira 503
            self.send_response(503)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Retry-After', '30')
            self.end_headers()
            if not head_only:
                self.wfile.write(('áudio indisponível: %s' % err).encode('utf-8'))
            return

        try:
            status = 206 if upstream.status == 206 else 200
            self.send_response(status)
            self.send_header('Content-Type', upstream.headers.get('Content-Type', 'audio/mp4'))
            length = upstream.headers.get('Content-Length')
            if length:
                self.send_header('Content-Length', length)
            content_range = upstream.headers.get('Content-Range')
            if content_range:
                self.send_header('Content-Range', content_range)
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()

            if head_only:
                return

            while True:
                chunk = upstream.read(64 * 1024)
                if not chunk:
                    break
                self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            try:
                upstream.close()
            except Exception:
                pass


if __name__ == '__main__':
    os.chdir(ROOT)
    print('Onda: http://localhost:8080')
    ThreadingHTTPServer(('0.0.0.0', PORT), OndaHandler).serve_forever()
