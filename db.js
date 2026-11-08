/*
 * Onda — base de dados (IndexedDB).
 *
 * Tabelas (object stores):
 *   contas           -> contas criadas (nome, hash da palavra-passe, imagem)
 *   playlists        -> playlists de cada conta (accountId)
 *   playlist_tracks  -> músicas de cada playlist, com a posição
 *   likes            -> músicas curtidas de cada conta
 *   prefs            -> volume, aleatório, repetir, recentes e buscas
 *
 * O app escreve aqui a cada alteração; o localStorage fica como cópia rápida
 * para a interface arrancar sem esperar pela base de dados.
 */
window.OndaDB = (function () {
  'use strict';

  var DB_NAME = 'onda-db';
  var DB_VERSION = 1;
  var dbPromise = null;

  function open() {
    if (!window.indexedDB) return Promise.reject(new Error('IndexedDB indisponível'));
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      var request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        var db = request.result;

        if (!db.objectStoreNames.contains('contas')) {
          db.createObjectStore('contas', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('playlists')) {
          var playlists = db.createObjectStore('playlists', { keyPath: 'id' });
          playlists.createIndex('accountId', 'accountId', { unique: false });
        }

        if (!db.objectStoreNames.contains('playlist_tracks')) {
          var tracks = db.createObjectStore('playlist_tracks', { keyPath: 'key' });
          tracks.createIndex('accountId', 'accountId', { unique: false });
          tracks.createIndex('playlistId', 'playlistId', { unique: false });
        }

        if (!db.objectStoreNames.contains('likes')) {
          var likes = db.createObjectStore('likes', { keyPath: 'key' });
          likes.createIndex('accountId', 'accountId', { unique: false });
        }

        if (!db.objectStoreNames.contains('prefs')) {
          db.createObjectStore('prefs', { keyPath: 'accountId' });
        }
      };

      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () {
        reject(request.error || new Error('Falha ao abrir a base de dados'));
      };
    });

    return dbPromise;
  }

  /* abre uma transacção e espera que ela termine */
  function run(stores, mode, work) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(stores, mode);

        transaction.oncomplete = function () { resolve(); };
        transaction.onerror = function () {
          reject(transaction.error || new Error('Falha na base de dados'));
        };
        transaction.onabort = function () {
          reject(transaction.error || new Error('Transacção cancelada'));
        };

        try {
          work(transaction);
        } catch (err) {
          try { transaction.abort(); } catch (ignore) {}
          reject(err);
        }
      });
    });
  }

  function readAll(storeName, indexName, query) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction([storeName], 'readonly');
        var store = transaction.objectStore(storeName);
        var source = indexName ? store.index(indexName) : store;
        var request = query === undefined ? source.getAll() : source.getAll(query);

        request.onsuccess = function () { resolve(request.result || []); };
        request.onerror = function () { reject(request.error); };
      });
    });
  }

  function readOne(storeName, key) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction([storeName], 'readonly');
        var request = transaction.objectStore(storeName).get(key);
        request.onsuccess = function () { resolve(request.result || null); };
        request.onerror = function () { reject(request.error); };
      });
    });
  }

  /* apaga, num store, todas as linhas da conta (o cursor percorre o índice) */
  function clearByAccount(store, accountId, done) {
    if (!window.IDBKeyRange) { done(); return; }

    var request = store.index('accountId').openCursor(window.IDBKeyRange.only(accountId));

    request.onsuccess = function () {
      var cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
        return;
      }
      done();
    };
    request.onerror = function () { done(); };
  }

  function saveAccount(user) {
    if (!user || !user.id) return Promise.resolve();
    return run(['contas'], 'readwrite', function (transaction) {
      transaction.objectStore('contas').put(user);
    }).catch(function () {});
  }

  function loadAccounts() {
    return readAll('contas').catch(function () { return []; });
  }

  function loadAccount(id) {
    return readOne('contas', id).catch(function () { return null; });
  }

  /* grava a biblioteca inteira da conta: playlists, músicas de cada playlist,
     curtidas e preferências */
  function saveLibrary(accountId, store) {
    if (!accountId) return Promise.resolve();

    var playlists = Array.isArray(store.playlists) ? store.playlists : [];
    var likes = Array.isArray(store.likes) ? store.likes : [];
    var prefs = store.prefs || {};

    return run(['playlists', 'playlist_tracks', 'likes', 'prefs'], 'readwrite', function (transaction) {
      var plStore = transaction.objectStore('playlists');
      var ptStore = transaction.objectStore('playlist_tracks');
      var likeStore = transaction.objectStore('likes');
      var prefStore = transaction.objectStore('prefs');

      clearByAccount(plStore, accountId, function () {
        clearByAccount(ptStore, accountId, function () {
          clearByAccount(likeStore, accountId, function () {
            playlists.forEach(function (playlist) {
              plStore.put({
                id: playlist.id,
                accountId: accountId,
                name: playlist.name,
                colors: playlist.colors,
                createdAt: playlist.createdAt || 0
              });

              (playlist.tracks || []).forEach(function (trackId, index) {
                ptStore.put({
                  key: accountId + '|' + playlist.id + '|' + trackId,
                  accountId: accountId,
                  playlistId: playlist.id,
                  trackId: trackId,
                  position: index
                });
              });
            });

            likes.forEach(function (trackId) {
              likeStore.put({
                key: accountId + '|' + trackId,
                accountId: accountId,
                trackId: trackId
              });
            });

            prefStore.put({
              accountId: accountId,
              volume: prefs.volume,
              shuffle: !!prefs.shuffle,
              repeat: prefs.repeat,
              recent: Array.isArray(store.recent) ? store.recent : [],
              searches: Array.isArray(store.searches) ? store.searches : [],
              ytTracks: Array.isArray(store.ytTracks) ? store.ytTracks : []
            });
          });
        });
      });
    }).catch(function () {});
  }

  /* lê a biblioteca da conta da base de dados */
  function loadLibrary(accountId) {
    if (!accountId) return Promise.resolve(null);

    return Promise.all([
      readAll('playlists', 'accountId', accountId),
      readAll('playlist_tracks', 'accountId', accountId),
      readAll('likes', 'accountId', accountId),
      readOne('prefs', accountId)
    ]).then(function (results) {
      var playlists = (results[0] || []).map(function (playlist) {
        return {
          id: playlist.id,
          name: playlist.name,
          colors: playlist.colors,
          createdAt: playlist.createdAt || 0,
          tracks: []
        };
      });

      var byId = {};
      playlists.forEach(function (playlist) { byId[playlist.id] = playlist; });

      (results[1] || [])
        .slice()
        .sort(function (a, b) { return (a.position || 0) - (b.position || 0); })
        .forEach(function (row) {
          if (byId[row.playlistId]) byId[row.playlistId].tracks.push(row.trackId);
        });

      var prefs = results[3] || {};

      return {
        playlists: playlists,
        likes: (results[2] || []).map(function (row) { return row.trackId; }),
        recent: Array.isArray(prefs.recent) ? prefs.recent : [],
        searches: Array.isArray(prefs.searches) ? prefs.searches : [],
        ytTracks: Array.isArray(prefs.ytTracks) ? prefs.ytTracks : [],
        prefs: {
          volume: typeof prefs.volume === 'number' ? prefs.volume : 0.8,
          shuffle: !!prefs.shuffle,
          repeat: typeof prefs.repeat === 'string' ? prefs.repeat : 'off'
        }
      };
    }).catch(function () { return null; });
  }

  return {
    open: open,
    saveAccount: saveAccount,
    loadAccounts: loadAccounts,
    loadAccount: loadAccount,
    saveLibrary: saveLibrary,
    loadLibrary: loadLibrary
  };
})();
