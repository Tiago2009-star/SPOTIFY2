/*
 * Catálogo do Onda.
 *
 * O app não vem com músicas de demonstração: tudo o que toca vem do YouTube
 * (pesquisa na barra do topo) ou de arquivos do seu computador importados em
 * "Sua biblioteca".
 *
 * Se quiser acrescentar faixas próprias, crie álbuns aqui no mesmo formato e
 * aponte "src" para o link do arquivo de áudio. Com a lista vazia, o app fica
 * só com YouTube, arquivos locais, favoritos e playlists.
 */
window.CATALOG = (function () {
  'use strict';

  var albums = [];
  var tracks = [];

  return { albums: albums, tracks: tracks };
})();
