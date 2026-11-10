# Onda — player de música estilo Spotify

App estático (HTML + CSS + JS, sem build e sem dependências) com:

- **Tocar ao clicar** em qualquer música (fila automática: próxima/anterior)
- **Playlists**: criar, adicionar/remover músicas, excluir
- **Favoritos** (“Músicas Curtidas”), com o coração em cada faixa e no player
- **Busca** por música, artista ou álbum (biblioteca + YouTube)
- **Player completo**: play/pause, progresso, volume, aleatório, repetir (playlist / uma música)
- **Conta obrigatória**: para ouvir música é preciso criar conta (nome + palavra-passe); cada conta tem a sua biblioteca
- **Persistência** em `localStorage`, por conta (favoritos, playlists, histórico, buscas, volume)
- Layout responsivo (desktop e celular)

## Como rodar

Duplo clique em **`iniciar.bat`**. Ele instala o `yt-dlp` na primeira vez (é o
que extrai o áudio das músicas do YouTube) e arranca o `servidor.py` em
`http://localhost:8080`.

```bash
python servidor.py
```

O servidor é obrigatório: além de servir a pasta, entrega o áudio do YouTube em
`/audio/<id>` (ver [YouTube](#youtube)). Um `python -m http.server` ou
`npx serve` serve a interface, mas as músicas caem no player do YouTube e
deixam de tocar em segundo plano.

No telemóvel, na mesma rede Wi-Fi, abra `http://IP-DO-PC:8080` (o `iniciar.bat`
mostra o IP).

## Sobre o catálogo de músicas

O app é **só YouTube**: a música vem da busca do YouTube (o vídeo identifica a
faixa; o áudio é extraído pelo servidor). Não há faixas de demonstração embutidas
nem importação de arquivos locais — `js/catalog.js` está vazio de propósito, para
a biblioteca mostrar apenas o que é do YouTube.

### Adicionar suas músicas

Se quiser voltar a ter um catálogo fixo, edite `js/catalog.js` e crie um álbum
com as suas faixas:

```js
{
  id: 'meu-album',
  title: 'Meu Álbum',
  artist: 'Meu Nome',
  year: 2026,
  colors: ['#1db954', '#0ea5e9'],   // gradiente da capa
  firstSong: 1,                      // usado só no catálogo padrão
  trackTitles: ['Faixa 1', 'Faixa 2']
}
```

O jeito mais simples de usar arquivos seus: coloque os `.mp3` em uma pasta
`musicas/` e troque o campo `src` de cada faixa por `musicas/nome-do-arquivo.mp3`
(funciona quando a pasta é servida por HTTP, como nos comandos acima).

Links diretos (`.mp3`, `.ogg`) de outros sites também funcionam, desde que o
servidor permita o acesso ao arquivo.

### Usar o catálogo real do Spotify

Isso exige a [Spotify Web API](https://developer.spotify.com/documentation/web-api)
com OAuth, além de conta Premium para reprodução completa (o Web Playback SDK toca
apenas para usuários Premium). O `src` das faixas aqui teria que virar o fluxo de
reprodução da API — a interface, playlists e favoritos deste projeto continuam
servindo de base para isso.

## Estrutura

```
index.html      estrutura da tela
styles.css      tema escuro e layout
servidor.py     servidor HTTP local + /audio/<id> (yt-dlp) para tocar em segundo plano
iniciar.bat     instala o yt-dlp e arranca o servidor
js/catalog.js   catálogo (vazio: o app é só YouTube)
js/config.js    chave da YouTube Data API + Firebase (ignorado pelo git)
js/db.js        base de dados IndexedDB (contas, playlists, faixas, curtidas)
js/cloud.js     Firebase Authentication + Firestore (contas e playlists na nuvem)
js/app.js       player, views, playlists, favoritos, contas, persistência
```

## YouTube

A **busca** consulta a YouTube Data API v3 sozinha, ~0,8 s depois da última
tecla, e mostra os vídeos no topo dos resultados. A chave fica em `js/config.js`
(ignorado pelo git):

```js
window.ONDA_CONFIG = { youtubeApiKey: 'SUA_CHAVE' };
```

O som vem do próprio `servidor.py`: em `/audio/<videoId>` ele usa o
[yt-dlp](https://github.com/yt-dlp/yt-dlp) para descobrir o ficheiro de áudio
(`itag=140`, `audio/mp4`) desse vídeo e reenvia-o para o navegador, com suporte
a `Range` (206) para o *seek* funcionar. O app toca esse áudio num `<audio>`
normal — por isso a música continua com o ecrã desligado e ao mudar para outra
aplicação, como no Spotify. O endereço fica em cache 3 h no servidor e é
renovado sozinho quando o YouTube o expira.

O player incorporado do YouTube (`#yt-stage`, 320 × 180, quase transparente)
só é usado em dois casos: no botão **Vídeo** do painel “a tocar” (aí o vídeo
toca mudo, com o som a continuar no `<audio>`) e como *fallback* se o servidor
não conseguir o áudio (`503`) — nesse caso aparece o aviso “A tocar pelo
YouTube (sem segundo plano)”. O app nunca mostra a interface do YouTube, nem
links ou botões “Abrir no YouTube”.

Como o áudio passa pelo PC, o telemóvel só toca enquanto o `servidor.py`
estiver ligado e na mesma rede (ou via Tailscale). Se o YouTube bloquear o
`yt-dlp`, o app cai no iframe e perde o segundo plano; nesse caso atualize:

```bash
python -m pip install -U yt-dlp
```

## Nuvem (Firebase)

Para ter as **contas, playlists e músicas de cada playlist na nuvem** — a mesma
conta no telemóvel e no PC — o app usa **Firebase Authentication + Firestore**:

1. No [console do Firebase](https://console.firebase.google.com/), no projeto
   `spotify-copia-d898f`, crie o **Firestore Database** (edição Standard).
2. Ative **Authentication → Sign-in method → Email/Password**.
3. Registe uma **app Web** (Configurações do projeto → Seus apps → Web) e copie
   o `firebaseConfig`.
4. Cole em `js/config.js` (ficheiro ignorado pelo git — no site publicado ele
   tem de ser enviado à parte):

```js
window.ONDA_CONFIG = {
  youtubeApiKey: 'SUA_CHAVE',
  firebaseConfig: {
    apiKey: '...',
    authDomain: 'spotify-copia-d898f.firebaseapp.com',
    projectId: 'spotify-copia-d898f',
    storageBucket: 'spotify-copia-d898f.appspot.com',
    messagingSenderId: '...',
    appId: '...'
  }
};
```

5. Publique estas regras no Firestore (separador **Regras**):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /playlists/{playlistId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

Estrutura na nuvem: `users/{uid}` guarda o nome, email, imagem de perfil,
curtidas, histórico, buscas e preferências; `users/{uid}/playlists/{id}` guarda
cada playlist com o campo `tracks` (as músicas dela).

Com `firebaseConfig` preenchido, o login passa a ser **email + palavra-passe**
(mínimo 6 caracteres, regra do Firebase) e a sessão mantém-se entre visitas. Sem
configuração, o app funciona como antes, com a base de dados local (IndexedDB).
O Firestore exige o app servido por http(s): `file://` não funciona — use
`iniciar.bat` ou o GitHub Pages.

## Ecrã desligado e segundo plano

As músicas do YouTube tocam pelo `<audio>` alimentado pelo `servidor.py` e as
faixas locais pelo player do próprio app: em ambos os casos a música continua
com o ecrã desligado, com o app em segundo plano e ao passar para outra
aplicação. A capa, o título e os controlos aparecem no aviso do sistema e no
ecrã de bloqueio (Media Session), e só param quando o app/browser é fechado por
completo ou quando o servidor do PC é desligado.

Se a música ficar **muito tempo pausada**, ao voltar basta tocar em play: o app
recarrega o áudio do ponto onde parou e continua (o browser pode descartar o
buffer enquanto o telemóvel está bloqueado). Ao recarregar a página, a faixa
volta em pausa no mesmo segundo.

## Contas e base de dados

O app **exige login para tocar música**. A conta é nome + palavra-passe, e a
palavra-passe é guardada com *hash* + *salt* (nada sai do navegador). Em
**Perfil** — também na barra lateral, por baixo de “Buscar” — pode escolher ou
remover a **imagem de perfil**; a imagem é reduzida a 256 px antes de ser
guardada.

Os dados ficam numa **base de dados IndexedDB** (`js/db.js`), com tabelas
separadas:

| Tabela | O que guarda |
| --- | --- |
| `contas` | contas criadas (nome, hash, imagem) |
| `playlists` | playlists de cada conta (`accountId`) |
| `playlist_tracks` | músicas de cada playlist, com a posição |
| `likes` | músicas curtidas de cada conta |
| `prefs` | volume, aleatório, repetir, recentes e buscas |

O `localStorage` continua a ser escrito como cópia rápida, para a interface
arrancar sem esperar pela base de dados; se essa cópia desaparecer, a biblioteca
é recuperada da base de dados.

Limitações: a base de dados é **local ao navegador** — não sincroniza entre
telemóvel e PC (para isso seria preciso um serviço de autenticação e base de
dados na nuvem, com conta e chaves próprias). A antiga secção de arquivos locais
(“Minhas músicas”) foi removida.
