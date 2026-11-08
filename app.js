/* ============================================================
   Onda — player, biblioteca e playlists
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------- catálogo --------------------------- */
  const catalog = window.CATALOG || { albums: [], tracks: [] };
  const albums = catalog.albums;
  const tracks = catalog.tracks;
  const albumById = new Map(albums.map(a => [a.id, a]));
  const trackById = new Map(tracks.map(t => [t.id, t]));
  const localTracks = [];
  const albumTrackIds = id => tracks.filter(t => t.albumId === id).map(t => t.id);

  function allTracks() {
    return tracks.concat(localTracks);
  }

  function allIds() {
    return tracks.map(t => t.id).concat(localTracks.map(t => t.id));
  }

  const LIKED_COLORS = ['#4f46e5', '#a855f7'];
  const LOCAL_COLORS = ['#0f766e', '#22d3ee'];
  const PLAYLIST_COLORS = [
    ['#1db954', '#0ea5e9'],
    ['#8b5cf6', '#ec4899'],
    ['#f59e0b', '#ef4444'],
    ['#06b6d4', '#3b82f6'],
    ['#f43f5e', '#8b5cf6'],
    ['#22c55e', '#eab308']
  ];

  /* ---------------------------- ícones ---------------------------- */
  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21H3z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6" stroke-linecap="round"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="3.5"/><path d="M10.5 9.4v5.2l4.6-2.6z" fill="currentColor" stroke="none"/></svg>',
    youtubeBadge: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="5.5" width="21" height="13" rx="4" fill="#ff0000"/><path d="M10 9.2v5.6l5.2-2.8z" fill="#fff"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5h2v14h-2zM4 5l11 7-11 7z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-8-4.9-8-10.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 3.8C20 16.1 12 21 12 21z"/></svg>',
    heartFilled: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-4.9-8-10.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 3.8C20 16.1 12 21 12 21z"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    volumeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  /* ---------------------------- estado ---------------------------- */
  const STORAGE_KEY = 'onda.player.v1';
  const audio = new Audio();
  audio.preload = 'metadata';

  const store = {
    likes: [],
    playlists: [],
    recent: [],
    prefs: { volume: 0.8, shuffle: false, repeat: 'off' }
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.likes)) store.likes = saved.likes;
      if (Array.isArray(saved.playlists)) {
        store.playlists = saved.playlists.filter(p => p && p.id && Array.isArray(p.tracks));
      }
      if (Array.isArray(saved.recent)) store.recent = saved.recent;
      if (saved.prefs && typeof saved.prefs === 'object') {
        if (typeof saved.prefs.volume === 'number') store.prefs.volume = saved.prefs.volume;
        if (typeof saved.prefs.shuffle === 'boolean') store.prefs.shuffle = saved.prefs.shuffle;
        if (typeof saved.prefs.repeat === 'string') store.prefs.repeat = saved.prefs.repeat;
      }
    }
  } catch (err) {
    /* localStorage indisponível (modo privado ou file:// bloqueado) */
  }

  const likedSet = new Set(store.likes);
  const player = {
    queue: [],
    pos: -1,
    currentId: null,
    shuffle: !!store.prefs.shuffle,
    repeat: store.prefs.repeat === 'all' || store.prefs.repeat === 'one' ? store.prefs.repeat : 'off'
  };

  const metaCache = new Map();
  const metaInFlight = new Set();
  let metaQueue = [];
  let metaActive = 0;

  let route = { name: 'home' };
  const stack = [];
  let menuTrackId = null;
  let modalState = null;
  let toastTimer = 0;
  let rafId = 0;

  const ytKey = (window.ONDA_CONFIG && typeof window.ONDA_CONFIG.youtubeApiKey === 'string')
    ? window.ONDA_CONFIG.youtubeApiKey.trim()
    : '';
  const yt = {
    query: '', status: 'idle', results: [], error: '', playing: null,
    player: null, ready: false, state: -1, apiRequested: false,
    volume: typeof store.prefs.volume === 'number' ? clamp(store.prefs.volume, 0, 1) : 0.8,
    muted: false
  };
  let ytTimer = 0;
  let ytRequestId = 0;
  let ytRafId = 0;
  const ytApiQueue = [];

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (err) {}
  };

  /* --------------------------- utilitários --------------------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
  }

  function norm(value) {
    return String(value == null ? '' : value)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function fmt(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours) return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    return minutes + ':' + String(secs).padStart(2, '0');
  }

  function initials(text) {
    const parts = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '♪';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function shuffleArray(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function coverHTML(title, colors, cls, icon) {
    const palette = colors && colors.length === 2 ? colors : PLAYLIST_COLORS[0];
    const inner = icon
      ? '<span class="cover-ico">' + icon + '</span>'
      : '<span class="cover-txt">' + esc(initials(title)) + '</span>';
    return '<div class="cover ' + (cls || '') + '" style="background-image:linear-gradient(135deg,' +
      palette[0] + ',' + palette[1] + ')">' + inner + '</div>';
  }

  function plColors(pl) {
    return pl && pl.colors && pl.colors.length === 2 ? pl.colors : PLAYLIST_COLORS[0];
  }

  function getPlaylist(id) {
    return store.playlists.find(p => p.id === id) || null;
  }

  function likedTrackIds() {
    return allIds().filter(id => likedSet.has(id));
  }

  function playlistTrackIds(pl) {
    return pl ? pl.tracks.filter(id => trackById.has(id)) : [];
  }

  function setRangeFill(el, pct) {
    const p = clamp(pct, 0, 100);
    el.style.background = 'linear-gradient(90deg, var(--green) ' + p + '%, #4d4d4d ' + p + '%)';
  }

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ----------------------------- refs ----------------------------- */
  const mainEl = $('#main');
  const viewEl = $('#view');
  const libList = $('#lib-list');
  const searchInput = $('#search-input');
  const navHomeBtn = $('#nav-home');
  const navSearchBtn = $('#nav-search');
  const backBtn = $('#btn-back');
  const menuToggleBtn = $('#btn-menu');
  const createPlaylistBtn = $('#btn-create-playlist');
  const addFilesBtn = $('#btn-add-files');
  const fileInput = $('#file-input');
  const sidebarEl = $('#sidebar');

  const npCover = $('#np-cover');
  const npTitle = $('#np-title');
  const npArtist = $('#np-artist');
  const npLike = $('#np-like');
  const playBtn = $('#btn-play');
  const prevBtn = $('#btn-prev');
  const nextBtn = $('#btn-next');
  const shuffleBtn = $('#btn-shuffle');
  const repeatBtn = $('#btn-repeat');
  const seekEl = $('#seek');
  const tCurrent = $('#t-current');
  const tTotal = $('#t-total');
  const volumeEl = $('#volume');
  const muteBtn = $('#btn-mute');
  const menuEl = $('#menu');
  const modalRoot = $('#modal-root');

  /* ---------------------------- duração ---------------------------- */
  function paintDuration(id, seconds) {
    viewEl.querySelectorAll('[data-dur="' + id + '"]').forEach(el => {
      el.textContent = seconds ? fmt(seconds) : '--:--';
    });
  }

  function queueDurations(ids) {
    ids.forEach(id => {
      if (!metaCache.has(id) && !metaInFlight.has(id) && metaQueue.indexOf(id) === -1) metaQueue.push(id);
    });
    pumpMeta();
  }

  function pumpMeta() {
    while (metaActive < 2 && metaQueue.length) {
      const id = metaQueue.shift();
      if (trackById.has(id) && !metaCache.has(id)) probeDuration(id);
    }
  }

  function probeDuration(id) {
    const track = trackById.get(id);
    if (!track) return;
    metaActive += 1;
    metaInFlight.add(id);
    const probe = document.createElement('audio');
    let settled = false;

    const finish = seconds => {
      if (settled) return;
      settled = true;
      metaActive = Math.max(0, metaActive - 1);
      metaInFlight.delete(id);
      const value = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
      metaCache.set(id, value);
      paintDuration(id, value);
      probe.removeAttribute('src');
      pumpMeta();
    };

    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', () => finish(probe.duration), { once: true });
    probe.addEventListener('error', () => finish(0), { once: true });
    setTimeout(() => finish(0), 12000);
    probe.src = track.src;
  }

  /* ----------------------------- views ----------------------------- */
  function sectionHTML(title, content, extra) {
    return '<section class="section">' +
      '<div class="section-head"><h2 class="section-title">' + esc(title) + '</h2>' + (extra || '') + '</div>' +
      content + '</section>';
  }

  function subSection(title, content) {
    return '<div class="search-section"><h2 class="section-title">' + esc(title) + '</h2>' +
      '<div class="search-section-body">' + content + '</div></div>';
  }

  function heroHTML(o) {
    return '<header class="view-header" style="--vh-a:' + o.colors[0] + ';--vh-b:' + o.colors[1] + '">' +
      '<div class="vh-cover">' + coverHTML(o.coverTitle, o.colors, '', o.coverIcon || '') + '</div>' +
      '<div class="vh-meta">' +
        '<span class="vh-type">' + esc(o.type) + '</span>' +
        '<h1>' + esc(o.title) + '</h1>' +
        '<p class="vh-sub">' + o.subtitle + '</p>' +
      '</div>' +
    '</header>' +
    '<div class="view-body">' +
      '<div class="view-actions">' + o.actions + '</div>' +
      o.body +
    '</div>';
  }

  function trackRowHTML(id, index, opts) {
    const track = trackById.get(id);
    if (!track) return '';
    const isPlaying = player.currentId === id;
    const isLiked = likedSet.has(id);
    const dur = metaCache.get(id);
    const options = opts || {};

    return '<div class="row' + (isPlaying ? ' playing' : '') + '" data-track-id="' + track.id +
      '" data-play="' + track.id + '" role="button" tabindex="0" aria-label="Tocar ' + esc(track.title) + '">' +
      '<div class="row-lead">' +
        '<span class="row-num">' + (index + 1) + '</span>' +
        '<span class="row-tri">' + ICONS.play + '</span>' +
        '<span class="row-pause">' + ICONS.pause + '</span>' +
        '<span class="row-eq"><i></i><i></i><i></i></span>' +
      '</div>' +
      '<div class="row-main">' +
        '<div class="row-cover">' + coverHTML(track.album, track.colors) + '</div>' +
        '<div class="row-text">' +
          '<span class="row-title">' + esc(track.title) + '</span>' +
          '<span class="row-artist">' + esc(track.artist) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="row-album">' + esc(track.album) + '</div>' +
      '<div class="row-dur" data-dur="' + track.id + '">' + (dur ? fmt(dur) : '--:--') + '</div>' +
      '<div class="row-actions">' +
        '<button class="icon-btn heart-btn' + (isLiked ? ' liked' : '') + '" data-act="like" data-track="' +
          track.id + '" aria-label="' + (isLiked ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '">' +
          (isLiked ? ICONS.heartFilled : ICONS.heart) + '</button>' +
        (options.removable
          ? '<button class="icon-btn" data-act="remove" data-track="' + track.id +
            '" aria-label="Remover da playlist">' + ICONS.trash + '</button>'
          : '') +
        '<button class="icon-btn" data-act="more" data-track="' + track.id +
          '" aria-label="Mais opções">' + ICONS.more + '</button>' +
      '</div>' +
    '</div>';
  }

  function trackListHTML(ids, opts) {
    const options = opts || {};
    if (!ids.length) {
      return '<div class="empty">' + esc(options.empty || 'Nada por aqui ainda.') + '</div>';
    }
    const head = '<div class="tracklist-head">' +
      '<span>#</span><span>Título</span><span class="col-album">Álbum</span><span class="col-time">Duração</span><span></span>' +
      '</div>';
    return '<div class="tracklist">' + head +
      ids.map((id, index) => trackRowHTML(id, index, options)).join('') +
      '</div>';
  }

  function homeHTML() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    const quick = [{ liked: true, title: 'Músicas Curtidas', colors: LIKED_COLORS }].concat(
      store.playlists.slice(0, 5).map(p => ({ id: p.id, title: p.name, colors: plColors(p) }))
    );

    const tiles = quick.map(item => (
      '<div class="tile" role="button" tabindex="0" ' +
        (item.liked ? 'data-open-liked' : 'data-open-playlist="' + item.id + '"') + '>' +
        coverHTML(item.title, item.colors, '', item.liked ? ICONS.heartFilled : '') +
        '<span class="tile-name">' + esc(item.title) + '</span>' +
        '<button class="tile-play" data-act="quick-play" data-kind="' + (item.liked ? 'liked' : 'playlist') +
          '" data-id="' + (item.liked ? '' : item.id) + '" aria-label="Tocar ' + esc(item.title) + '">' +
          ICONS.play + '</button>' +
      '</div>'
    )).join('');

    const cards = albums.map(album => (
      '<div class="card" role="button" tabindex="0" data-open-album="' + album.id + '">' +
        '<div class="card-cover">' + coverHTML(album.title, album.colors) +
          '<button class="card-play" data-play-album="' + album.id + '" aria-label="Tocar ' + esc(album.title) + '">' +
            ICONS.play + '</button>' +
        '</div>' +
        '<div class="card-title">' + esc(album.title) + '</div>' +
        '<div class="card-sub">' + esc(album.artist) + ' · ' + album.year + '</div>' +
      '</div>'
    )).join('');

    const recentIds = store.recent.filter(id => trackById.has(id)).slice(0, 6);
    const listTitle = recentIds.length ? 'Tocadas recentemente' : 'Sugestões para você';
    const listIds = recentIds.length ? recentIds : allIds().slice(0, 6);
    const localSection = localTracks.length
      ? sectionHTML('Suas músicas do computador', trackListHTML(localTracks.map(t => t.id)))
      : '';

    return '<div class="home-top"><h1>' + greeting + '</h1><div class="tiles">' + tiles + '</div></div>' +
      sectionHTML('Feito para você', '<div class="cards">' + cards + '</div>') +
      localSection +
      sectionHTML(listTitle, trackListHTML(listIds)) +
      '<div class="note"><strong>Músicas:</strong> o catálogo usa faixas de demonstração royalty-free do ' +
        'SoundHelix. Use o botão de importar em “Sua biblioteca” para tocar arquivos do seu computador ' +
        '(mp3, m4a, ogg, wav, flac) — eles entram em playlists e favoritos.</div>';
  }

  function albumHTML(id) {
    const album = albumById.get(id);
    if (!album) return missingHTML();
    const ids = albumTrackIds(id);
    const action = '<button class="play-fab" data-play-album="' + album.id + '" aria-label="Tocar ' +
      esc(album.title) + '">' + ICONS.play + '</button>' +
      '<button class="btn" data-play-album="' + album.id + '">' + ICONS.play + '<span>Tocar álbum</span></button>';

    return heroHTML({
      colors: album.colors,
      coverTitle: album.title,
      type: 'Álbum',
      title: album.title,
      subtitle: esc(album.artist) + ' · ' + album.year + ' · ' + ids.length + ' faixas',
      actions: action,
      body: trackListHTML(ids)
    });
  }

  function playlistHTML(id) {
    const pl = getPlaylist(id);
    if (!pl) return missingHTML();
    const ids = playlistTrackIds(pl);

    return heroHTML({
      colors: plColors(pl),
      coverTitle: pl.name,
      type: 'Playlist',
      title: pl.name,
      subtitle: ids.length + (ids.length === 1 ? ' música' : ' músicas'),
      actions:
        '<button class="play-fab" data-act="play-list" data-id="' + pl.id + '" aria-label="Tocar playlist">' +
          ICONS.play + '</button>' +
        '<button class="btn" data-act="add-songs" data-id="' + pl.id + '">' + ICONS.plus +
          '<span>Adicionar músicas</span></button>' +
        '<button class="btn danger" data-act="delete-playlist" data-id="' + pl.id + '">' + ICONS.trash +
          '<span>Excluir</span></button>',
      body: trackListHTML(ids, { removable: true, empty: 'Playlist vazia. Use “Adicionar músicas” para começar.' })
    });
  }

  function likedHTML() {
    const ids = likedTrackIds();
    return heroHTML({
      colors: LIKED_COLORS,
      coverTitle: 'Músicas Curtidas',
      coverIcon: ICONS.heartFilled,
      type: 'Coleção',
      title: 'Músicas Curtidas',
      subtitle: ids.length + (ids.length === 1 ? ' música' : ' músicas'),
      actions:
        '<button class="play-fab" data-act="play-liked" aria-label="Tocar favoritas">' + ICONS.play + '</button>' +
        '<button class="btn" data-act="play-liked">' + ICONS.play + '<span>Tocar</span></button>',
      body: trackListHTML(ids, { empty: 'Toque no coração de qualquer música para salvar aqui.' })
    });
  }

  function searchHTML(q) {
    const term = norm(q);
    if (!term) {
      return '<div class="view-body search-body"><h1 class="page-title">Buscar</h1>' +
        '<p class="page-sub">Digite o nome de uma música, artista ou álbum — os resultados do catálogo e do YouTube aparecem sozinhos.</p>' +
        trackListHTML(allIds()) + '</div>';
    }

    const foundAlbums = albums.filter(a => norm(a.title + ' ' + a.artist).indexOf(term) !== -1);
    const foundPlaylists = store.playlists.filter(p => norm(p.name).indexOf(term) !== -1);
    const foundTracks = allTracks().filter(t => norm(t.title + ' ' + t.artist + ' ' + t.album).indexOf(term) !== -1);

    const blocks = [];

    if (foundAlbums.length) {
      blocks.push(subSection('Álbuns', '<div class="cards">' + foundAlbums.map(album => (
        '<div class="card" role="button" tabindex="0" data-open-album="' + album.id + '">' +
          '<div class="card-cover">' + coverHTML(album.title, album.colors) +
            '<button class="card-play" data-play-album="' + album.id + '" aria-label="Tocar">' + ICONS.play + '</button>' +
          '</div>' +
          '<div class="card-title">' + esc(album.title) + '</div>' +
          '<div class="card-sub">' + esc(album.artist) + '</div>' +
        '</div>'
      )).join('') + '</div>'));
    }

    if (foundPlaylists.length) {
      blocks.push(subSection('Playlists', '<div class="cards">' + foundPlaylists.map(pl => (
        '<div class="card" role="button" tabindex="0" data-open-playlist="' + pl.id + '">' +
          '<div class="card-cover">' + coverHTML(pl.name, plColors(pl)) +
            '<button class="card-play" data-act="play-list" data-id="' + pl.id + '" aria-label="Tocar">' + ICONS.play + '</button>' +
          '</div>' +
          '<div class="card-title">' + esc(pl.name) + '</div>' +
          '<div class="card-sub">Playlist · ' + pl.tracks.length + '</div>' +
        '</div>'
      )).join('') + '</div>'));
    }

    if (foundTracks.length) {
      blocks.push(subSection('Músicas', trackListHTML(foundTracks.map(t => t.id))));
    }

    return '<div class="view-body search-body"><h1 class="page-title">Resultados para “' + esc(q) + '”</h1>' +
      '<div id="yt-player-slot"></div>' +
      '<div id="yt-panel">' + ytPanelHTML(q) + '</div>' +
      blocks.join('') + '</div>';
  }

  /* ---------------------------- youtube ---------------------------- */
  function isFileProtocol() {
    return window.location.protocol === 'file:';
  }

  function ytPlayerHTML() {
    if (!yt.playing) return '';
    const videoId = encodeURIComponent(yt.playing.id);

    const frame = isFileProtocol()
      ? '<div class="yt-blocked">' +
          '<strong>Este vídeo não toca com o app aberto por file://</strong>' +
          '<p>O player incorporado do YouTube exige que a página envie um endereço http de origem ' +
            '(erro 153) e isso não existe em <code>file://</code>. ' +
            'Execute o <strong>iniciar.bat</strong> nesta pasta e abra ' +
            '<code>http://localhost:8080</code> — aí o vídeo toca normalmente.</p>' +
        '</div>'
      : '<div class="yt-frame">' +
          /* o player da API do YouTube é montado aqui (permite pausar e ajustar o volume) */
          '<div class="yt-embed" id="yt-embed"></div>' +
        '</div>';

    return '<div class="yt-player">' + frame +
      '<div class="yt-now">' +
        '<div class="yt-now-text"><strong>' + esc(yt.playing.title) + '</strong>' +
          '<span>' + esc(yt.playing.author || 'YouTube') + '</span></div>' +
        '<a class="btn" href="https://www.youtube.com/watch?v=' + videoId + '" target="_blank" rel="noopener">Abrir no YouTube</a>' +
      '</div>' +
    '</div>';
  }

  function ytGridHTML() {
    return '<div class="yt-grid">' + yt.results.map(item => (
      '<button class="yt-card" data-yt-play="' + esc(item.id) + '" data-yt-title="' + esc(item.title) +
        '" data-yt-author="' + esc(item.author) + '">' +
        '<span class="yt-thumb">' +
          (item.thumb ? '<img src="' + esc(item.thumb) + '" alt="" loading="lazy">' : '') +
          '<span class="yt-badge">' + ICONS.youtubeBadge + '</span>' +
        '</span>' +
        '<span class="yt-card-title">' + esc(item.title) + '</span>' +
        '<span class="yt-card-sub">' + esc(item.author) + '</span>' +
      '</button>'
    )).join('') + '</div>';
  }

  function currentSearchTerm() {
    return route.name === 'search' ? route.q : '';
  }

  function ytPanelHTML(term) {
    if (!ytKey) return '';
    if (!yt.query || norm(yt.query) !== norm(term)) return '';

    const fileNote = isFileProtocol()
      ? '<p class="yt-note">Vídeos do YouTube não tocam com o app aberto por <code>file://</code> (erro 153). ' +
        'Rode <strong>iniciar.bat</strong> e abra <code>http://localhost:8080</code>. Para ouvir sem internet, ' +
        'baixe o áudio no seu PC e importe em “Minhas músicas”.</p>'
      : '';

    let body;
    if (yt.status === 'loading') {
      body = '<div class="empty">Buscando no YouTube…</div>';
    } else if (yt.status === 'error') {
      body = '<div class="empty">' + esc(yt.error) + '</div>';
    } else if (yt.results.length) {
      body = ytGridHTML();
    } else {
      body = '<div class="empty">Nenhum vídeo encontrado no YouTube para “' + esc(term) + '”.</div>';
    }

    return '<section class="yt-panel">' +
      '<div class="yt-panel-head"><h2 class="section-title">YouTube</h2></div>' +
      fileNote +
      body +
    '</section>';
  }

  function stopYouTubeSearch() {
    clearTimeout(ytTimer);
    ytTimer = 0;
    ytRequestId += 1;
    yt.query = '';
    yt.status = 'idle';
    yt.error = '';
    yt.results = [];
  }

  function paintYtPanel() {
    const el = $('#yt-panel');
    if (el) el.innerHTML = ytPanelHTML(currentSearchTerm());
  }

  function paintYtPlayer() {
    const slot = $('#yt-player-slot');
    if (slot) slot.innerHTML = ytPlayerHTML();
    mountYtPlayer();
  }

  /* -------- player do YouTube: pause, volume e progresso na barra -------- */
  function destroyYtPlayer() {
    cancelAnimationFrame(ytRafId);
    ytRafId = 0;
    if (yt.player && typeof yt.player.destroy === 'function') {
      try { yt.player.destroy(); } catch (err) {}
    }
    yt.player = null;
    yt.ready = false;
    yt.state = -1;
  }

  function stopYouTubePlayback() {
    destroyYtPlayer();
    yt.playing = null;
  }

  function ensureYtApi(callback) {
    if (window.YT && window.YT.Player) { callback(); return; }
    ytApiQueue.push(callback);
    if (yt.apiRequested) return;
    yt.apiRequested = true;

    window.onYouTubeIframeAPIReady = function () {
      const queue = ytApiQueue.splice(0, ytApiQueue.length);
      queue.forEach(fn => { try { fn(); } catch (err) {} });
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.onerror = function () {
      yt.apiRequested = false;
      toast('Não foi possível carregar o player do YouTube.');
    };
    document.head.appendChild(tag);
  }

  function mountYtPlayer() {
    const host = $('#yt-embed');
    if (!host || !yt.playing || yt.player || isFileProtocol()) return;

    const videoId = yt.playing.id;
    ensureYtApi(function () {
      const target = $('#yt-embed');
      if (!target || yt.player || !yt.playing || yt.playing.id !== videoId || !window.YT) return;

      yt.player = new window.YT.Player(target, {
        videoId: videoId,
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: { onReady: onYtReady, onStateChange: onYtState }
      });
    });
  }

  function onYtReady(event) {
    yt.ready = true;
    applyYtVolume();
    if (event && event.target && typeof event.target.playVideo === 'function' && yt.state !== 1) {
      try { event.target.playVideo(); } catch (err) {}
    }
    updatePlayerBar();
    startYtTick();
  }

  function onYtState(event) {
    const states = (window.YT && window.YT.PlayerState) || {};
    yt.state = event.data;

    if (event.data === states.PLAYING) {
      startYtTick();
    } else {
      cancelAnimationFrame(ytRafId);
      ytRafId = 0;
    }

    syncPlayIcon();
    updateProgress();
  }

  function startYtTick() {
    cancelAnimationFrame(ytRafId);
    const loop = () => {
      if (!yt.playing || yt.state !== 1) { ytRafId = 0; return; }
      updateProgress();
      ytRafId = requestAnimationFrame(loop);
    };
    ytRafId = requestAnimationFrame(loop);
  }

  function applyYtVolume() {
    if (!yt.player || !yt.ready) return;
    try {
      yt.player.setVolume(Math.round(clamp(yt.volume, 0, 1) * 100));
      if (yt.muted) yt.player.mute();
      else yt.player.unMute();
    } catch (err) {}
  }

  function setVolume(value, muted) {
    const vol = clamp(Number(value) || 0, 0, 1);
    yt.volume = vol;
    yt.muted = typeof muted === 'boolean' ? muted : vol === 0;

    /* mantém o áudio e o vídeo no mesmo volume */
    audio.volume = vol;
    audio.muted = yt.muted;
    applyYtVolume();

    volumeEl.value = String(Math.round(vol * 100));
    setRangeFill(volumeEl, vol * 100);
    muteBtn.innerHTML = '<span class="ico">' + (yt.muted ? ICONS.volumeOff : ICONS.volume) + '</span>';
    store.prefs.volume = vol;
    save();
  }

  function playYouTube(id, title, author) {
    if (!id) return;
    audio.pause();
    destroyYtPlayer();
    yt.playing = { id: id, title: title || 'Vídeo do YouTube', author: author || '' };
    paintYtPlayer();
    updatePlayerBar();
    mainEl.scrollTop = 0;
    if (isFileProtocol()) toast('Vídeo não toca em file:// (erro 153). Rode iniciar.bat e abra localhost:8080.');
  }

  function searchYouTube(term) {
    const query = String(term || '').trim();
    if (!query) return;
    yt.query = query;

    if (!ytKey) {
      yt.status = 'error';
      yt.results = [];
      yt.error = 'Chave do YouTube ausente: crie js/config.js com window.ONDA_CONFIG = { youtubeApiKey: "SUA_CHAVE" }.';
      paintYtPanel();
      return;
    }

    yt.status = 'loading';
    paintYtPanel();

    const requestId = ++ytRequestId;
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '24',
      q: query,
      key: ytKey
    });

    fetch('https://www.googleapis.com/youtube/v3/search?' + params.toString())
      .then(response => response.json()
        .catch(() => null)
        .then(data => ({ ok: response.ok, status: response.status, data: data })))
      .then(result => {
        if (requestId !== ytRequestId) return;
        if (!result.ok) {
          const message = result.data && result.data.error && result.data.error.message
            ? result.data.error.message
            : 'HTTP ' + result.status;
          throw new Error(message);
        }
        const items = result.data && Array.isArray(result.data.items) ? result.data.items : [];
        yt.results = items.filter(item => item && item.id && item.id.videoId).map(item => {
          const snippet = item.snippet || {};
          const thumbs = snippet.thumbnails || {};
          const thumb = (thumbs.high || thumbs.medium || thumbs.default || {}).url || '';
          return {
            id: item.id.videoId,
            title: snippet.title || 'Vídeo',
            author: snippet.channelTitle || '',
            thumb: thumb
          };
        });
        yt.status = 'ready';
        paintYtPanel();
      })
      .catch(err => {
        if (requestId !== ytRequestId) return;
        yt.status = 'error';
        yt.error = 'Falha na busca: ' + (err && err.message ? err.message : 'erro desconhecido') +
          '. Confira a chave, a cota e se a YouTube Data API v3 está ativa no projeto.';
        paintYtPanel();
      });
  }

  /* ---------------------- músicas do computador ---------------------- */
  const LOCAL_DB = 'onda-local-db';
  const LOCAL_STORE = 'files';
  let localDbPromise = null;

  function localDb() {
    if (!window.indexedDB) return Promise.reject(new Error('IndexedDB indisponível'));
    if (!localDbPromise) {
      localDbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(LOCAL_DB, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(LOCAL_STORE)) {
            db.createObjectStore(LOCAL_STORE, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Falha ao abrir o banco local'));
      });
    }
    return localDbPromise;
  }

  function localStore(mode, run) {
    return localDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(LOCAL_STORE, mode);
      const request = run(tx.objectStore(LOCAL_STORE));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error || new Error('Falha no banco local'));
      tx.onabort = () => reject(tx.error || new Error('Falha no banco local'));
    }));
  }

  function registerLocalTrack(record) {
    if (!record || !record.id || !record.blob) return null;
    if (trackById.has(record.id)) return trackById.get(record.id);
    const track = {
      id: record.id,
      title: record.title || 'Música local',
      artist: record.artist || 'Arquivo local',
      album: record.album || 'Minhas músicas',
      colors: LOCAL_COLORS,
      src: URL.createObjectURL(record.blob),
      local: true
    };
    localTracks.push(track);
    trackById.set(track.id, track);
    return track;
  }

  function openFilePicker() {
    if (!fileInput) return;
    fileInput.value = '';
    fileInput.click();
  }

  function localFileInfo(file) {
    const name = String(file.name || 'Música local').replace(/\.[^.]+$/, '');
    const parts = name.split(' - ');
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim() || 'Arquivo local',
        title: parts.slice(1).join(' - ').trim() || name
      };
    }
    return { artist: 'Arquivo local', title: name };
  }

  function addLocalFiles(fileList) {
    const files = Array.prototype.slice.call(fileList || []).filter(file => (
      (file.type && file.type.indexOf('audio/') === 0) ||
      /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(file.name)
    ));

    if (!files.length) {
      toast('Nenhum arquivo de áudio encontrado. Use mp3, m4a, ogg, wav ou flac.');
      return;
    }

    const records = files.map(file => {
      const info = localFileInfo(file);
      return {
        id: 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        title: info.title,
        artist: info.artist,
        album: 'Minhas músicas',
        addedAt: Date.now(),
        blob: file
      };
    });

    records.forEach(registerLocalTrack);
    render();
    toast(records.length === 1 ? 'Música adicionada' : records.length + ' músicas adicionadas');

    Promise.allSettled(records.map(record => localStore('readwrite', objectStore => objectStore.put(record))))
      .then(results => {
        if (results.some(result => result.status === 'rejected')) {
          toast('As músicas tocam agora, mas o navegador não deixou salvá-las para a próxima vez.');
        }
      });
  }

  function removeLocalTrack(id) {
    const track = trackById.get(id);
    if (!track || !track.local) return;

    if (player.currentId === id) {
      audio.pause();
      audio.removeAttribute('src');
      player.currentId = null;
      player.queue = [];
      player.pos = -1;
      setPlayIcon(false);
      updateProgress();
    }

    URL.revokeObjectURL(track.src);
    trackById.delete(id);
    const index = localTracks.findIndex(item => item.id === id);
    if (index !== -1) localTracks.splice(index, 1);

    store.playlists.forEach(playlist => {
      playlist.tracks = playlist.tracks.filter(trackId => trackId !== id);
    });
    if (likedSet.delete(id)) store.likes = Array.from(likedSet);
    store.recent = store.recent.filter(trackId => trackId !== id);
    save();

    localStore('readwrite', objectStore => objectStore.delete(id)).catch(() => {});
    render();
    toast('Música removida');
  }

  function localHTML() {
    const ids = localTracks.map(track => track.id);
    return heroHTML({
      colors: LOCAL_COLORS,
      coverTitle: 'Minhas músicas',
      type: 'Do computador',
      title: 'Minhas músicas',
      subtitle: ids.length + (ids.length === 1 ? ' música' : ' músicas') + ' neste navegador',
      actions:
        '<button class="play-fab" data-act="play-local" aria-label="Tocar minhas músicas">' + ICONS.play + '</button>' +
        '<button class="btn" data-act="add-files">' + ICONS.upload + '<span>Adicionar músicas</span></button>',
      body: trackListHTML(ids, {
        empty: 'Nenhuma música local ainda. Clique em “Adicionar músicas” e escolha os arquivos de áudio do seu computador.'
      })
    });
  }

  function missingHTML() {
    return '<div class="view-body"><h1 class="page-title">Não encontrado</h1>' +
      '<p class="page-sub">Esse item não existe mais. Volte para o início.</p></div>';
  }

  function viewHTML() {
    if (route.name === 'album') return albumHTML(route.id);
    if (route.name === 'playlist') return playlistHTML(route.id);
    if (route.name === 'liked') return likedHTML();
    if (route.name === 'local') return localHTML();
    if (route.name === 'search') return searchHTML(route.q);
    return homeHTML();
  }

  /* --------------------------- renderização --------------------------- */
  function renderSidebar() {
    navHomeBtn.classList.toggle('active', route.name === 'home');
    navSearchBtn.classList.toggle('active', route.name === 'search');

    const likedCount = likedSet.size;
    const items = [
      '<button class="lib-item' + (route.name === 'liked' ? ' active' : '') + '" data-open-liked>' +
        coverHTML('Músicas Curtidas', LIKED_COLORS, 'lib-cover', ICONS.heartFilled) +
        '<span class="lib-text"><span class="lib-name">Músicas Curtidas</span>' +
        '<span class="lib-sub">' + likedCount + (likedCount === 1 ? ' música' : ' músicas') + '</span></span>' +
      '</button>',
      '<button class="lib-item' + (route.name === 'local' ? ' active' : '') + '" data-open-local>' +
        coverHTML('Minhas músicas', LOCAL_COLORS, 'lib-cover') +
        '<span class="lib-text"><span class="lib-name">Minhas músicas</span>' +
        '<span class="lib-sub">' + localTracks.length + (localTracks.length === 1 ? ' arquivo' : ' arquivos') + '</span></span>' +
      '</button>'
    ].concat(store.playlists.map(pl => (
      '<button class="lib-item' + (route.name === 'playlist' && route.id === pl.id ? ' active' : '') +
        '" data-open-playlist="' + pl.id + '">' +
        coverHTML(pl.name, plColors(pl), 'lib-cover') +
        '<span class="lib-text"><span class="lib-name">' + esc(pl.name) + '</span>' +
        '<span class="lib-sub">Playlist · ' + pl.tracks.length + '</span></span>' +
      '</button>'
    )));

    libList.innerHTML = items.join('');
  }

  function setPlayIcon(isPlaying) {
    playBtn.innerHTML = '<span class="ico">' + (isPlaying ? ICONS.pause : ICONS.play) + '</span>';
    playBtn.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproduzir');
  }

  function isPlayingNow() {
    if (yt.playing) return yt.state === 1 || yt.state === 3;
    return !audio.paused && !!player.currentId;
  }

  function syncPlayIcon() {
    setPlayIcon(isPlayingNow());
  }

  function updateProgress() {
    if (yt.playing) {
      const dur = yt.ready && yt.player ? Number(yt.player.getDuration()) || 0 : 0;
      const cur = yt.ready && yt.player ? Number(yt.player.getCurrentTime()) || 0 : 0;
      const pct = dur ? (cur / dur) * 1000 : 0;

      seekEl.value = String(pct);
      setRangeFill(seekEl, pct / 10);
      tCurrent.textContent = fmt(cur);
      tTotal.textContent = dur ? fmt(dur) : '0:00';
      seekEl.disabled = !dur;
      return;
    }

    const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
    const cur = audio.currentTime || 0;
    const pct = dur ? (cur / dur) * 1000 : 0;

    seekEl.value = String(pct);
    setRangeFill(seekEl, pct / 10);
    tCurrent.textContent = fmt(cur);
    tTotal.textContent = dur ? fmt(dur) : '0:00';
    seekEl.disabled = !dur;

    if (dur && player.currentId && metaCache.get(player.currentId) !== dur) {
      metaCache.set(player.currentId, dur);
      paintDuration(player.currentId, dur);
    }
  }

  function updatePlayerBar() {
    const track = player.currentId ? trackById.get(player.currentId) : null;

    if (yt.playing) {
      const thumb = 'https://i.ytimg.com/vi/' + encodeURIComponent(yt.playing.id) + '/mqdefault.jpg';
      npCover.style.backgroundImage = 'url("' + thumb + '")';
      npCover.innerHTML = '';
      npTitle.textContent = yt.playing.title;
      npArtist.textContent = yt.playing.author || 'YouTube';
      npLike.disabled = true;
      npLike.classList.remove('active');
      npLike.innerHTML = '<span class="ico">' + ICONS.heart + '</span>';
      document.title = yt.playing.title + ' — Onda';
    } else if (track) {
      npCover.style.backgroundImage = 'linear-gradient(135deg,' + track.colors[0] + ',' + track.colors[1] + ')';
      npCover.innerHTML = '<span>' + esc(initials(track.album)) + '</span>';
      npTitle.textContent = track.title;
      npArtist.textContent = track.artist;
      npLike.disabled = false;
      npLike.classList.toggle('active', likedSet.has(track.id));
      npLike.innerHTML = '<span class="ico">' + (likedSet.has(track.id) ? ICONS.heartFilled : ICONS.heart) + '</span>';
      document.title = track.title + ' · ' + track.artist + ' — Onda';
    } else {
      npCover.style.backgroundImage = '';
      npCover.innerHTML = '<span>♪</span>';
      npTitle.textContent = 'Escolha uma música';
      npArtist.textContent = 'Onda';
      npLike.disabled = true;
      npLike.classList.remove('active');
      npLike.innerHTML = '<span class="ico">' + ICONS.heart + '</span>';
      document.title = 'Onda — sua música';
    }

    shuffleBtn.classList.toggle('active', player.shuffle);
    repeatBtn.classList.toggle('active', player.repeat !== 'off');
    repeatBtn.classList.toggle('one', player.repeat === 'one');
    repeatBtn.title = 'Repetir: ' + (player.repeat === 'off' ? 'desligado' : player.repeat === 'all' ? 'playlist' : 'uma música');

    syncPlayIcon();
    updateProgress();
    volumeEl.value = String(Math.round(yt.volume * 100));
    setRangeFill(volumeEl, yt.volume * 100);
    muteBtn.innerHTML = '<span class="ico">' + (yt.muted ? ICONS.volumeOff : ICONS.volume) + '</span>';
  }

  function render() {
    stopYouTubePlayback();
    renderSidebar();
    viewEl.innerHTML = viewHTML();
    updatePlayerBar();

    const shown = Array.prototype.map.call(
      viewEl.querySelectorAll('[data-track-id]'),
      el => el.dataset.trackId
    );
    queueDurations(shown);
  }

  function navigate(next) {
    clearTimeout(ytTimer);
    ytTimer = 0;
    stack.push(route);
    route = next;
    mainEl.scrollTop = 0;
    sidebarEl.classList.remove('open');
    render();
  }

  function goBack() {
    if (!stack.length) {
      if (route.name !== 'home') {
        route = { name: 'home' };
        searchInput.value = '';
        render();
      }
      return;
    }
    route = stack.pop();
    searchInput.value = route.name === 'search' ? route.q : '';
    mainEl.scrollTop = 0;
    render();
  }

  /* ----------------------------- player ----------------------------- */
  function persistPrefs() {
    store.prefs.volume = audio.volume;
    store.prefs.shuffle = player.shuffle;
    store.prefs.repeat = player.repeat;
    save();
  }

  function pushRecent(id) {
    store.recent = [id].concat(store.recent.filter(x => x !== id)).slice(0, 20);
    save();
  }

  function startTick() {
    cancelAnimationFrame(rafId);
    const loop = () => {
      updateProgress();
      if (!audio.paused) rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function loadAndPlay(id) {
    const track = trackById.get(id);
    if (!track) return;

    player.currentId = id;
    stopYouTubePlayback();
    pushRecent(id);
    audio.src = track.src;
    setPlayIcon(true);

    const attempt = audio.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        setPlayIcon(false);
        toast('Não foi possível tocar. Verifique sua conexão com a internet.');
      });
    }

    render();
    setPlayIcon(true);
  }

  function play(id, list) {
    if (!id || !trackById.has(id)) return;
    if (player.currentId === id && audio.src) {
      togglePlay();
      return;
    }

    const source = (list && list.length ? list : [id]).filter(x => trackById.has(x));
    player.queue = source.indexOf(id) !== -1 ? source.slice() : [id].concat(source);

    if (player.shuffle) {
      const rest = player.queue.filter(x => x !== id);
      player.queue = [id].concat(shuffleArray(rest));
    }

    player.pos = player.queue.indexOf(id);
    loadAndPlay(id);
  }

  function playAll(ids) {
    const list = (ids || []).filter(id => trackById.has(id));
    if (!list.length) {
      toast('Nada para tocar ainda.');
      return;
    }
    player.queue = list.slice();
    if (player.shuffle) player.queue = shuffleArray(player.queue.slice());
    player.pos = 0;
    loadAndPlay(player.queue[0]);
  }

  function togglePlay() {
    if (yt.playing) {
      if (!yt.player || !yt.ready) return;
      try {
        if (yt.state === 1 || yt.state === 3) yt.player.pauseVideo();
        else yt.player.playVideo();
      } catch (err) {}
      return;
    }
    if (!player.currentId) {
      playAll(allIds());
      return;
    }
    if (audio.paused) {
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => toast('Não foi possível tocar. Verifique sua conexão com a internet.'));
      }
    } else {
      audio.pause();
    }
  }

  function nextTrack(auto) {
    if (!player.queue.length) return;
    if (auto && player.repeat === 'one') {
      audio.currentTime = 0;
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
      return;
    }

    let pos = player.pos + 1;
    if (pos >= player.queue.length) {
      if (player.repeat === 'all' || player.shuffle) {
        pos = 0;
      } else {
        audio.pause();
        audio.currentTime = 0;
        updateProgress();
        return;
      }
    }
    player.pos = pos;
    loadAndPlay(player.queue[pos]);
  }

  function prevTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      updateProgress();
      return;
    }
    if (!player.queue.length) return;
    let pos = player.pos - 1;
    if (pos < 0) pos = player.queue.length - 1;
    player.pos = pos;
    loadAndPlay(player.queue[pos]);
  }

  function listIdsFrom(el) {
    const list = el.closest('.tracklist');
    if (list) {
      return Array.prototype.map.call(list.querySelectorAll('[data-track-id]'), row => row.dataset.trackId);
    }
    return [el.dataset.play || el.dataset.trackId];
  }

  /* --------------------------- favoritos --------------------------- */
  function toggleLike(id) {
    const track = trackById.get(id);
    if (!track) return;
    if (likedSet.has(id)) {
      likedSet.delete(id);
      toast('Removida das Músicas Curtidas');
    } else {
      likedSet.add(id);
      toast('Salva em Músicas Curtidas');
    }
    store.likes = Array.from(likedSet);
    save();
    render();
  }

  /* --------------------------- playlists --------------------------- */
  function createPlaylist(name, trackIds) {
    const clean = String(name || '').trim() || 'Minha playlist #' + (store.playlists.length + 1);
    const playlist = {
      id: 'pl' + Date.now().toString(36),
      name: clean.slice(0, 60),
      colors: PLAYLIST_COLORS[store.playlists.length % PLAYLIST_COLORS.length],
      tracks: (trackIds || []).filter(id => trackById.has(id)),
      createdAt: Date.now()
    };
    store.playlists.unshift(playlist);
    save();
    return playlist;
  }

  function addToPlaylist(playlistId, trackId) {
    const pl = getPlaylist(playlistId);
    const track = trackById.get(trackId);
    if (!pl || !track) return;
    if (pl.tracks.indexOf(trackId) !== -1) {
      toast('Essa música já está na playlist “' + pl.name + '”');
      return;
    }
    pl.tracks.push(trackId);
    save();
    render();
    toast('“' + track.title + '” adicionada a ' + pl.name);
  }

  function toggleTrackInPlaylist(playlistId, trackId) {
    const pl = getPlaylist(playlistId);
    if (!pl) return;
    const index = pl.tracks.indexOf(trackId);
    if (index === -1) pl.tracks.push(trackId);
    else pl.tracks.splice(index, 1);
    save();
    render();
  }

  function removeFromCurrentPlaylist(trackId) {
    if (route.name !== 'playlist') return;
    const pl = getPlaylist(route.id);
    if (!pl) return;
    pl.tracks = pl.tracks.filter(id => id !== trackId);
    save();
    render();
    toast('Removida da playlist');
  }

  function deletePlaylist(id) {
    const pl = getPlaylist(id);
    if (!pl) return;
    if (!window.confirm('Excluir a playlist “' + pl.name + '”?')) return;
    store.playlists = store.playlists.filter(p => p.id !== id);
    save();
    if (route.name === 'playlist' && route.id === id) {
      route = { name: 'home' };
      stack.length = 0;
      render();
    } else {
      render();
    }
    toast('Playlist excluída');
  }

  /* ----------------------------- menu ----------------------------- */
  function openTrackMenu(trackId, anchor) {
    const track = trackById.get(trackId);
    if (!track) return;
    menuTrackId = trackId;

    const isLiked = likedSet.has(trackId);
    const items = [
      '<button class="menu-item" data-menu="like">' +
        (isLiked ? ICONS.heartFilled : ICONS.heart) +
        '<span>' + (isLiked ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '</span></button>'
    ];

    if (route.name === 'playlist') {
      items.push('<button class="menu-item" data-menu="remove">' + ICONS.trash +
        '<span>Remover desta playlist</span></button>');
    }
    if (track.local) {
      items.push('<button class="menu-item" data-menu="remove-file">' + ICONS.trash +
        '<span>Remover do computador</span></button>');
    }

    items.push('<div class="menu-sep"></div>');
    items.push('<div class="menu-label">Adicionar a playlist</div>');
    store.playlists.forEach(pl => {
      items.push('<button class="menu-item" data-menu="add" data-pl="' + pl.id + '">' + ICONS.plus +
        '<span>' + esc(pl.name) + '</span></button>');
    });
    items.push('<button class="menu-item" data-menu="newpl">' + ICONS.plus +
      '<span>Nova playlist</span></button>');

    menuEl.innerHTML = items.join('');
    menuEl.classList.add('open');

    const rect = anchor.getBoundingClientRect();
    const width = 260;
    const height = menuEl.offsetHeight;
    let left = rect.right - width;
    let top = rect.bottom + 8;

    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
    if (left < 12) left = 12;
    if (top + height > window.innerHeight - 100) top = Math.max(12, rect.top - height - 8);

    menuEl.style.left = left + 'px';
    menuEl.style.top = top + 'px';
  }

  function closeMenu() {
    menuEl.classList.remove('open');
    menuEl.innerHTML = '';
    menuTrackId = null;
  }

  /* ----------------------------- modal ----------------------------- */
  function closeModal() {
    modalRoot.classList.remove('open');
    modalRoot.innerHTML = '';
    modalState = null;
  }

  function openCreatePlaylist(trackIds) {
    modalState = { type: 'create', tracks: trackIds || [] };
    modalRoot.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Criar playlist">' +
      '<h2>Criar playlist</h2>' +
      '<input class="field-input" id="pl-name" maxlength="60" placeholder="Dê um nome à sua playlist" autocomplete="off">' +
      '<div class="modal-actions">' +
        '<button class="btn" data-modal-close>Cancelar</button>' +
        '<button class="btn btn-primary" data-create>Criar</button>' +
      '</div>' +
    '</div>';
    modalRoot.classList.add('open');

    const input = $('#pl-name', modalRoot);
    if (input) {
      input.focus();
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') submitCreatePlaylist();
      });
    }
  }

  function submitCreatePlaylist() {
    if (!modalState || modalState.type !== 'create') return;
    const input = $('#pl-name', modalRoot);
    const playlist = createPlaylist(input ? input.value : '', modalState.tracks);
    const added = modalState.tracks;
    closeModal();
    navigate({ name: 'playlist', id: playlist.id });
    toast(added && added.length
      ? 'Playlist “' + playlist.name + '” criada com ' + added.length + ' música(s)'
      : 'Playlist “' + playlist.name + '” criada');
  }

  function openAddSongs(playlistId) {
    const pl = getPlaylist(playlistId);
    if (!pl) return;
    modalState = { type: 'add', playlistId, q: '' };
    modalRoot.innerHTML = '<div class="modal modal-lg" role="dialog" aria-modal="true" aria-label="Adicionar músicas">' +
      '<div class="modal-head"><h2>Adicionar a “' + esc(pl.name) + '”</h2>' +
        '<button class="icon-btn" data-modal-close aria-label="Fechar">' + ICONS.close + '</button></div>' +
      '<input class="modal-search" data-modal-search placeholder="Buscar no catálogo..." autocomplete="off">' +
      '<div class="modal-list" data-modal-list></div>' +
      '<div class="modal-actions"><button class="btn btn-primary" data-modal-close>Concluir</button></div>' +
    '</div>';
    modalRoot.classList.add('open');
    renderModalList();

    const input = $('[data-modal-search]', modalRoot);
    if (input) {
      input.focus();
      input.addEventListener('input', () => {
        if (!modalState) return;
        modalState.q = input.value;
        renderModalList();
      });
    }
  }

  function renderModalList() {
    const listEl = $('[data-modal-list]', modalRoot);
    if (!listEl || !modalState || modalState.type !== 'add') return;
    const pl = getPlaylist(modalState.playlistId);
    if (!pl) return;

    const term = norm(modalState.q);
    const found = allTracks().filter(t => !term || norm(t.title + ' ' + t.artist + ' ' + t.album).indexOf(term) !== -1);

    if (!found.length) {
      listEl.innerHTML = '<div class="empty">Nenhum resultado.</div>';
      return;
    }

    listEl.innerHTML = found.map(t => {
      const added = pl.tracks.indexOf(t.id) !== -1;
      return '<button class="pick-row' + (added ? ' added' : '') + '" data-pick="' + t.id + '">' +
        coverHTML(t.album, t.colors, 'pick-cover') +
        '<span class="pick-text"><strong>' + esc(t.title) + '</strong><small>' + esc(t.artist) + '</small></span>' +
        '<span class="pick-check">' + (added ? ICONS.check : ICONS.plus) + '</span>' +
      '</button>';
    }).join('');
  }

  /* ---------------------------- eventos ---------------------------- */
  function onViewClick(event) {
    const ytCard = event.target.closest('[data-yt-play]');
    if (ytCard) {
      playYouTube(ytCard.dataset.ytPlay, ytCard.dataset.ytTitle, ytCard.dataset.ytAuthor);
      return;
    }

    const actBtn = event.target.closest('[data-act]');
    if (actBtn) {
      const action = actBtn.dataset.act;
      const trackId = actBtn.dataset.track;
      const id = actBtn.dataset.id;

      if (action === 'like') { toggleLike(trackId); return; }
      if (action === 'more') { openTrackMenu(trackId, actBtn); return; }
      if (action === 'remove') { removeFromCurrentPlaylist(trackId); return; }
      if (action === 'add-songs') { openAddSongs(id); return; }
      if (action === 'delete-playlist') { deletePlaylist(id); return; }
      if (action === 'play-liked') { playAll(likedTrackIds()); return; }
      if (action === 'play-list') {
        const pl = getPlaylist(id);
        playAll(playlistTrackIds(pl));
        return;
      }
      if (action === 'quick-play') {
        if (actBtn.dataset.kind === 'liked') playAll(likedTrackIds());
        else playAll(playlistTrackIds(getPlaylist(actBtn.dataset.id)));
        return;
      }
      if (action === 'play-local') {
        playAll(localTracks.map(t => t.id));
        return;
      }
      if (action === 'add-files') {
        openFilePicker();
        return;
      }
      return;
    }

    const playAlbum = event.target.closest('[data-play-album]');
    if (playAlbum) {
      const ids = albumTrackIds(playAlbum.dataset.playAlbum);
      if (ids.length) playAll(ids);
      return;
    }

    const openAlbum = event.target.closest('[data-open-album]');
    if (openAlbum) { navigate({ name: 'album', id: openAlbum.dataset.openAlbum }); return; }

    const openPlaylist = event.target.closest('[data-open-playlist]');
    if (openPlaylist) { navigate({ name: 'playlist', id: openPlaylist.dataset.openPlaylist }); return; }

    if (event.target.closest('[data-open-liked]')) { navigate({ name: 'liked' }); return; }

    const row = event.target.closest('.row[data-play]');
    if (row) { play(row.dataset.play, listIdsFrom(row)); return; }
  }

  function wireEvents() {
    viewEl.addEventListener('click', onViewClick);

    searchInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const q = searchInput.value.trim();
      if (!q) return;
      event.preventDefault();
      stopYouTubeSearch();
      route = { name: 'search', q: q };
      render();
      searchYouTube(q);
    });

    navHomeBtn.addEventListener('click', () => {
      searchInput.value = '';
      stopYouTubeSearch();
      route = { name: 'home' };
      stack.length = 0;
      mainEl.scrollTop = 0;
      render();
    });

    navSearchBtn.addEventListener('click', () => {
      if (route.name !== 'search') {
        route = { name: 'search', q: searchInput.value.trim() };
        render();
      }
      searchInput.focus();
    });

    backBtn.addEventListener('click', goBack);

    menuToggleBtn.addEventListener('click', event => {
      event.stopPropagation();
      sidebarEl.classList.toggle('open');
    });
    mainEl.addEventListener('click', () => sidebarEl.classList.remove('open'));

    createPlaylistBtn.addEventListener('click', () => openCreatePlaylist([]));
    addFilesBtn.addEventListener('click', openFilePicker);
    fileInput.addEventListener('change', () => {
      addLocalFiles(fileInput.files);
      fileInput.value = '';
    });

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      route = q ? { name: 'search', q } : { name: 'home' };
      mainEl.scrollTop = 0;
      stopYouTubeSearch();
      render();
      if (!q) return;
      ytTimer = setTimeout(() => {
        ytTimer = 0;
        searchYouTube(q);
      }, 800);
    });

    sidebarEl.addEventListener('click', event => {
      if (event.target.closest('[data-open-liked]')) {
        searchInput.value = '';
        navigate({ name: 'liked' });
        return;
      }
      if (event.target.closest('[data-open-local]')) {
        searchInput.value = '';
        navigate({ name: 'local' });
        return;
      }
      const pl = event.target.closest('[data-open-playlist]');
      if (pl) {
        searchInput.value = '';
        navigate({ name: 'playlist', id: pl.dataset.openPlaylist });
      }
    });

    playBtn.addEventListener('click', () => {
      if (!player.currentId) playAll(allIds());
      else togglePlay();
    });
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', () => nextTrack(false));

    shuffleBtn.addEventListener('click', () => {
      player.shuffle = !player.shuffle;
      persistPrefs();
      updatePlayerBar();
      toast(player.shuffle ? 'Aleatório ativado' : 'Aleatório desativado');
    });

    repeatBtn.addEventListener('click', () => {
      player.repeat = player.repeat === 'off' ? 'all' : player.repeat === 'all' ? 'one' : 'off';
      persistPrefs();
      updatePlayerBar();
      toast('Repetir: ' + (player.repeat === 'off' ? 'desligado' : player.repeat === 'all' ? 'playlist' : 'uma música'));
    });

    seekEl.addEventListener('input', () => {
      if (yt.playing) {
        if (!yt.ready || !yt.player) return;
        const ytDur = Number(yt.player.getDuration()) || 0;
        if (!ytDur) return;
        try { yt.player.seekTo((Number(seekEl.value) / 1000) * ytDur, true); } catch (err) {}
        updateProgress();
        return;
      }

      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (!dur) return;
      audio.currentTime = (Number(seekEl.value) / 1000) * dur;
      updateProgress();
    });

    volumeEl.addEventListener('input', () => {
      setVolume(Number(volumeEl.value) / 100);
    });

    muteBtn.addEventListener('click', () => {
      const muted = yt.muted || audio.muted;
      if (!muted) setVolume(yt.volume, true);
      else setVolume(yt.volume > 0 ? yt.volume : 0.5, false);
    });

    npLike.addEventListener('click', () => {
      if (player.currentId) toggleLike(player.currentId);
    });

    audio.addEventListener('play', () => {
      if (yt.playing) {
        stopYouTubePlayback();
        paintYtPlayer();
        updatePlayerBar();
      }
      syncPlayIcon();
      startTick();
    });
    audio.addEventListener('pause', syncPlayIcon);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('timeupdate', () => { if (audio.paused) updateProgress(); });
    audio.addEventListener('ended', () => nextTrack(true));
    audio.addEventListener('error', () => {
      if (audio.src && audio.error) toast('Não foi possível carregar o áudio. Verifique sua conexão.');
    });

    menuEl.addEventListener('click', event => {
      const btn = event.target.closest('[data-menu]');
      if (!btn) return;
      const action = btn.dataset.menu;
      const trackId = menuTrackId;

      if (action === 'like' && trackId) toggleLike(trackId);
      if (action === 'remove' && trackId) removeFromCurrentPlaylist(trackId);
      if (action === 'remove-file' && trackId) removeLocalTrack(trackId);
      if (action === 'add' && trackId) addToPlaylist(btn.dataset.pl, trackId);
      if (action === 'newpl' && trackId) {
        const playlist = createPlaylist('', [trackId]);
        closeMenu();
        render();
        toast('Playlist “' + playlist.name + '” criada');
        return;
      }
      closeMenu();
    });

    modalRoot.addEventListener('click', event => {
      if (event.target === modalRoot) { closeModal(); return; }
      if (event.target.closest('[data-modal-close]')) { closeModal(); return; }
      if (event.target.closest('[data-create]')) { submitCreatePlaylist(); return; }
      const pick = event.target.closest('[data-pick]');
      if (pick && modalState && modalState.type === 'add') {
        toggleTrackInPlaylist(modalState.playlistId, pick.dataset.pick);
        renderModalList();
      }
    });

    document.addEventListener('click', event => {
      if (!menuEl.classList.contains('open')) return;
      if (event.target.closest('#menu') || event.target.closest('[data-act="more"]')) return;
      closeMenu();
    });

    document.addEventListener('keydown', event => {
      const tag = (event.target && event.target.tagName || '').toLowerCase();
      if (event.key === 'Escape') {
        if (menuEl.classList.contains('open')) closeMenu();
        else if (modalRoot.classList.contains('open')) closeModal();
        return;
      }
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      }
    });

    window.addEventListener('resize', closeMenu);
    mainEl.addEventListener('scroll', () => {
      if (menuEl.classList.contains('open')) closeMenu();
    });
  }

  /* ----------------------------- init ----------------------------- */
  function init() {
    document.querySelectorAll('[data-ico]').forEach(el => {
      const key = el.getAttribute('data-ico');
      if (ICONS[key]) el.innerHTML = ICONS[key];
    });

    setVolume(clamp(typeof store.prefs.volume === 'number' ? store.prefs.volume : 0.8, 0, 1), false);

    wireEvents();
    render();

    localStore('readonly', objectStore => objectStore.getAll())
      .then(records => {
        if (!Array.isArray(records) || !records.length) return;
        records
          .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))
          .forEach(registerLocalTrack);
        render();
      })
      .catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
