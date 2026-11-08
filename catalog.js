/*
 * Catálogo do Onda.
 *
 * 16 faixas de demonstração royalty-free do SoundHelix, tocadas direto do site
 * deles pelo player do próprio app (por isso continuam com o ecrã desligado e
 * em segundo plano, e mostram capa/título/controlos no telemóvel).
 *
 * Precisa de internet para tocar. Para usar arquivos seus, coloque os .mp3 numa
 * pasta `musicas/` e troque o `src` de cada faixa por `musicas/nome.mp3`, ou
 * importe-os em "Minhas músicas" dentro do app.
 */
window.CATALOG = (function () {
  'use strict';

  var BASE = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-';

  var DEFS = [
    { id: 'onda-vol-1', title: 'Onda Essentials', artist: 'SoundHelix', year: 2026, colors: ['#1db954', '#0ea5e9'], first: 1, count: 4 },
    { id: 'onda-vol-2', title: 'Onda Sunset', artist: 'SoundHelix', year: 2026, colors: ['#f59e0b', '#ef4444'], first: 5, count: 4 },
    { id: 'onda-vol-3', title: 'Onda Nights', artist: 'SoundHelix', year: 2026, colors: ['#8b5cf6', '#ec4899'], first: 9, count: 4 },
    { id: 'onda-vol-4', title: 'Onda Roadtrip', artist: 'SoundHelix', year: 2026, colors: ['#06b6d4', '#3b82f6'], first: 13, count: 4 }
  ];

  var albums = DEFS.map(function (def) {
    return {
      id: def.id,
      title: def.title,
      artist: def.artist,
      year: def.year,
      colors: def.colors
    };
  });

  var tracks = [];
  DEFS.forEach(function (def) {
    for (var i = 0; i < def.count; i += 1) {
      var number = def.first + i;
      tracks.push({
        id: 'sh-' + number,
        title: 'SoundHelix Song ' + number,
        artist: def.artist,
        album: def.title,
        albumId: def.id,
        colors: def.colors,
        src: BASE + number + '.mp3'
      });
    }
  });

  return { albums: albums, tracks: tracks };
})();
