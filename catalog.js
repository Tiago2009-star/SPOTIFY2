/*
 * Catálogo do Onda.
 *
 * Áudio: faixas de demonstração royalty-free do SoundHelix
 * (https://www.soundhelix.com/audio-examples), tocadas direto do site deles.
 *
 * Para adicionar suas músicas: crie um álbum aqui com os links (URL) dos
 * arquivos de áudio. Também funciona com arquivos locais se você servir esta
 * pasta por um servidor (ex.: "npx serve ." e src: "musicas/minha-faixa.mp3").
 */
window.CATALOG = (function () {
  'use strict';

  var AUDIO_BASE = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-';

  var albums = [
    {
      id: 'noite-neon',
      title: 'Noite Neon',
      artist: 'Luna Marés',
      year: 2025,
      colors: ['#7c3aed', '#06b6d4'],
      firstSong: 1,
      trackTitles: ['Sinal Aberto', 'Vidro Fumê', 'Rua 47', 'Depois da Meia-Noite']
    },
    {
      id: 'vento-solar',
      title: 'Vento Solar',
      artist: 'Rafa Duarte',
      year: 2024,
      colors: ['#f97316', '#db2777'],
      firstSong: 5,
      trackTitles: ['Manhã de Domingo', 'Areia Quente', 'Vento Solar', 'Volta pra Casa']
    },
    {
      id: 'chuva-de-verao',
      title: 'Chuva de Verão',
      artist: 'Banda Horizonte',
      year: 2025,
      colors: ['#0ea5e9', '#22c55e'],
      firstSong: 9,
      trackTitles: ['Nuvem Baixa', 'Cheiro de Terra', 'Chuva de Verão', 'Depois do Temporal']
    },
    {
      id: 'circuito-aberto',
      title: 'Circuito Aberto',
      artist: 'Kaori',
      year: 2026,
      colors: ['#f43f5e', '#f59e0b'],
      firstSong: 13,
      trackTitles: ['Pulso', 'Circuito Aberto', 'Meia-Noite em Tóquio', 'Fim da Linha']
    }
  ];

  var tracks = [];
  albums.forEach(function (album) {
    album.trackTitles.forEach(function (title, index) {
      var songNumber = album.firstSong + index;
      tracks.push({
        id: album.id + '-' + (index + 1),
        title: title,
        artist: album.artist,
        album: album.title,
        albumId: album.id,
        colors: album.colors,
        src: AUDIO_BASE + songNumber + '.mp3'
      });
    });
  });

  return { albums: albums, tracks: tracks };
})();
