/* ============================================================
   Onda — player, biblioteca e playlists
   ============================================================ */
(function () {
  'use strict';

  /* ------------------- modo sem nuvem (emergência) ------------------- */
  /* Se a chave do Firebase for apagada/expirar, o login na nuvem deixa de
     funcionar e a app ficaria inutilizável. O botão "Continuar sem conta"
     do ecrã de entrada liga este modo: contas locais, como antes. */
  const NO_CLOUD_KEY = 'onda.noCloud';
  function offlineMode() {
    try { return localStorage.getItem(NO_CLOUD_KEY) === '1'; } catch (err) { return false; }
  }

  /* A chave do Firebase está utilizável? Pedido propositadamente inválido
     (sem token) — não cria nem altera nada. 403 = bloqueada por restrições;
     a mensagem "API key ..." = apagada/expirada. */
  function cloudKeyUsable() {
    const cfg = window.ONDA_CONFIG && window.ONDA_CONFIG.firebaseConfig;
    const key = cfg && cfg.apiKey;
    if (!key || typeof fetch !== 'function') return Promise.resolve(false);
    return fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
      encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    }).then(response => response.json().catch(() => ({})).then(body => {
      const message = (body && body.error && body.error.message) || '';
      if (/api[-\s]?key/i.test(message)) return false;
      return response.status !== 403;
    })).catch(() => false);
  }

  if (offlineMode()) {
    window.OndaCloud = null;
    /* quando a chave voltar a funcionar, regressa sozinho à conta na nuvem */
    cloudKeyUsable().then(ok => {
      if (!ok) return;
      try { localStorage.removeItem(NO_CLOUD_KEY); } catch (err) {}
      location.reload();
    });
  }

  /* --------------------------- catálogo --------------------------- */
  const catalog = window.CATALOG || { albums: [], tracks: [] };
  const albums = catalog.albums;
  const tracks = catalog.tracks;
  const albumById = new Map(albums.map(a => [a.id, a]));
  const trackById = new Map(tracks.map(t => [t.id, t]));
  const localTracks = [];
  const albumTrackIds = id => tracks.filter(t => t.albumId === id).map(t => t.id);

  function allTracks() {
    return tracks.concat(localTracks, ytTracks);
  }

  function allIds() {
    return tracks.map(t => t.id)
      .concat(localTracks.map(t => t.id), ytTracks.map(t => t.id));
  }

  const LIKED_COLORS = ['#4f46e5', '#a855f7'];
  const PROFILE_COLORS = ['#334155', '#1ed760'];
  const HISTORY_COLORS = ['#1e3a8a', '#22d3ee'];
  const LOCAL_COLORS = ['#0f766e', '#22d3ee'];
  const YT_COLORS = ['#ff2d55', '#8b5cf6'];
  const SOURCE_LABELS = {
    playlist: 'Playlist',
    album: 'Álbum',
    liked: 'Músicas Curtidas',
    local: 'Minhas músicas',
    history: 'Histórico',
    taste: 'Baseado no seu gosto',
    catalog: 'Baseado no seu gosto'
  };
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
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5h2v14h-2zM4 5l11 7-11 7z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    queue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h12M4 12h12M4 17h7"/><path d="m15.5 14.5 5 2.5-5 2.5z" fill="currentColor" stroke="none"/></svg>',
    library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5v14M9 5v14"/><path d="M13.5 5.6 18 5l2.2 13.4-4.5.6z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.7"/><path d="M4.6 20c1.2-3.5 4-5.3 7.4-5.3s6.2 1.8 7.4 5.3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-8-4.9-8-10.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 3.8C20 16.1 12 21 12 21z"/></svg>',
    heartFilled: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-4.9-8-10.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 3.8C20 16.1 12 21 12 21z"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    volumeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>'
  };

  /* ---------------------------- estado ---------------------------- */
  const STORAGE_KEY = 'onda.player.v1';
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.setAttribute('playsinline', '');
  audio.setAttribute('webkit-playsinline', '');
  audio.setAttribute('aria-hidden', 'true');

  const store = {
    likes: [],
    playlists: [],
    recent: [],
    ytTracks: [],
    searches: [],
    prefs: { volume: 0.8, shuffle: false, repeat: 'off' }
  };

  /* ----------------------------- contas ----------------------------- */
  /* Conta obrigatória: cada conta tem a sua biblioteca (curtidas, playlists,
     histórico, buscas e volume) guardada neste navegador. A sessão fica aberta
     até o utilizador sair. */
  const ACCOUNTS_KEY = 'onda.contas.v1';
  let storeKey = STORAGE_KEY;
  let authMode = 'login';

  const contas = { users: [], currentId: '' };

  try {
    const rawAccounts = localStorage.getItem(ACCOUNTS_KEY);
    if (rawAccounts) {
      const saved = JSON.parse(rawAccounts);
      if (saved && Array.isArray(saved.users)) {
        contas.users = saved.users.filter(u => u && u.id && u.name && u.hash);
      }
      if (saved && typeof saved.currentId === 'string') contas.currentId = saved.currentId;
    }
  } catch (err) {
    /* localStorage indisponível (modo privado ou file:// bloqueado) */
  }

  if (!contas.users.some(u => u.id === contas.currentId)) contas.currentId = '';

  function saveAccounts() {
    try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(contas)); } catch (err) {}
    if (window.OndaDB) contas.users.forEach(user => window.OndaDB.saveAccount(user));
  }

  /* contas que ficaram guardadas na base de dados voltam para a lista */
  function loadAccountsFromDb() {
    if (!window.OndaDB) return Promise.resolve(0);

    return window.OndaDB.loadAccounts().then(users => {
      if (!Array.isArray(users)) return 0;

      let added = 0;
      users.forEach(user => {
        if (!user || !user.id) return;
        const existing = contas.users.find(u => u.id === user.id);
        if (!existing) {
          contas.users.push(user);
          added += 1;
          return;
        }
        if (!existing.avatar && user.avatar) existing.avatar = user.avatar;
        if (!existing.hash && user.hash) existing.hash = user.hash;
        if (!existing.salt && user.salt) existing.salt = user.salt;
      });

      if (added) {
        try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(contas)); } catch (err) {}
      }
      return added;
    }).catch(() => 0);
  }

  function currentAccount() {
    return contas.users.find(u => u.id === contas.currentId) || null;
  }

  /* conta na nuvem (Firebase) ou conta local (IndexedDB) */
  let cloudUser = null;
  let cloudSaveTimer = 0;

  function isLoggedIn() {
    /* com a nuvem ligada só conta a conta Firebase — é a única que existe
       em todos os aparelhos. Sem nuvem, vale a conta local. */
    if (window.OndaCloud) return !!cloudUser;
    return !!currentAccount();
  }

  function activeUser() {
    if (window.OndaCloud) return cloudUser;
    return currentAccount();
  }

  /* aplica uma biblioteca vinda da nuvem (ou da base de dados local) */
  function applyLibrary(lib) {
    if (!lib) return;

    if (Array.isArray(lib.playlists)) store.playlists = lib.playlists;
    if (Array.isArray(lib.likes)) store.likes = lib.likes;
    if (Array.isArray(lib.recent)) store.recent = lib.recent;
    if (Array.isArray(lib.searches)) store.searches = lib.searches;
    if (Array.isArray(lib.ytTracks)) store.ytTracks = lib.ytTracks;
    if (lib.prefs) {
      if (typeof lib.prefs.volume === 'number') store.prefs.volume = lib.prefs.volume;
      if (typeof lib.prefs.shuffle === 'boolean') store.prefs.shuffle = lib.prefs.shuffle;
      if (typeof lib.prefs.repeat === 'string') store.prefs.repeat = lib.prefs.repeat;
    }

    clearYtTracks();
    store.ytTracks.forEach(record => registerYtTrack(record));

    likedSet.clear();
    store.likes.forEach(id => likedSet.add(id));

    player.shuffle = !!store.prefs.shuffle;
    player.repeat = store.prefs.repeat === 'all' || store.prefs.repeat === 'one' ? store.prefs.repeat : 'off';
  }

  function keyForAccount(id) {
    return 'onda.player.v2:' + id;
  }

  function resetStore() {
    store.likes = [];
    store.playlists = [];
    store.recent = [];
    store.ytTracks = [];
    store.searches = [];
    store.prefs = { volume: 0.8, shuffle: false, repeat: 'off' };
  }

  function applySaved(raw) {
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return;
      if (Array.isArray(saved.likes)) store.likes = saved.likes.filter(id => typeof id === 'string');
      if (Array.isArray(saved.playlists)) {
        store.playlists = saved.playlists.filter(p => p && p.id && Array.isArray(p.tracks));
      }
      if (Array.isArray(saved.recent)) store.recent = saved.recent.filter(id => typeof id === 'string');
      if (Array.isArray(saved.ytTracks)) store.ytTracks = saved.ytTracks;
      if (Array.isArray(saved.searches)) {
        store.searches = saved.searches.filter(s => typeof s === 'string' && s.trim()).slice(0, 8);
      }
      if (saved.prefs && typeof saved.prefs === 'object') {
        if (typeof saved.prefs.volume === 'number') store.prefs.volume = saved.prefs.volume;
        if (typeof saved.prefs.shuffle === 'boolean') store.prefs.shuffle = saved.prefs.shuffle;
        if (typeof saved.prefs.repeat === 'string') store.prefs.repeat = saved.prefs.repeat;
      }
    } catch (err) {}
  }

  /* tira da biblioteca os vídeos que pertenciam à conta anterior */
  function clearYtTracks() {
    while (ytTracks.length) {
      const track = ytTracks.pop();
      if (track && trackById.has(track.id)) trackById.delete(track.id);
    }
  }

  /* carrega a biblioteca da conta activa (ou limpa tudo quando não há conta) */
  function loadStoreFor(accountId) {
    resetStore();
    storeKey = accountId ? keyForAccount(accountId) : STORAGE_KEY;

    let raw = null;
    try { raw = localStorage.getItem(storeKey); } catch (err) {}
    applySaved(raw);

    /* vídeos que esta conta salvou em favoritos/playlists voltam aqui */
    clearYtTracks();
    store.ytTracks.forEach(record => registerYtTrack(record));

    likedSet.clear();
    store.likes.forEach(id => likedSet.add(id));

    player.shuffle = !!store.prefs.shuffle;
    player.repeat = store.prefs.repeat === 'all' || store.prefs.repeat === 'one' ? store.prefs.repeat : 'off';

    /* sem cópia rápida no localStorage, a biblioteca vem da base de dados */
    if (!raw && accountId && window.OndaDB) {
      window.OndaDB.loadLibrary(accountId).then(lib => {
        if (!lib || contas.currentId !== accountId) return;

        if (lib.playlists.length) store.playlists = lib.playlists;
        if (lib.likes.length) store.likes = lib.likes;
        if (lib.recent.length) store.recent = lib.recent;
        if (lib.searches.length) store.searches = lib.searches;
        if (lib.ytTracks.length) store.ytTracks = lib.ytTracks;
        if (lib.prefs) {
          if (typeof lib.prefs.volume === 'number') store.prefs.volume = lib.prefs.volume;
          store.prefs.shuffle = !!lib.prefs.shuffle;
          store.prefs.repeat = lib.prefs.repeat || 'off';
        }

        clearYtTracks();
        store.ytTracks.forEach(record => registerYtTrack(record));
        likedSet.clear();
        store.likes.forEach(id => likedSet.add(id));
        player.shuffle = !!store.prefs.shuffle;
        player.repeat = store.prefs.repeat === 'all' || store.prefs.repeat === 'one' ? store.prefs.repeat : 'off';
        render();
      }).catch(() => {});
    }
  }

  /* a biblioteca que existia antes das contas passa para a primeira conta criada */
  function claimLegacyLibrary(accountId) {
    try {
      const legacy = localStorage.getItem(STORAGE_KEY);
      const target = keyForAccount(accountId);
      if (!legacy || localStorage.getItem(target)) return;
      localStorage.setItem(target, legacy);
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {}
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function simpleHash(text) {
    let h1 = 0x811c9dc5;
    let h2 = 0x1000193;
    for (let i = 0; i < text.length; i += 1) {
      const c = text.charCodeAt(i);
      h1 = ((h1 ^ c) * 0x01000193) >>> 0;
      h2 = (h2 + c * (i + 1)) >>> 0;
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }

  /* devolve [hash_forte, hash_simples] para a mesma palavra-passe */
  function hashVariants(password, salt) {
    const text = salt + ':' + String(password);
    const weak = 'local:' + simpleHash(text);
    const strong = (window.crypto && window.crypto.subtle && window.TextEncoder)
      ? window.crypto.subtle.digest('SHA-256', new window.TextEncoder().encode(text))
          .then(buffer => 'sha256:' + Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0')).join(''))
          .catch(() => weak)
      : Promise.resolve(weak);
    return strong.then(value => [value, weak]);
  }

  function requireAccount() {
    if (isLoggedIn()) return true;
    showAuth('login');
    toast('Crie uma conta para ouvir música');
    return false;
  }

  function afterLogin() {
    /* a cópia local passa a ser por conta da nuvem */
    if (cloudUser) storeKey = 'onda.cloud.v1:' + cloudUser.id;

    player.queue = [];
    player.pos = -1;
    player.currentId = null;
    audio.pause();
    try {
      audio.removeAttribute('src');
      audio.load();
    } catch (err) {}

    setVolume(clamp(typeof store.prefs.volume === 'number' ? store.prefs.volume : 0.8, 0, 1), false);
    hideAuth();
    render();
    updatePlayerBar();
  }

  function createAccount(name, email, password) {
    return new Promise((resolve, reject) => {
      const clean = String(name || '').trim();
      const mail = String(email || '').trim();
      const pass = String(password || '');

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
        reject(new Error('Escreva um email válido (ex.: nome@gmail.com).'));
        return;
      }
      if (pass.length < 4) { reject(new Error('A palavra-passe precisa de 4 caracteres ou mais.')); return; }
      if (contas.users.some(u => u.email && norm(u.email) === norm(mail))) {
        reject(new Error('Já existe uma conta com esse email neste aparelho.'));
        return;
      }

      const display = clean || mail.split('@')[0];
      const salt = randomSalt();
      const id = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 9999).toString(36);

      hashVariants(pass, salt).then(variants => {
        contas.users.push({
          id: id, name: display, email: mail, salt: salt, hash: variants[0], createdAt: Date.now()
        });
        contas.currentId = id;
        claimLegacyLibrary(id);
        saveAccounts();
        loadStoreFor(id);
        resolve(currentAccount());
      }).catch(reject);
    });
  }

  function loginAccount(login, password) {
    return new Promise((resolve, reject) => {
      const typed = String(login || '').trim();
      const user = contas.users.find(u => (u.email && norm(u.email) === norm(typed)) || norm(u.name) === norm(typed));
      if (!user) {
        reject(new Error('Conta não encontrada neste aparelho. Se já tem conta noutro aparelho, use ' +
          '“Tenho conta noutro aparelho — transferir”.'));
        return;
      }

      hashVariants(password, user.salt).then(variants => {
        if (variants.indexOf(user.hash) === -1) {
          reject(new Error('Palavra-passe errada.'));
          return;
        }
        contas.currentId = user.id;
        saveAccounts();
        loadStoreFor(user.id);
        resolve(user);
      }).catch(reject);
    });
  }

  /* ------------- levar a conta para outro aparelho (sem nuvem) -------------
     As contas locais vivem no armazenamento do navegador de cada aparelho e
     nunca passam sozinhas para outro. O código abaixo leva a conta (email,
     sal e palavra-passe) e a biblioteca inteira como texto. */
  function encodeTransfer(user, data) {
    const payload = { v: 1, user: user, store: data || {} };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let bin = '';
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return 'ONDA1.' + btoa(bin);
  }

  function decodeTransfer(code) {
    const clean = String(code || '').replace(/\s+/g, '');
    const body = clean.indexOf('ONDA1.') === 0 ? clean.slice(6) : clean;
    if (!body) throw new Error('Cole o código de transferência do outro aparelho.');

    let bin;
    try { bin = atob(body); } catch (err) { throw new Error('Código inválido ou incompleto. Copie-o outra vez.'); }

    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);

    let data;
    try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch (err) {
      throw new Error('Código inválido ou incompleto. Copie-o outra vez.');
    }
    if (!data || !data.user || !data.user.id || !data.user.hash || !data.user.salt) {
      throw new Error('Este código não é de uma conta do Onda.');
    }
    return data;
  }

  function mergeLibrary(target, incoming) {
    if (!incoming || typeof incoming !== 'object') return;
    let mine = {};
    try {
      const raw = localStorage.getItem(target);
      if (raw) mine = JSON.parse(raw) || {};
    } catch (err) {}

    ['likes', 'playlists', 'recent', 'ytTracks', 'searches'].forEach(field => {
      const add = incoming[field];
      if (!Array.isArray(add)) return;
      if (!Array.isArray(mine[field])) { mine[field] = add.slice(); return; }

      const seen = new Set(mine[field].map(item => (
        item && typeof item === 'object' ? (item.id || JSON.stringify(item)) : String(item)
      )));
      add.forEach(item => {
        const key = item && typeof item === 'object' ? (item.id || JSON.stringify(item)) : String(item);
        if (seen.has(key)) return;
        mine[field].push(item);
        seen.add(key);
      });
    });

    if (incoming.prefs && typeof incoming.prefs === 'object') {
      mine.prefs = Object.assign(
        { volume: 0.8, shuffle: false, repeat: 'off' },
        incoming.prefs,
        mine.prefs && typeof mine.prefs === 'object' ? mine.prefs : {}
      );
    }

    try { localStorage.setItem(target, JSON.stringify(mine)); } catch (err) {}
  }

  function importAccount(code) {
    return new Promise((resolve, reject) => {
      let data;
      try { data = decodeTransfer(code); } catch (err) { reject(err); return; }

      const incoming = data.user;
      let user = contas.users.find(u => u.id === incoming.id) ||
        contas.users.find(u => u.email && incoming.email && norm(u.email) === norm(incoming.email));

      if (user) {
        if (incoming.email) user.email = incoming.email;
        if (incoming.name) user.name = incoming.name;
        if (incoming.salt) user.salt = incoming.salt;
        if (incoming.hash) user.hash = incoming.hash;
        if (incoming.avatar) user.avatar = incoming.avatar;
      } else {
        user = {
          id: incoming.id,
          name: incoming.name || (incoming.email || 'Conta').split('@')[0],
          email: incoming.email || '',
          salt: incoming.salt,
          hash: incoming.hash,
          avatar: incoming.avatar || '',
          createdAt: incoming.createdAt || Date.now()
        };
        contas.users.push(user);
      }

      contas.currentId = user.id;
      mergeLibrary(keyForAccount(user.id), data.store);
      saveAccounts();
      loadStoreFor(user.id);
      resolve(user);
    });
  }

  function logoutAccount() {
    if (window.OndaCloud && cloudUser) window.OndaCloud.signOutUser();
    cloudUser = null;
    contas.currentId = '';
    saveAccounts();

    player.currentId = null;
    player.queue = [];
    player.pos = -1;
    audio.pause();
    try {
      audio.removeAttribute('src');
      audio.load();
    } catch (err) {}

    resetStore();
    clearYtTracks();
    likedSet.clear();
    storeKey = STORAGE_KEY;

    closeNowPlaying();
    render();
    updatePlayerBar();
    showAuth('login');
    toast('Sessão terminada');
  }

  function authHTML() {
    const creating = authMode === 'create';
    const cloud = !!window.OndaCloud;
    const known = cloud ? '' : contas.users.map(u => esc(u.email || u.name)).join(', ');

    return '<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">' +
      '<div class="auth-brand">Onda</div>' +
      '<h1 class="auth-title" id="auth-title">' + (creating ? 'Crie a sua conta' : 'Entre na sua conta') + '</h1>' +
      '<p class="auth-sub">' + (creating
        ? (cloud
            ? 'É obrigatório ter conta para ouvir música. A conta guarda curtidas, playlists e histórico na nuvem.'
            : 'É obrigatório ter conta para ouvir música. Curtidas, playlists e histórico ficam guardados na conta.')
        : 'Entre para ouvir música e recuperar a sua biblioteca.') + '</p>' +
      '<form class="auth-form" id="auth-form">' +
        '<label class="auth-label">' + (cloud || creating ? 'Email' : 'Email ou nome') +
          '<input id="auth-email" type="text" inputmode="email" autocomplete="email" required placeholder="' +
            (cloud || creating ? 'voce@email.com' : 'voce@email.com ou o seu nome') + '">' +
        '</label>' +
        (creating
          ? '<label class="auth-label">Nome' +
              '<input id="auth-name" type="text" autocomplete="nickname" minlength="2" placeholder="O seu nome">' +
            '</label>'
          : '') +
        '<label class="auth-label">Palavra-passe' +
          '<input id="auth-pass" type="password" autocomplete="' + (creating ? 'new-password' : 'current-password') +
            '" required minlength="' + (cloud ? '6' : '4') + '" placeholder="' +
            (cloud ? 'Mínimo 6 caracteres' : 'Mínimo 4 caracteres') + '">' +
        '</label>' +
        (creating
          ? '<label class="auth-label">Repetir palavra-passe' +
              '<input id="auth-pass2" type="password" autocomplete="new-password" required minlength="' +
                (cloud ? '6' : '4') + '" placeholder="Repita a palavra-passe">' +
            '</label>'
          : '') +
        '<div class="auth-error" id="auth-error" role="alert"></div>' +
        '<button class="auth-submit" id="auth-submit" type="submit">' +
          (creating ? 'Criar conta e ouvir' : 'Entrar e ouvir') +
        '</button>' +
      '</form>' +
      '<button class="auth-switch" type="button" data-auth-switch="' + (creating ? 'login' : 'create') + '">' +
        (creating ? 'Já tenho conta — entrar' : 'Ainda não tenho conta — criar') +
      '</button>' +
      (cloud
        ? '<p class="auth-accounts">Conta na nuvem (Firebase): a mesma conta abre a biblioteca em qualquer aparelho.</p>'
        : (offlineMode()
            ? '<p class="auth-accounts">Modo sem nuvem: a conta fica só neste aparelho.</p>'
            : (known ? '<p class="auth-accounts">Contas neste aparelho: ' + known + '</p>' : ''))) +
    '</div>';
  }

  const CLOUD_DOWN_MSG = 'Conta na nuvem indisponível (chave do Firebase inválida). ' +
    'Entre ou crie uma conta neste aparelho — a música e a pesquisa continuam a funcionar.';

  /* passa para conta local sem pedir nada ao utilizador */
  function useLocalAuth() {
    try { localStorage.setItem(NO_CLOUD_KEY, '1'); } catch (err) {}
    window.OndaCloud = null;
    showAuth(authMode);
    const box = document.querySelector('#auth-error');
    if (box) box.textContent = CLOUD_DOWN_MSG;
  }

  function showAuth(mode) {
    authMode = mode === 'create' ? 'create' : 'login';
    let el = document.getElementById('auth');
    if (!el) {
      el = document.createElement('div');
      el.id = 'auth';
      el.className = 'auth';
      document.body.appendChild(el);
    }
    el.innerHTML = authHTML();
    el.classList.add('open');
    document.body.classList.add('locked');

    const input = el.querySelector('#auth-email') || el.querySelector('#auth-name') || el.querySelector('#auth-code');
    if (input) setTimeout(() => { try { input.focus(); } catch (err) {} }, 60);
  }

  function hideAuth() {
    const el = document.getElementById('auth');
    if (el) {
      el.classList.remove('open');
      el.innerHTML = '';
    }
    document.body.classList.remove('locked');
  }

  function submitAuth() {
    const el = document.getElementById('auth');
    if (!el) return;

    const nameEl = el.querySelector('#auth-name');
    const emailEl = el.querySelector('#auth-email');
    const passEl = el.querySelector('#auth-pass');
    const pass2El = el.querySelector('#auth-pass2');
    const errorEl = el.querySelector('#auth-error');
    const button = el.querySelector('#auth-submit');
    const creating = authMode === 'create';
    const cloud = !!window.OndaCloud;
    const name = nameEl ? nameEl.value : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const pass = passEl ? passEl.value : '';

    if (errorEl) errorEl.textContent = '';
    if (creating && pass2El && pass2El.value !== pass) {
      if (errorEl) errorEl.textContent = 'As palavras-passe não coincidem.';
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = 'Aguarde…';
    }

    const fail = err => {
      if (button) {
        button.disabled = false;
        button.textContent = creating ? 'Criar conta e ouvir' : 'Entrar e ouvir';
      }
      const message = (window.OndaCloud && window.OndaCloud.friendly)
        ? window.OndaCloud.friendly(err)
        : (err && err.message) || 'Não foi possível continuar.';
      if (errorEl) errorEl.textContent = message;

      /* chave do Firebase apagada/expirada: passa para conta local, sem botões */
      const code = (err && err.code) || '';
      const raw = (err && err.message) || '';
      const brokenKey = code === 'auth/api-key-expired' || code === 'auth/api-key-not-valid' ||
        code === 'auth/invalid-api-key' || /api[-\s]?key[^)]*(expired|not\s*valid|invalid)/i.test(raw);
      if (cloud && brokenKey) {
        useLocalAuth();
      }
    };

    /* na nuvem: Firebase Authentication + Firestore */
    if (cloud) {
      /* ao criar conta, aquilo que já existe neste aparelho (curtidas,
         playlists, histórico) passa para a conta nova */
      let localSnapshot = null;
      if (creating) {
        try { localSnapshot = JSON.parse(JSON.stringify(store)); } catch (err) { localSnapshot = null; }
      }

      const cloudAction = creating
        ? window.OndaCloud.signUp(name, email, pass)
        : window.OndaCloud.signIn(email, pass);

      cloudAction.then(user => {
        cloudUser = {
          id: user.id,
          name: user.name || '',
          email: user.email || email,
          avatar: user.avatar || ''
        };
        storeKey = 'onda.cloud.v1:' + user.id;
        return window.OndaCloud.loadLibrary(user.id).then(lib => {
          const empty = !lib || (
            !lib.playlists.length && !lib.likes.length && !lib.recent.length &&
            !lib.searches.length && !lib.ytTracks.length
          );
          const hasLocal = localSnapshot && (
            localSnapshot.playlists.length || localSnapshot.likes.length || localSnapshot.recent.length ||
            localSnapshot.ytTracks.length || localSnapshot.searches.length
          );
          if (creating && empty && hasLocal) {
            applyLibrary(localSnapshot);
            save();
          } else {
            applyLibrary(lib);
          }
        });
      }).then(() => {
        afterLogin();
        toast(creating ? 'Conta criada na nuvem. Boas músicas!' : 'Bem-vindo de volta!');
      }).catch(fail);
      return;
    }

    const action = creating ? createAccount(name, email, pass) : loginAccount(email, pass);
    action.then(() => {
      afterLogin();
      toast(creating ? 'Conta criada. Boas músicas!' : 'Bem-vindo de volta!');
    }).catch(fail);
  }

  function submitImport() {
    const el = document.getElementById('auth');
    if (!el) return;

    const codeEl = el.querySelector('#auth-code');
    const errorEl = el.querySelector('#auth-error');
    const button = el.querySelector('#auth-import');

    if (errorEl) errorEl.textContent = '';
    if (button) {
      button.disabled = true;
      button.textContent = 'A importar…';
    }

    importAccount(codeEl ? codeEl.value : '').then(() => {
      afterLogin();
      toast('Conta e biblioteca transferidas. Boas músicas!');
    }).catch(err => {
      if (button) {
        button.disabled = false;
        button.textContent = 'Importar e entrar';
      }
      if (errorEl) errorEl.textContent = (err && err.message) || 'Não foi possível importar o código.';
    });
  }

  const likedSet = new Set(store.likes);
  const ytTracks = [];
  const player = {
    queue: [],
    pos: -1,
    currentId: null,
    source: { kind: 'taste', label: 'Baseado no seu gosto' },
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
    if (!isLoggedIn()) return;
    /* cópia rápida local, para a interface arrancar sem esperar pela rede */
    try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch (err) {}

    if (window.OndaDB && !cloudUser) window.OndaDB.saveLibrary(contas.currentId, store);

    if (cloudUser && window.OndaCloud) {
      clearTimeout(cloudSaveTimer);
      cloudSaveTimer = setTimeout(() => {
        window.OndaCloud.saveLibrary(cloudUser.id, store).catch(() => {});
      }, 700);
    }
  };

  /* catálogo, arquivos locais e os vídeos salvos na conta */

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

  function coverFor(track, cls) {
    if (track && track.thumb) {
      return '<div class="cover cover-img ' + (cls || '') + '" style="background-image:url(\'' +
        esc(track.thumb) + '\')"></div>';
    }
    return coverHTML(track ? track.album : '', track ? track.colors : null, cls);
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
  const navProfileBtn = $('#nav-profile');
  const backBtn = $('#btn-back');
  const menuToggleBtn = $('#btn-menu');
  const createPlaylistBtn = $('#btn-create-playlist');
  const addFilesBtn = $('#btn-add-files');
  const fileInput = $('#file-input');
  const sidebarEl = $('#sidebar');

  const npBlock = $('.np');
  const npCover = $('#np-cover');
  const npTitle = $('#np-title');
  const npArtist = $('#np-artist');
  const searchDrop = $('#search-drop');
  const searchHistBtn = $('#btn-search-history');
  const npLike = $('#np-like');
  const npPanel = $('#np-panel');
  const npArt = $('#np-art');
  const npSource = $('#np-source');
  const npBigTitle = $('#np-big-title');
  const npBigArtist = $('#np-big-artist');
  const npPanelLike = $('#np-panel-like');
  const npPanelAdd = $('#np-panel-add');
  const npPanelQueue = $('#np-panel-queue');
  const npPanelPlay = $('#np-panel-play');
  const npPanelPrev = $('#np-panel-prev');
  const npPanelNext = $('#np-panel-next');
  const npPanelShuffle = $('#np-panel-shuffle');
  const npPanelRepeat = $('#np-panel-repeat');
  const npPanelSeek = $('#np-panel-seek');
  const npPanelCur = $('#np-panel-cur');
  const npPanelDur = $('#np-panel-dur');
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
  const queueEl = $('#queue');
  const queueBtn = $('#btn-queue');
  const tabHome = $('#tab-home');
  const tabSearch = $('#tab-search');
  const tabProfile = $('#tab-profile');
  const tabLibrary = $('#tab-library');

  /* ---------------------------- duração ---------------------------- */
  function paintDuration(id, seconds) {
    viewEl.querySelectorAll('[data-dur="' + id + '"]').forEach(el => {
      el.textContent = seconds ? fmt(seconds) : '--:--';
    });
  }

  function queueDurations(ids) {
    ids.forEach(id => {
      const track = trackById.get(id);
      /* a duração do YouTube vem do player, não de uma tag de áudio */
      if (track && track.yt) return;
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
      '<div class="vh-cover">' + (o.coverImg
        ? '<div class="cover cover-img" style="background-image:url(\'' + esc(o.coverImg) + '\')"></div>'
        : coverHTML(o.coverTitle, o.colors, '', o.coverIcon || '')) + '</div>' +
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
        '<div class="row-cover">' + coverFor(track) + '</div>' +
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

    const localSection = localTracks.length
      ? sectionHTML('Suas músicas do computador', trackListHTML(localTracks.map(t => t.id)))
      : '';
    const albumSection = albums.length
      ? sectionHTML('Feito para você', '<div class="cards">' + cards + '</div>')
      : '';
    const saved = allIds();
    const savedSection = saved.length ? sectionHTML('Músicas salvas', trackListHTML(saved)) : '';

    return '<div class="home-top"><h1>' + greeting + '</h1><div class="tiles">' + tiles + '</div></div>' +
      albumSection +
      localSection +
      savedSection +
      '<div class="note"><strong>Músicas:</strong> pesquise na barra acima — os resultados do YouTube aparecem ' +
        'sozinhos. Toque num resultado e ele toca no player do app, com capa e controlos na barra de baixo e no ' +
        'painel “a tocar”. Arquivos do seu computador entram em “Minhas músicas”.</div>';
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
      const saved = allIds();
      return '<div class="view-body search-body"><h1 class="page-title">Buscar</h1>' +
        '<p class="page-sub">Escreva o nome de uma música, artista ou álbum — os resultados do YouTube aparecem sozinhos.</p>' +
        (saved.length ? subSection('Músicas salvas', trackListHTML(saved)) : '') +
        '<div class="note"><strong>Histórico:</strong> fica na própria barra de pesquisa — clique nela para ver as ' +
          'músicas tocadas e as buscas recentes, e escreva para filtrar.</div>' +
        '</div>';
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

    /* só áudio: o player do YouTube roda em #yt-stage, fora da tela e fora
       da view, para continuar tocando quando a tela é redesenhada */
    const engine = isFileProtocol()
      ? '<div class="yt-blocked">' +
          '<strong>Este áudio não toca com o app aberto por file://</strong>' +
          '<p>O player do YouTube exige que a página envie um endereço http de origem ' +
            '(erro 153) e isso não existe em <code>file://</code>. ' +
            'Execute o <strong>iniciar.bat</strong> nesta pasta e abra ' +
            '<code>http://localhost:8080</code> — aí toca normalmente.</p>' +
        '</div>'
      : '';

    return engine +
      '<div class="yt-player">' +
        '<div class="yt-now">' +
          '<span class="yt-now-info">' +
            '<span class="yt-now-cover"><img src="https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg" alt="" loading="lazy"></span>' +
            '<span class="yt-now-text"><strong>' + esc(yt.playing.title) + '</strong>' +
              '<span>' + esc(yt.playing.author || 'YouTube') + '</span></span>' +
          '</span>' +
        '</div>' +
      '</div>';
  }

  function ytGridHTML() {
    return '<div class="yt-grid">' + yt.results.map(item => {
      const isLiked = likedSet.has(ytTrackId(item.id));
      const data = ' data-yt-title="' + esc(item.title) + '" data-yt-author="' + esc(item.author) + '"';

      return '<div class="yt-card" role="button" tabindex="0" data-yt-play="' + esc(item.id) + '"' + data + '>' +
        '<span class="yt-thumb">' +
          (item.thumb ? '<img src="' + esc(item.thumb) + '" alt="" loading="lazy">' : '') +
          '<span class="yt-badge">' + ICONS.youtubeBadge + '</span>' +
        '</span>' +
        '<span class="yt-card-text">' +
          '<span class="yt-card-title">' + esc(item.title) + '</span>' +
          '<span class="yt-card-sub">' + esc(item.author) + '</span>' +
        '</span>' +
        '<span class="yt-card-tools">' +
          '<button type="button" class="icon-btn heart-btn' + (isLiked ? ' liked' : '') + '" data-yt-like="' +
            esc(item.id) + '"' + data + ' aria-label="' +
            (isLiked ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '" title="Favoritar">' +
            (isLiked ? ICONS.heartFilled : ICONS.heart) + '</button>' +
          '<button type="button" class="icon-btn" data-yt-save="' + esc(item.id) + '"' + data +
            ' aria-label="Adicionar a uma playlist" title="Adicionar a uma playlist">' + ICONS.plus + '</button>' +
        '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  function currentSearchTerm() {
    return route.name === 'search' ? route.q : '';
  }

  function ytPanelHTML(term) {
    if (!ytKey) {
      if (!term) return '';
      return '<section class="yt-panel">' +
        '<div class="yt-panel-head"><h2 class="section-title">YouTube</h2></div>' +
        '<div class="empty">Para buscar vídeos do YouTube falta a chave da YouTube Data API. ' +
        'Preencha <code>youtubeApiKey</code> em <code>js/config.js</code>.</div>' +
      '</section>';
    }
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

  /* -------- vídeos do YouTube salvos (favoritos e playlists) -------- */
  function ytTrackId(videoId) {
    return 'yt-' + String(videoId || '').trim();
  }

  function ytThumb(videoId) {
    return 'https://i.ytimg.com/vi/' + encodeURIComponent(videoId) + '/mqdefault.jpg';
  }

  function registerYtTrack(record) {
    if (!record || !record.videoId) return null;
    const id = ytTrackId(record.videoId);
    if (trackById.has(id)) return trackById.get(id);

    const track = {
      id: id,
      videoId: record.videoId,
      title: record.title || 'Vídeo do YouTube',
      artist: record.artist || 'YouTube',
      album: 'YouTube',
      colors: YT_COLORS,
      thumb: record.thumb || ytThumb(record.videoId),
      src: '',
      yt: true
    };
    ytTracks.push(track);
    trackById.set(id, track);
    return track;
  }

  function ensureYtTrack(videoId, title, artist) {
    return trackById.get(ytTrackId(videoId)) || registerYtTrack({ videoId: videoId, title: title, artist: artist });
  }

  function persistYtTracks() {
    store.ytTracks = ytTracks.map(track => ({
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      thumb: track.thumb
    }));
    save();
  }

  /* sai do catálogo interno quando o vídeo não é mais favorito nem está em playlist */
  function dropOrphanYtTrack(id) {
    const track = trackById.get(id);
    if (!track || !track.yt) return;
    if (likedSet.has(id)) return;
    if (player.currentId === id) return;
    if (yt.playing && yt.playing.trackId === id) return;
    if (store.playlists.some(pl => pl.tracks.indexOf(id) !== -1)) return;

    trackById.delete(id);
    const index = ytTracks.findIndex(item => item.id === id);
    if (index !== -1) ytTracks.splice(index, 1);
    persistYtTracks();
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
    const stage = $('#yt-stage');
    if (stage) stage.innerHTML = '';
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
    const stage = $('#yt-stage');
    if (!stage || !yt.playing || yt.player || isFileProtocol()) return;

    const videoId = yt.playing.id;
    ensureYtApi(function () {
      if (yt.player || !yt.playing || yt.playing.id !== videoId || !window.YT) return;

      let target = $('#yt-embed');
      if (!target) {
        target = document.createElement('div');
        target.id = 'yt-embed';
        stage.appendChild(target);
      }

      yt.player = new window.YT.Player(target, {
        videoId: videoId,
        /* controls/fs desligados: nada de interface do YouTube para tocar e
           nenhuma hipótese de abrir o YouTube por um toque no vídeo */
        playerVars: {
          autoplay: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          origin: window.location.origin
        },
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

    if (event.data === states.ENDED) nextTrack(true);

    if (event.data === states.PLAYING) {
      startYtTick();
    } else {
      cancelAnimationFrame(ytRafId);
      ytRafId = 0;
    }

    syncPlayIcon();
    updatePlayerBar();
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

  function playYouTube(id, title, author, trackId) {
    if (!id) return;
    audio.pause();
    destroyYtPlayer();

    const track = trackId && trackById.has(trackId)
      ? trackById.get(trackId)
      : trackById.get(ytTrackId(id));

    if (track) {
      player.currentId = track.id;
      const index = player.queue.indexOf(track.id);
      if (index === -1) {
        player.queue = [track.id];
        player.pos = 0;
      } else {
        player.pos = index;
      }
    } else {
      /* vídeo avulso: não dá para pular de faixa */
      player.currentId = null;
      player.queue = [];
      player.pos = -1;
      player.source = { kind: 'taste', label: SOURCE_LABELS.taste };
    }

    yt.playing = {
      id: id,
      title: title || 'Vídeo do YouTube',
      author: author || '',
      trackId: track ? track.id : null
    };
    paintYtPlayer();
    updatePlayerBar();
    /* não rola nem troca de tela: a busca e os resultados continuam onde estão */
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

  function historyHTML() {
    const ids = historyIds();

    return heroHTML({
      colors: HISTORY_COLORS,
      coverTitle: 'Histórico',
      coverIcon: ICONS.clock,
      type: 'Sua conta',
      title: 'Histórico',
      subtitle: ids.length + (ids.length === 1 ? ' música tocada' : ' músicas tocadas'),
      actions:
        '<button class="play-fab" data-act="play-history" aria-label="Tocar histórico">' + ICONS.play + '</button>' +
        '<button class="btn" data-act="play-history">' + ICONS.play + '<span>Tocar histórico</span></button>' +
        '<button class="btn danger" data-act="clear-history">' + ICONS.trash + '<span>Limpar</span></button>',
      body: trackListHTML(ids, {
        empty: 'Nada no histórico ainda. Toque uma música e ela aparece aqui.'
      })
    });
  }

  function clearHistory() {
    if (!store.recent.length) {
      toast('O histórico já está vazio');
      return;
    }
    if (!window.confirm('Limpar o histórico de músicas?')) return;
    store.recent = [];
    save();
    render();
    toast('Histórico limpo');
  }

  /* -------------------- imagem de perfil da conta -------------------- */
  function resizeImage(file, size) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida'));
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, size / Math.max(img.width, img.height));
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } catch (err) {
            reject(err);
          }
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function pickAvatar() {
    const account = activeUser();
    if (!account) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;

      resizeImage(file, 256).then(dataUrl => {
        account.avatar = dataUrl;

        if (cloudUser && window.OndaCloud) {
          window.OndaCloud.saveAccount(cloudUser.id, { avatar: dataUrl }).catch(() => {});
        } else {
          saveAccounts();
        }

        render();
        toast('Imagem de perfil atualizada');
      }).catch(() => toast('Não foi possível usar essa imagem.'));
    });
    input.click();
  }

  function clearAvatar() {
    const account = activeUser();
    if (!account || !account.avatar) return;

    delete account.avatar;

    if (cloudUser && window.OndaCloud) {
      window.OndaCloud.saveAccount(cloudUser.id, { avatar: '' }).catch(() => {});
    } else {
      saveAccounts();
    }

    render();
    toast('Imagem de perfil removida');
  }

  function profileHTML() {
    const stat = (value, label) => '<div class="stat"><strong>' + value + '</strong><span>' + esc(label) + '</span></div>';
    const account = activeUser();
    const nome = account ? account.name || account.email || 'Sem conta' : 'Sem conta';
    const avatar = account && account.avatar ? account.avatar : '';
    const playlists = store.playlists.length;
    const locals = localTracks.length;
    const likes = likedTrackIds().length;

    return heroHTML({
      colors: PROFILE_COLORS,
      coverTitle: 'Perfil',
      coverIcon: ICONS.user,
      coverImg: avatar,
      type: 'Sua conta',
      title: nome,
      subtitle: cloudUser ? 'Sua biblioteca fica guardada na nuvem' : 'Sua biblioteca fica guardada nesta conta',
      actions:
        '<button class="btn" data-act="change-avatar">' + ICONS.user + '<span>' +
          (avatar ? 'Mudar imagem' : 'Escolher imagem') + '</span></button>' +
        (avatar ? '<button class="btn" data-act="clear-avatar">' + ICONS.trash + '<span>Remover imagem</span></button>' : '') +
        '<button class="btn" data-act="create-playlist">' + ICONS.plus + '<span>Nova playlist</span></button>' +
        '<button class="btn" data-act="add-files">' + ICONS.upload + '<span>Adicionar músicas</span></button>' +
        '<button class="btn" data-act="logout">' + ICONS.close + '<span>Terminar sessão</span></button>',
      body:
        '<div class="stats">' +
          stat(likes, likes === 1 ? 'música curtida' : 'músicas curtidas') +
          stat(playlists, playlists === 1 ? 'playlist' : 'playlists') +
          stat(store.recent.length, 'no histórico') +
          stat(locals, locals === 1 ? 'arquivo local' : 'arquivos locais') +
        '</div>' +
        '<div class="note"><strong>Conta “' + esc(nome) + '”:</strong> curtidas, playlists (com as músicas de ' +
          'cada uma), histórico, buscas e volume ficam guardados na base de dados do app. Ao sair, a biblioteca ' +
          'continua guardada e volta quando entrar de novo.</div>'
    });
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
    if (route.name === 'history') return historyHTML();
    if (route.name === 'profile') return profileHTML();
    if (route.name === 'search') return searchHTML(route.q);
    return homeHTML();
  }

  /* --------------------------- renderização --------------------------- */
  function renderTabbar() {
    if (!tabHome) return;
    tabHome.classList.toggle('active', route.name === 'home');
    tabSearch.classList.toggle('active', route.name === 'search');
    tabProfile.classList.toggle('active', route.name === 'profile');
    tabLibrary.classList.toggle('active', sidebarEl.classList.contains('open'));
  }

  function renderSidebar() {
    navHomeBtn.classList.toggle('active', route.name === 'home');
    navSearchBtn.classList.toggle('active', route.name === 'search');
    if (navProfileBtn) navProfileBtn.classList.toggle('active', route.name === 'profile');
    renderTabbar();

    const likedCount = likedTrackIds().length;
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
      '</button>',
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
    updateMediaSessionState();
  }

  /* pinta o progresso na barra e no painel “a tocar” ao mesmo tempo */
  function paintProgress(cur, dur) {
    const pct = dur ? (cur / dur) * 1000 : 0;

    seekEl.value = String(pct);
    setRangeFill(seekEl, pct / 10);
    tCurrent.textContent = fmt(cur);
    tTotal.textContent = dur ? fmt(dur) : '0:00';
    seekEl.disabled = !dur;

    if (npPanelSeek) {
      npPanelSeek.value = String(pct);
      setRangeFill(npPanelSeek, pct / 10);
      npPanelCur.textContent = fmt(cur);
      npPanelDur.textContent = dur ? fmt(dur) : '0:00';
      npPanelSeek.disabled = !dur;
    }

    updateMediaSessionPosition(cur, dur);
  }

  function updateProgress() {
    if (yt.playing) {
      const dur = yt.ready && yt.player ? Number(yt.player.getDuration()) || 0 : 0;
      const cur = yt.ready && yt.player ? Number(yt.player.getCurrentTime()) || 0 : 0;
      paintProgress(cur, dur);

      if (yt.playing.trackId && dur && metaCache.get(yt.playing.trackId) !== dur) {
        metaCache.set(yt.playing.trackId, dur);
        paintDuration(yt.playing.trackId, dur);
      }
      return;
    }

    const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
    const cur = audio.currentTime || 0;
    paintProgress(cur, dur);

    if (dur && player.currentId && metaCache.get(player.currentId) !== dur) {
      metaCache.set(player.currentId, dur);
      paintDuration(player.currentId, dur);
    }
  }

  function updatePlayerBar() {
    const track = player.currentId ? trackById.get(player.currentId) : null;

    if (yt.playing) {
      const thumb = 'https://i.ytimg.com/vi/' + encodeURIComponent(yt.playing.id) + '/mqdefault.jpg';
      const ytTrack = yt.playing.trackId ? trackById.get(yt.playing.trackId) : null;
      const ytLiked = !!(ytTrack && likedSet.has(ytTrack.id));

      npCover.style.backgroundImage = 'url("' + thumb + '")';
      npCover.innerHTML = '';
      npTitle.textContent = yt.playing.title;
      npArtist.textContent = yt.playing.author || 'YouTube';
      npLike.disabled = !ytTrack;
      npLike.classList.toggle('active', ytLiked);
      npLike.innerHTML = '<span class="ico">' + (ytLiked ? ICONS.heartFilled : ICONS.heart) + '</span>';
      npLike.setAttribute('aria-label', ytLiked ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
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
    repeatBtn.title = repeatLabel();

    syncPlayIcon();
    updateProgress();
    volumeEl.value = String(Math.round(yt.volume * 100));
    setRangeFill(volumeEl, yt.volume * 100);
    muteBtn.innerHTML = '<span class="ico">' + (yt.muted ? ICONS.volumeOff : ICONS.volume) + '</span>';

    if (npPanelOpen()) renderNowPlaying();
    updateMediaSession();
  }

  /* ------------------ reprodução em segundo plano ------------------ */
  /* Com a Media Session o sistema mostra a música no aviso do telemóvel e no
     ecrã de bloqueio, e mantém o áudio a tocar quando o ecrã desliga, o app vai
     para segundo plano ou o utilizador passa para outra aplicação. */
  const mediaSession = 'mediaSession' in navigator ? navigator.mediaSession : null;
  const ONDA_ARTWORK = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
    '<rect width="512" height="512" fill="#000"/>' +
    '<circle cx="256" cy="256" r="150" fill="#1ed760"/>' +
    '<path d="M168 276c28-36 56-36 84 0s56 36 84 0" fill="none" stroke="#000" stroke-width="26" stroke-linecap="round"/>' +
    '</svg>'
  );
  let mediaPositionAt = 0;

  function mediaArtwork(url) {
    return url
      ? [{ src: url, sizes: '320x180', type: 'image/jpeg' }]
      : [{ src: ONDA_ARTWORK, sizes: '512x512', type: 'image/svg+xml' }];
  }

  function updateMediaSession() {
    if (!mediaSession || typeof window.MediaMetadata !== 'function') return;

    let info = null;
    if (yt.playing) {
      info = {
        title: yt.playing.title,
        artist: yt.playing.author || 'YouTube',
        album: 'Onda',
        artwork: mediaArtwork('https://i.ytimg.com/vi/' + encodeURIComponent(yt.playing.id) + '/mqdefault.jpg')
      };
    } else if (player.currentId && trackById.has(player.currentId)) {
      const track = trackById.get(player.currentId);
      info = {
        title: track.title,
        artist: track.artist,
        album: track.album || 'Onda',
        artwork: mediaArtwork(track.thumb || '')
      };
    }

    try {
      mediaSession.metadata = info ? new window.MediaMetadata(info) : null;
    } catch (err) {}
  }

  function updateMediaSessionState() {
    if (!mediaSession) return;
    try { mediaSession.playbackState = isPlayingNow() ? 'playing' : 'paused'; } catch (err) {}
  }

  /* progresso no ecrã de bloqueio (no máximo uma vez por segundo) */
  function updateMediaSessionPosition(cur, dur) {
    if (!mediaSession || typeof mediaSession.setPositionState !== 'function') return;
    if (!(dur > 0) || !Number.isFinite(cur)) return;
    const now = Date.now();
    if (now - mediaPositionAt < 1000) return;
    mediaPositionAt = now;
    try {
      mediaSession.setPositionState({
        duration: dur,
        position: clamp(cur, 0, dur),
        playbackRate: audio.playbackRate || 1
      });
    } catch (err) {}
  }

  function mediaSeekBy(delta) {
    const step = Number(delta) || 10;
    if (yt.playing) {
      if (!yt.ready || !yt.player) return;
      try {
        const dur = Number(yt.player.getDuration()) || 0;
        yt.player.seekTo(clamp((Number(yt.player.getCurrentTime()) || 0) + step, 0, dur), true);
      } catch (err) {}
      updateProgress();
      return;
    }
    const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (!dur) return;
    audio.currentTime = clamp(audio.currentTime + step, 0, dur);
    updateProgress();
  }

  function mediaSeekTo(seconds) {
    if (yt.playing) {
      if (!yt.ready || !yt.player) return;
      try { yt.player.seekTo(Math.max(0, Number(seconds) || 0), true); } catch (err) {}
      updateProgress();
      return;
    }
    const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (!dur) return;
    audio.currentTime = clamp(Number(seconds) || 0, 0, dur);
    updateProgress();
  }

  /* botões do aviso do sistema / ecrã de bloqueio */
  function registerMediaSession() {
    if (!mediaSession || typeof mediaSession.setActionHandler !== 'function') return;

    const handlers = {
      play: () => { if (!isPlayingNow()) togglePlay(); },
      pause: () => { if (isPlayingNow()) togglePlay(); },
      previoustrack: () => prevTrack(),
      nexttrack: () => nextTrack(false),
      seekbackward: details => mediaSeekBy(-((details && details.seekOffset) || 10)),
      seekforward: details => mediaSeekBy((details && details.seekOffset) || 10),
      seekto: details => {
        if (details && typeof details.seekTime === 'number') mediaSeekTo(details.seekTime);
      },
      stop: () => {
        audio.pause();
        stopYouTubePlayback();
        syncPlayIcon();
        updateProgress();
      }
    };

    Object.keys(handlers).forEach(action => {
      try { mediaSession.setActionHandler(action, handlers[action]); } catch (err) {}
    });
  }

  /* --------------- abrir a faixa que está a tocar --------------- */
  function focusTrackRow(id) {
    const row = viewEl.querySelector('.row[data-track-id="' + id + '"]');
    if (!row) return;
    row.classList.add('focus');
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => row.classList.remove('focus'), 1800);
  }

  /* ------------------- painel “a tocar” (estilo Spotify) ------------------- */
  function npPanelOpen() {
    return !!(npPanel && npPanel.classList.contains('open'));
  }

  /* faixa que o painel controla: o vídeo salvo ou a música do catálogo */
  function npActiveId() {
    if (yt.playing && yt.playing.trackId && trackById.has(yt.playing.trackId)) return yt.playing.trackId;
    if (player.currentId && trackById.has(player.currentId)) return player.currentId;
    return null;
  }

  function repeatLabel() {
    return 'Repetir: ' + (player.repeat === 'off' ? 'desligado' : player.repeat === 'all' ? 'playlist' : 'uma música');
  }

  function closeNowPlaying() {
    if (!npPanelOpen()) return;
    npPanel.classList.remove('open');
    npPanel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('np-open');
  }

  function renderNowPlaying() {
    if (!npPanel) return;

    const id = npActiveId();
    const track = id ? trackById.get(id) : null;
    const liked = !!(id && likedSet.has(id));
    const alive = !!(track || yt.playing);

    if (yt.playing) {
      npArt.style.backgroundImage = 'url("' + ytThumb(yt.playing.id) + '")';
      npArt.innerHTML = '';
      npBigTitle.textContent = yt.playing.title;
      npBigArtist.textContent = yt.playing.author || 'YouTube';
    } else if (track) {
      if (track.thumb) {
        npArt.style.backgroundImage = 'url("' + track.thumb + '")';
        npArt.innerHTML = '';
      } else {
        npArt.style.backgroundImage = 'linear-gradient(135deg,' + track.colors[0] + ',' + track.colors[1] + ')';
        npArt.innerHTML = '<span>' + esc(initials(track.album)) + '</span>';
      }
      npBigTitle.textContent = track.title;
      npBigArtist.textContent = track.album && track.album !== 'YouTube'
        ? track.artist + ' · ' + track.album
        : track.artist;
    } else {
      npArt.style.backgroundImage = '';
      npArt.innerHTML = '<span>♪</span>';
      npBigTitle.textContent = 'Escolha uma música';
      npBigArtist.textContent = 'Onda';
    }

    npSource.textContent = yt.playing
      ? 'YouTube'
      : (player.currentId ? sourceLabel(player.source.kind, player.source.label) : 'Onda');

    npPanelLike.disabled = !alive;
    npPanelLike.classList.toggle('active', liked);
    npPanelLike.innerHTML = '<span class="ico">' + (liked ? ICONS.heartFilled : ICONS.heart) + '</span>';
    npPanelLike.setAttribute('aria-label', liked ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    npPanelLike.title = liked ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    npPanelAdd.disabled = !alive;

    const playing = isPlayingNow();
    npPanelPlay.innerHTML = '<span class="ico">' + (playing ? ICONS.pause : ICONS.play) + '</span>';
    npPanelPlay.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');

    npPanelShuffle.classList.toggle('active', player.shuffle);
    npPanelRepeat.classList.toggle('active', player.repeat !== 'off');
    npPanelRepeat.classList.toggle('one', player.repeat === 'one');
    npPanelRepeat.title = repeatLabel();

    const many = player.queue.length > 1;
    npPanelPrev.disabled = !many;
    npPanelNext.disabled = !many;
  }

  function openNowPlaying() {
    if (!npPanel) return;
    if (!player.currentId && !yt.playing) {
      toast('Escolha uma música primeiro');
      return;
    }
    renderNowPlaying();
    npPanel.classList.add('open');
    npPanel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('np-open');
  }

  /* curtir e guardar em playlist direto do painel */
  function likeNowPlaying() {
    const id = npActiveId();
    if (id) { toggleLike(id); return; }
    if (!yt.playing) return;
    const track = ensureYtTrack(yt.playing.id, yt.playing.title, yt.playing.author);
    if (track) toggleLike(track.id);
  }

  function addNowPlaying(anchor) {
    const id = npActiveId();
    if (id) { openTrackMenu(id, anchor); return; }
    if (!yt.playing) return;
    const track = ensureYtTrack(yt.playing.id, yt.playing.title, yt.playing.author);
    if (track) openTrackMenu(track.id, anchor);
  }

  /* aleatório, repetir e avançar valem para a barra e para o painel */
  function toggleShuffle() {
    player.shuffle = !player.shuffle;
    persistPrefs();
    updatePlayerBar();
    toast(player.shuffle ? 'Aleatório ativado' : 'Aleatório desativado');
  }

  function cycleRepeat() {
    player.repeat = player.repeat === 'off' ? 'all' : player.repeat === 'all' ? 'one' : 'off';
    persistPrefs();
    updatePlayerBar();
    toast(repeatLabel());
  }

  function seekTo(value) {
    const pct = clamp(Number(value) || 0, 0, 1000) / 1000;

    if (yt.playing) {
      if (!yt.ready || !yt.player) return;
      const dur = Number(yt.player.getDuration()) || 0;
      if (!dur) return;
      try { yt.player.seekTo(pct * dur, true); } catch (err) {}
      updateProgress();
      return;
    }

    const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (!dur) return;
    audio.currentTime = pct * dur;
    updateProgress();
  }

  /* ------------------------- fila de reprodução ------------------------- */
  function sourceLabel(kind, label) {
    if (label) return label;
    if (kind === 'playlist') {
      const pl = getPlaylist(route.id);
      return pl ? pl.name : SOURCE_LABELS.playlist;
    }
    if (kind === 'album') {
      const album = albumById.get(route.id);
      return album ? album.title : SOURCE_LABELS.album;
    }
    return SOURCE_LABELS[kind] || SOURCE_LABELS.taste;
  }

  /* o que combina com o seu gosto: favoritas, mesmo artista/álbum e o resto */
  function tasteIds(seedId) {
    const seed = seedId ? trackById.get(seedId) : null;
    const liked = likedTrackIds();
    const similar = allIds().filter(id => {
      const track = trackById.get(id);
      if (!track || !seed || track.id === seed.id) return false;
      return (!!track.artist && track.artist === seed.artist) ||
        (!!track.album && track.album === seed.album);
    });

    const seen = new Set();
    return liked.concat(similar, allIds()).filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function buildQueue(ids, kind, seedId) {
    const base = (ids || []).filter(id => trackById.has(id));
    /* playlist toca na ordem da playlist; o resto continua pelo gosto */
    if (kind === 'playlist') return base.slice();

    const extra = tasteIds(seedId || base[0]).filter(id => base.indexOf(id) === -1);
    return base.concat(extra);
  }

  function queueItemHTML(id, index) {
    const track = trackById.get(id);
    if (!track) return '';
    const playing = index === player.pos;

    return '<button type="button" class="queue-item' + (playing ? ' current' : '') +
      '" data-queue="' + index + '" aria-label="Tocar ' + esc(track.title) + '">' +
      '<span class="queue-index">' + (playing ? ICONS.play : String(index + 1)) + '</span>' +
      '<span class="queue-cover">' + coverFor(track) + '</span>' +
      '<span class="queue-text"><span class="queue-title">' + esc(track.title) + '</span>' +
        '<span class="queue-sub">' + esc(track.artist) + '</span></span>' +
    '</button>';
  }

  function queueHTML() {
    const label = player.source && player.source.label ? player.source.label : SOURCE_LABELS.taste;
    const head = '<div class="queue-head">' +
      '<div class="queue-head-text"><strong>Fila de reprodução</strong>' +
        '<span>' + esc(label) + '</span></div>' +
      '<button type="button" class="icon-btn queue-close" data-queue-close aria-label="Fechar fila">' +
        ICONS.close + '</button>' +
    '</div>';

    if (!player.queue.length) {
      if (!yt.playing) return head + '<div class="empty">Toque uma música para montar a fila.</div>';

      return head + '<div class="queue-list"><div class="queue-item current">' +
        '<span class="queue-index">' + ICONS.play + '</span>' +
        '<span class="queue-cover"><div class="cover cover-img" style="background-image:url(\'' +
          esc(ytThumb(yt.playing.id)) + '\')"></div></span>' +
        '<span class="queue-text"><span class="queue-title">' + esc(yt.playing.title) + '</span>' +
          '<span class="queue-sub">' + esc(yt.playing.author || 'YouTube') + '</span></span>' +
      '</div></div>';
    }

    return head + '<div class="queue-list">' + player.queue.map(queueItemHTML).join('') + '</div>';
  }

  function renderQueue() {
    if (!queueEl) return;
    queueEl.innerHTML = queueHTML();
  }

  function closeQueue() {
    if (queueEl) queueEl.classList.remove('open');
    if (queueBtn) queueBtn.classList.remove('active');
  }

  function toggleQueue() {
    if (!queueEl) return;
    renderQueue();
    queueEl.classList.toggle('open');
    if (queueBtn) queueBtn.classList.toggle('active', queueEl.classList.contains('open'));
  }

  function render() {
    /* trocar de tela não mexe no áudio nem no vídeo: o player de YouTube vive
       em #yt-stage (fora da view) e a música do catálogo segue no objeto audio */
    const ytWasPlaying = !!(yt.playing && yt.state === 1);
    const scrollTop = mainEl.scrollTop;

    renderSidebar();
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.hidden = !isLoggedIn();
    viewEl.innerHTML = viewHTML();
    mainEl.scrollTop = scrollTop;
    if (yt.playing) paintYtPlayer();
    updatePlayerBar();

    /* rede de segurança: se a troca de view pausar o vídeo, volta a tocar */
    if (ytWasPlaying && yt.player && yt.ready) {
      try {
        if (yt.player.getPlayerState() !== 1) yt.player.playVideo();
      } catch (err) {}
    }

    renderQueue();

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
    store.recent = [id].concat(store.recent.filter(x => x !== id)).slice(0, 100);
    save();
  }

  function historyIds() {
    return store.recent.filter(id => trackById.has(id));
  }

  function pushSearch(term) {
    const clean = String(term || '').trim().slice(0, 80);
    if (!clean) return;
    store.searches = [clean].concat(store.searches.filter(s => norm(s) !== norm(clean))).slice(0, 8);
    save();
  }

  /* ------ histórico dentro da barra de pesquisa (vazio ou filtrando) ------ */
  function searchDropHTML(rawTerm) {
    const term = norm(rawTerm || '');

    const searches = store.searches
      .filter(termText => !term || norm(termText).indexOf(term) !== -1)
      .slice(0, 6);
    const chips = searches.length
      ? '<div class="drop-label">' + (term ? 'Buscas parecidas' : 'Buscas recentes') + '</div><div class="drop-chips">' +
        searches.map(termText =>
          '<button type="button" class="chip" data-search-term="' + esc(termText) + '">' + esc(termText) + '</button>'
        ).join('') + '</div>'
      : '';

    const seen = new Set();
    const source = term ? historyIds().concat(allIds()) : historyIds();
    const list = source.filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      const track = trackById.get(id);
      if (!track) return false;
      if (!term) return true;
      return norm(track.title + ' ' + track.artist + ' ' + track.album).indexOf(term) !== -1;
    }).slice(0, term ? 8 : 20).map(id => trackById.get(id));

    const rows = list.length
      ? '<div class="drop-label">' + (term ? 'No histórico e nas músicas' : 'Tocadas recentemente') + '</div>' +
        '<div class="drop-rows">' +
        list.map(track => (
          '<button type="button" class="drop-row" data-drop-play="' + track.id + '">' +
            coverFor(track, 'drop-cover') +
            '<span class="drop-text"><span class="drop-title">' + esc(track.title) + '</span>' +
            '<span class="drop-sub">' + esc(track.artist) + '</span></span>' +
          '</button>'
        )).join('') + '</div>'
      : '';

    if (!chips && !rows) return '';

    const actions = !term && list.length
      ? '<div class="drop-actions">' +
          '<button type="button" class="drop-all" data-drop-play-history>' + ICONS.play + '<span>Tocar histórico</span></button>' +
          '<button type="button" class="drop-all" data-drop-clear>' + ICONS.trash + '<span>Limpar</span></button>' +
        '</div>'
      : '';

    return chips + rows + actions;
  }

  function openSearchDrop() {
    if (!searchDrop) return;
    const html = searchDropHTML(searchInput.value.trim());
    if (!html) { closeSearchDrop(); return; }
    searchDrop.innerHTML = html;
    searchDrop.classList.add('open');
  }

  function closeSearchDrop() {
    if (!searchDrop) return;
    searchDrop.classList.remove('open');
    searchDrop.innerHTML = '';
  }

  function startTick() {
    cancelAnimationFrame(rafId);
    const loop = () => {
      updateProgress();
      if (!audio.paused) rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  /* Retoma o áudio do ponto onde parou. Depois de muito tempo pausado (ou com
     o telemóvel bloqueado) o browser pode descartar o buffer e deixar o
     elemento "morto": nesse caso recarregamos a faixa antes de dar play. */
  function resumeAudio() {
    const track = trackById.get(player.currentId);
    if (!track || !track.src) return;

    const broken = !!audio.error || audio.readyState === 0 || !audio.src;
    if (broken) {
      if (audio.src !== track.src) audio.src = track.src;
      else audio.load();
    }
    if (audio.ended) {
      try { audio.currentTime = 0; } catch (err) {}
    }

    const attempt = audio.play();
    if (!attempt || typeof attempt.then !== 'function') return;

    attempt.then(syncPlayIcon).catch(() => {
      /* segunda tentativa: recarrega a mesma faixa e tenta do início */
      const at = Number(audio.currentTime) || 0;
      audio.src = track.src;
      if (at > 0) {
        audio.addEventListener('loadedmetadata', function once() {
          audio.removeEventListener('loadedmetadata', once);
          try { audio.currentTime = at; } catch (err) {}
        });
      }
      const retry = audio.play();
      if (retry && typeof retry.catch === 'function') {
        retry.catch(() => {
          setPlayIcon(false);
          toast('Não foi possível tocar. Toque na música novamente.');
        });
        return;
      }
      setPlayIcon(false);
      toast('Não foi possível tocar. Toque na música novamente.');
    });
  }

  function loadAndPlay(id) {
    const track = trackById.get(id);
    if (!track) return;

    if (track.yt) {
      playYouTube(track.videoId, track.title, track.artist, id);
      pushRecent(id);
      render();
      return;
    }

    player.currentId = id;
    stopYouTubePlayback();
    pushRecent(id);
    audio.src = track.src;
    setPlayIcon(true);

    resumeAudio();

    render();
    setPlayIcon(true);
  }

  function play(id, list, kind) {
    if (!requireAccount()) return;
    if (!id || !trackById.has(id)) return;
    if (player.currentId === id && (yt.playing || audio.src)) {
      togglePlay();
      return;
    }

    const picked = (list && list.length ? list : [id]).filter(x => trackById.has(x));
    player.source = { kind: kind || 'taste', label: sourceLabel(kind) };
    player.queue = buildQueue(picked, kind, id);

    if (player.shuffle) {
      const rest = player.queue.filter(x => x !== id);
      player.queue = [id].concat(shuffleArray(rest));
    }

    player.pos = player.queue.indexOf(id);
    loadAndPlay(id);
  }

  function playAll(ids, kind, label) {
    if (!requireAccount()) return;
    const list = (ids || []).filter(id => trackById.has(id));
    if (!list.length) {
      toast('Nada para tocar ainda.');
      return;
    }
    player.source = { kind: kind || 'taste', label: sourceLabel(kind, label) };
    player.queue = buildQueue(list, kind, list[0]);
    if (player.shuffle) player.queue = shuffleArray(player.queue.slice());
    player.pos = 0;
    loadAndPlay(player.queue[0]);
  }

  function togglePlay() {
    if (!requireAccount()) return;
    if (yt.playing) {
      if (!yt.player || !yt.ready) return;
      try {
        if (yt.state === 1 || yt.state === 3) yt.player.pauseVideo();
        else yt.player.playVideo();
      } catch (err) {}
      return;
    }
    if (!player.currentId) {
      playAll(allIds(), 'taste');
      return;
    }
    if (audio.paused) {
      resumeAudio();
      syncPlayIcon();
      startTick();
    } else {
      audio.pause();
    }
  }

  function nextTrack(auto) {
    if (!isLoggedIn()) return;
    if (!player.queue.length) return;
    if (auto && player.repeat === 'one') {
      if (yt.playing) {
        try { yt.player.seekTo(0, true); yt.player.playVideo(); } catch (err) {}
        return;
      }
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
        if (!yt.playing) {
          audio.pause();
          audio.currentTime = 0;
          updateProgress();
        }
        return;
      }
    }
    player.pos = pos;
    loadAndPlay(player.queue[pos]);
  }

  function prevTrack() {
    if (yt.playing) {
      const cur = yt.ready && yt.player ? Number(yt.player.getCurrentTime()) || 0 : 0;
      if (cur > 3) {
        try { yt.player.seekTo(0, true); } catch (err) {}
        updateProgress();
        return;
      }
    } else if (audio.currentTime > 3) {
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
    persistYtTracks();
    dropOrphanYtTrack(id);
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
    persistYtTracks();
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
    persistYtTracks();
    render();
    toast('“' + track.title + '” adicionada a ' + pl.name);
  }

  function toggleTrackInPlaylist(playlistId, trackId) {
    const pl = getPlaylist(playlistId);
    if (!pl) return;
    const index = pl.tracks.indexOf(trackId);
    if (index === -1) pl.tracks.push(trackId);
    else pl.tracks.splice(index, 1);
    persistYtTracks();
    if (index !== -1) dropOrphanYtTrack(trackId);
    render();
  }

  function removeFromCurrentPlaylist(trackId) {
    if (route.name !== 'playlist') return;
    const pl = getPlaylist(route.id);
    if (!pl) return;
    pl.tracks = pl.tracks.filter(id => id !== trackId);
    persistYtTracks();
    dropOrphanYtTrack(trackId);
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
    const trackId = menuTrackId;
    menuEl.classList.remove('open');
    menuEl.innerHTML = '';
    menuTrackId = null;
    /* vídeo do YouTube aberto no menu mas não salvo em nada não fica ocupando espaço */
    if (trackId) dropOrphanYtTrack(trackId);
  }

  /* ----------------------------- modal ----------------------------- */
  function closeModal() {
    modalRoot.classList.remove('open');
    modalRoot.innerHTML = '';
    modalState = null;
  }

  function openExportAccount() {
    const account = currentAccount();
    if (!account) {
      toast('Entre numa conta para a poder transferir');
      return;
    }

    let code = '';
    try { code = encodeTransfer(account, store); } catch (err) {
      toast('Não foi possível gerar o código');
      return;
    }

    modalState = { type: 'export' };
    modalRoot.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Transferir conta">' +
      '<h2>Transferir conta para o telemóvel</h2>' +
      '<p class="modal-note">Copie o código abaixo e envie-o para o telemóvel (WhatsApp, email ou notas). ' +
        'No telemóvel, no ecrã de entrada, toque em <strong>Tenho conta noutro aparelho — transferir</strong> ' +
        'e cole o código. Vem a conta, as curtidas, as playlists e o histórico.</p>' +
      '<textarea class="field-input transfer-code" id="transfer-code" readonly rows="6" spellcheck="false">' +
        esc(code) + '</textarea>' +
      '<div class="modal-actions">' +
        '<button class="btn" data-modal-close>Fechar</button>' +
        '<button class="btn btn-primary" data-copy-code>Copiar código</button>' +
      '</div>' +
    '</div>';
    modalRoot.classList.add('open');
  }

  function copyTransferCode() {
    const area = document.getElementById('transfer-code');
    if (!area) return;
    area.focus();
    area.select();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        navigator.clipboard.writeText(area.value).catch(() => {});
      } else if (document.execCommand) {
        document.execCommand('copy');
      }
    } catch (err) {}
    toast('Código copiado. Envie-o para o telemóvel.');
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
        coverFor(t, 'pick-cover') +
        '<span class="pick-text"><strong>' + esc(t.title) + '</strong><small>' + esc(t.artist) + '</small></span>' +
        '<span class="pick-check">' + (added ? ICONS.check : ICONS.plus) + '</span>' +
      '</button>';
    }).join('');
  }

  /* ---------------------------- eventos ---------------------------- */
  function onViewClick(event) {
    const termBtn = event.target.closest('[data-search-term]');
    if (termBtn) {
      const term = termBtn.dataset.searchTerm || '';
      searchInput.value = term;
      stopYouTubeSearch();
      route = { name: 'search', q: term };
      mainEl.scrollTop = 0;
      render();
      searchYouTube(term);
      return;
    }

    const ytLikeBtn = event.target.closest('[data-yt-like]');
    if (ytLikeBtn) {
      const track = ensureYtTrack(ytLikeBtn.dataset.ytLike, ytLikeBtn.dataset.ytTitle, ytLikeBtn.dataset.ytAuthor);
      if (track) toggleLike(track.id);
      return;
    }

    const ytSaveBtn = event.target.closest('[data-yt-save]');
    if (ytSaveBtn) {
      const track = ensureYtTrack(ytSaveBtn.dataset.ytSave, ytSaveBtn.dataset.ytTitle, ytSaveBtn.dataset.ytAuthor);
      if (track) openTrackMenu(track.id, ytSaveBtn);
      return;
    }

    const ytCard = event.target.closest('[data-yt-play]');
    if (ytCard) {
      const saved = trackById.get(ytTrackId(ytCard.dataset.ytPlay));
      if (saved && yt.playing && yt.playing.trackId === saved.id) {
        togglePlay();
        return;
      }
      /* a busca fica onde está: o vídeo entra no histórico e o termo em “Buscas recentes” */
      if (route.name === 'search') pushSearch(route.q);
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
      if (action === 'play-liked') { playAll(likedTrackIds(), 'liked'); return; }
      if (action === 'play-list') {
        const pl = getPlaylist(id);
        playAll(playlistTrackIds(pl), 'playlist', pl ? pl.name : '');
        return;
      }
      if (action === 'quick-play') {
        if (actBtn.dataset.kind === 'liked') {
          playAll(likedTrackIds(), 'liked');
        } else {
          const pl = getPlaylist(actBtn.dataset.id);
          playAll(playlistTrackIds(pl), 'playlist', pl ? pl.name : '');
        }
        return;
      }
      if (action === 'play-local') {
        playAll(localTracks.map(t => t.id), 'local');
        return;
      }
      if (action === 'play-history') {
        playAll(historyIds(), 'history', 'Histórico');
        return;
      }
      if (action === 'clear-history') {
        clearHistory();
        return;
      }
      if (action === 'add-files') {
        openFilePicker();
        return;
      }
      if (action === 'create-playlist') {
        openCreatePlaylist([]);
        return;
      }
      if (action === 'logout') {
        logoutAccount();
        return;
      }
      if (action === 'change-avatar') {
        pickAvatar();
        return;
      }
      if (action === 'clear-avatar') {
        clearAvatar();
        return;
      }
      return;
    }

    const playAlbum = event.target.closest('[data-play-album]');
    if (playAlbum) {
      const ids = albumTrackIds(playAlbum.dataset.playAlbum);
      const album = albumById.get(playAlbum.dataset.playAlbum);
      if (ids.length) playAll(ids, 'album', album ? album.title : '');
      return;
    }

    const openAlbum = event.target.closest('[data-open-album]');
    if (openAlbum) { navigate({ name: 'album', id: openAlbum.dataset.openAlbum }); return; }

    const openPlaylist = event.target.closest('[data-open-playlist]');
    if (openPlaylist) { navigate({ name: 'playlist', id: openPlaylist.dataset.openPlaylist }); return; }

    if (event.target.closest('[data-open-liked]')) { navigate({ name: 'liked' }); return; }

    const row = event.target.closest('.row[data-play]');
    if (row) {
      /* continuar na pesquisa: mesma tela, mesma rolagem, termo salvo */
      if (route.name === 'search') pushSearch(route.q);
      play(row.dataset.play, listIdsFrom(row), route.name);
      return;
    }
  }

  function wireEvents() {
    viewEl.addEventListener('click', onViewClick);

    searchInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const q = searchInput.value.trim();
      if (!q) return;
      event.preventDefault();
      pushSearch(q);
      closeSearchDrop();
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
    mainEl.addEventListener('click', () => {
      sidebarEl.classList.remove('open');
      renderTabbar();
    });

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
      if (event.target.closest('#btn-logout')) {
        logoutAccount();
        return;
      }
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
      /* togglePlay já sabe tocar tudo quando nada foi escolhido e já sabe
         pausar/retomar o vídeo do YouTube sem destruí-lo */
      togglePlay();
    });
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', () => nextTrack(false));

    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', cycleRepeat);
    seekEl.addEventListener('input', () => seekTo(seekEl.value));

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

    if (npBlock) {
      npBlock.addEventListener('click', event => {
        if (event.target.closest('#np-like')) return;
        /* clicar na barra com o painel aberto fecha-o */
        if (npPanelOpen()) { closeNowPlaying(); return; }
        openNowPlaying();
      });
    }

    /* painel “a tocar”: um evento só para todos os botões */
    if (npPanel) {
      npPanel.addEventListener('click', event => {
        if (event.target.closest('[data-np-close]')) { closeNowPlaying(); return; }
        if (event.target.closest('#np-panel-play')) { togglePlay(); return; }
        if (event.target.closest('#np-panel-prev')) { prevTrack(); return; }
        if (event.target.closest('#np-panel-next')) { nextTrack(false); return; }
        if (event.target.closest('#np-panel-shuffle')) { toggleShuffle(); return; }
        if (event.target.closest('#np-panel-repeat')) { cycleRepeat(); return; }
        if (event.target.closest('#np-panel-queue')) { closeNowPlaying(); toggleQueue(); return; }
        if (event.target.closest('#np-panel-like')) { likeNowPlaying(); return; }
        const addBtn = event.target.closest('[data-np-add]');
        if (addBtn) addNowPlaying(addBtn);
      });

      if (npPanelSeek) npPanelSeek.addEventListener('input', () => seekTo(npPanelSeek.value));
    }

    /* clicar fora do painel “a tocar” fecha-o */
    document.addEventListener('click', event => {
      if (!npPanelOpen()) return;
      if (event.target.closest('#np-panel') || event.target.closest('.np')) return;
      closeNowPlaying();
    });

    /* histórico dentro da barra de pesquisa */
    if (searchDrop) {
      searchDrop.addEventListener('click', event => {
        const termBtn = event.target.closest('[data-search-term]');
        if (termBtn) {
          const term = termBtn.dataset.searchTerm || '';
          searchInput.value = term;
          closeSearchDrop();
          pushSearch(term);
          stopYouTubeSearch();
          route = { name: 'search', q: term };
          stack.length = 0;
          mainEl.scrollTop = 0;
          render();
          searchYouTube(term);
          searchInput.blur();
          return;
        }

        const row = event.target.closest('[data-drop-play]');
        if (row) {
          closeSearchDrop();
          play(row.dataset.dropPlay, null, 'history');
          searchInput.blur();
          return;
        }

        if (event.target.closest('[data-drop-play-history]')) {
          closeSearchDrop();
          playAll(historyIds(), 'history', 'Histórico');
          searchInput.blur();
          return;
        }

        if (event.target.closest('[data-drop-clear]')) {
          clearHistory();
          closeSearchDrop();
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('focus', openSearchDrop);
      searchInput.addEventListener('input', openSearchDrop);
      searchInput.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeSearchDrop();
      });
    }

    document.addEventListener('click', event => {
      if (!searchDrop || !searchDrop.classList.contains('open')) return;
      if (event.target.closest('.searchbox') || event.target.closest('#search-drop') ||
        event.target.closest('#tab-search') || event.target.closest('#nav-search')) return;
      closeSearchDrop();
    });

    /* Clicar fora de um painel aberto fecha-o e consome o clique: sem isto o
       mesmo toque chegava à lista por baixo e trocava a música sem querer.
       A fase de captura corre antes dos botões/linhas, por isso o clique morre aqui. */
    document.addEventListener('click', event => {
      const target = event.target;
      if (!target || !target.closest) return;

      const inside = sel => !!target.closest(sel);
      const consume = () => {
        event.preventDefault();
        event.stopImmediatePropagation();
      };

      if (menuEl.classList.contains('open') &&
        !inside('#menu') && !inside('[data-act="more"]') &&
        !inside('[data-yt-save]') && !inside('[data-np-add]')) {
        closeMenu();
        consume();
        return;
      }

      if (queueEl && queueEl.classList.contains('open') &&
        !inside('#queue') && !inside('#btn-queue') && !inside('#np-panel-queue')) {
        closeQueue();
        consume();
        return;
      }

      if (npPanelOpen() && !inside('#np-panel') && !inside('.np')) {
        closeNowPlaying();
        consume();
        return;
      }

      if (searchDrop && searchDrop.classList.contains('open') &&
        !inside('.searchbox') && !inside('#search-drop') &&
        !inside('#tab-search') && !inside('#nav-search')) {
        closeSearchDrop();
        consume();
      }
    }, true);

    /* botão de histórico dentro da barra de pesquisa */
    if (searchHistBtn) {
      searchHistBtn.addEventListener('click', event => {
        event.preventDefault();
        if (searchDrop && searchDrop.classList.contains('open')) closeSearchDrop();
        else openSearchDrop();
      });
    }

    if (navProfileBtn) {
      navProfileBtn.addEventListener('click', () => {
        searchInput.value = '';
        stopYouTubeSearch();
        stack.length = 0;
        sidebarEl.classList.remove('open');
        route = { name: 'profile' };
        mainEl.scrollTop = 0;
        render();
      });
    }

    /* navegação do telemóvel, na parte de baixo */
    if (tabHome) {
      tabHome.addEventListener('click', () => {
        searchInput.value = '';
        stopYouTubeSearch();
        route = { name: 'home' };
        stack.length = 0;
        sidebarEl.classList.remove('open');
        mainEl.scrollTop = 0;
        render();
      });
    }

    if (tabSearch) {
      tabSearch.addEventListener('click', () => {
        sidebarEl.classList.remove('open');
        if (route.name !== 'search') {
          route = { name: 'search', q: searchInput.value.trim() };
          render();
        }
        searchInput.focus();
      });
    }

    if (tabProfile) {
      tabProfile.addEventListener('click', () => {
        searchInput.value = '';
        stack.length = 0;
        sidebarEl.classList.remove('open');
        route = { name: 'profile' };
        mainEl.scrollTop = 0;
        render();
      });
    }

    if (tabLibrary) {
      tabLibrary.addEventListener('click', () => {
        sidebarEl.classList.toggle('open');
        tabLibrary.classList.toggle('active', sidebarEl.classList.contains('open'));
      });
    }

    if (queueBtn) queueBtn.addEventListener('click', toggleQueue);

    if (queueEl) {
      queueEl.addEventListener('click', event => {
        if (event.target.closest('[data-queue-close]')) { closeQueue(); return; }

        const item = event.target.closest('[data-queue]');
        if (!item) return;

        const index = Number(item.dataset.queue);
        if (!Number.isInteger(index) || index < 0 || index >= player.queue.length) return;
        if (index === player.pos) { togglePlay(); return; }

        player.pos = index;
        loadAndPlay(player.queue[index]);
      });
    }

    audio.addEventListener('play', () => {
      if (yt.playing) {
        stopYouTubePlayback();
        paintYtPlayer();
        updatePlayerBar();
      }
      syncPlayIcon();
      updateMediaSession();
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
      if (event.target.closest('[data-copy-code]')) { copyTransferCode(); return; }
      if (event.target.closest('[data-create]')) { submitCreatePlaylist(); return; }
      const pick = event.target.closest('[data-pick]');
      if (pick && modalState && modalState.type === 'add') {
        toggleTrackInPlaylist(modalState.playlistId, pick.dataset.pick);
        renderModalList();
      }
    });

    document.addEventListener('click', event => {
      if (!menuEl.classList.contains('open')) return;
      if (event.target.closest('#menu') || event.target.closest('[data-act="more"]') ||
        event.target.closest('[data-yt-save]') || event.target.closest('[data-np-add]')) return;
      closeMenu();
    });

    document.addEventListener('click', event => {
      if (!queueEl || !queueEl.classList.contains('open')) return;
      if (event.target.closest('#queue') || event.target.closest('#btn-queue') ||
        event.target.closest('#np-panel-queue')) return;
      closeQueue();
    });

    document.addEventListener('keydown', event => {
      const tag = (event.target && event.target.tagName || '').toLowerCase();
      if (event.key === 'Escape') {
        if (menuEl.classList.contains('open')) closeMenu();
        else if (modalRoot.classList.contains('open')) closeModal();
        else if (queueEl && queueEl.classList.contains('open')) closeQueue();
        else if (npPanelOpen()) closeNowPlaying();
        return;
      }
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      }
    });

    /* portão de conta: entrar / criar conta */
    document.addEventListener('submit', event => {
      if (!event.target) return;
      if (event.target.id === 'auth-form') {
        event.preventDefault();
        submitAuth();
        return;
      }
      if (event.target.id === 'auth-import-form') {
        event.preventDefault();
        submitImport();
      }
    });

    document.addEventListener('click', event => {
      const sw = event.target.closest('[data-auth-switch]');
      if (sw) showAuth(sw.getAttribute('data-auth-switch'));
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

    /* a biblioteca pertence à conta: carrega a de quem está ligado.
       Se houver conta na nuvem, a biblioteca dela substitui esta logo a seguir;
       se o utilizador criar conta na nuvem, esta biblioteca é levada para lá. */
    if (contas.currentId) loadStoreFor(contas.currentId);

    /* o <audio> tem de estar dentro do documento para o telemóvel continuar a
       tocar quando o ecrã desliga ou o app passa para segundo plano */
    if (!audio.isConnected) document.body.appendChild(audio);
    registerMediaSession();

    setVolume(clamp(typeof store.prefs.volume === 'number' ? store.prefs.volume : 0.8, 0, 1), false);

    wireEvents();
    render();

    /* conta obrigatória: sem login o app fica atrás do portão.
       Com a nuvem ligada espera-se pela sessão do Firebase antes de pedir
       login (quem já está ligado não volta a ver o ecrã de entrada). */
    if (!window.OndaCloud && !isLoggedIn()) showAuth('login');

    /* chave do Firebase inválida (apagada/expirada/restrita): entra em modo
       local sozinho, para a música continuar a funcionar sem passos extra */
    if (window.OndaCloud && !offlineMode()) {
      cloudKeyUsable().then(ok => {
        if (ok || isLoggedIn() || cloudUser) return;
        useLocalAuth();
      });
    }

    /* sessão da nuvem (Firebase): retoma a conta e a biblioteca dela */
    if (window.OndaCloud) {
      window.OndaCloud.session().then(user => {
        if (!user) {
          if (!isLoggedIn()) showAuth('login');
          return;
        }

        cloudUser = {
          id: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          avatar: ''
        };
        storeKey = 'onda.cloud.v1:' + user.uid;

        return window.OndaCloud.loadLibrary(user.uid).then(lib => {
          if (!cloudUser || cloudUser.id !== user.uid) return;
          cloudUser.name = (lib && lib.name) || cloudUser.name;
          cloudUser.avatar = (lib && lib.avatar) || '';
          applyLibrary(lib);
          hideAuth();
          render();
          updatePlayerBar();
        });
      }).catch(() => {
        if (!isLoggedIn()) showAuth('login');
      });
    }

    /* contas guardadas na base de dados aparecem no ecrã de entrada */
    loadAccountsFromDb().then(added => {
      if (added > 0 && !isLoggedIn() && document.getElementById('auth')) showAuth('login');
    }).catch(() => {});

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
