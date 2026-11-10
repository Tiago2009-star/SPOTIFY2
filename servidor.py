"""Servidor local do Onda.

Serve a pasta do projeto em http://0.0.0.0:8080 e obriga o navegador a
revalidar sempre os ficheiros. Sem isto, alguns telemóveis guardam o
index.html e o app.js antigos e continuam a mostrar a versão anterior.
"""

import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))


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


if __name__ == '__main__':
    os.chdir(ROOT)
    print('Onda: http://localhost:8080')
    ThreadingHTTPServer(('0.0.0.0', PORT), OndaHandler).serve_forever()
