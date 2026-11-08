# Onda — player de música estilo Spotify

App estático (HTML + CSS + JS, sem build e sem dependências) com:

- **Tocar ao clicar** em qualquer música (fila automática: próxima/anterior)
- **Playlists**: criar, adicionar/remover músicas, excluir
- **Favoritos** (“Músicas Curtidas”), com o coração em cada faixa e no player
- **Busca** por música, artista ou álbum
- **Player completo**: play/pause, progresso, volume, aleatório, repetir (playlist / uma música)
- **Persistência** em `localStorage` (favoritos, playlists, volume, recentes)
- Layout responsivo (desktop e celular)

## Como rodar

Opção 1 — abra `index.html` no navegador (duplo clique).

Opção 2 — sirva a pasta (recomendado, evita bloqueios de `localStorage` em `file://`):

```bash
npx serve .
# ou
python -m http.server 8080
```

Depois abra `http://localhost:8080` (`http://localhost:3000` no `npx serve`).

## Sobre o catálogo de músicas

O app **não** distribui o catálogo do Spotify: as músicas do Spotify são licenciadas
e só podem ser tocadas pela API oficial (Spotify Web API + conta Premium). Este app
toca arquivos de áudio por URL, então o catálogo padrão usa 16 **faixas de
demonstração royalty-free** do [SoundHelix](https://www.soundhelix.com/audio-examples),
transmitidas direto do site deles. Para ouvir, é preciso estar conectado à internet.

### Adicionar suas músicas

Edite `js/catalog.js` e crie um álbum com suas faixas:

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
js/catalog.js   catálogo (álbuns e faixas)
js/app.js       player, views, playlists, favoritos, persistência
```

## Músicas do computador

No botão de importar de “Sua biblioteca” (ao lado do “+”) você escolhe arquivos
de áudio do PC (mp3, m4a, ogg, wav, flac…). Eles entram na biblioteca **Minhas
músicas**, tocam no player, entram em playlists e favoritos. O nome é lido como
“Artista - Título” quando o arquivo segue esse padrão.

Os arquivos ficam no **IndexedDB** do navegador (nada é enviado para servidor) e
voltam ao abrir o app de novo. Se o navegador bloquear o armazenamento, as
músicas tocam só naquela sessão — abrir por `http://localhost` costuma resolver.

## YouTube

O app **não usa mais** o YouTube: a busca filtra só o catálogo e os arquivos
locais, e nada abre o YouTube no navegador nem no telemóvel. O player
incorporado também saiu — era ele que, no telemóvel, mostrava a interface do
YouTube e mandava para o app deles.

Todas as faixas tocam no player do próprio app, pelo elemento `<audio>`, com a
capa e os controlos dentro do Onda. Se quiser suas músicas, importe os arquivos
em “Minhas músicas” ou coloque os `.mp3` em `musicas/` e aponte o `src` no
`js/catalog.js`.

## Escrã desligado e segundo plano

Os **arquivos locais** (e qualquer faixa do catálogo) tocam pelo player do
próprio app: continuam com o ecrã desligado, com o app em segundo plano e
enquanto o utilizador passa para outra aplicação. A capa, o título e os
controlos aparecem no aviso do sistema e no ecrã de bloqueio (Media Session), e
só param quando o app/browser é fechado por completo.

Se a música ficar **muito tempo pausada**, ao voltar basta tocar em play: o app
recarrega o áudio do ponto onde parou e continua (o browser pode descartar o
buffer enquanto o telemóvel está bloqueado).
