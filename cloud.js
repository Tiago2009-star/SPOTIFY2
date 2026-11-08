/*
 * Onda — contas e biblioteca na nuvem (Firebase Authentication + Firestore).
 *
 * Este ficheiro é um módulo ES (o index.html carrega-o antes do app.js). Ele só
 * faz alguma coisa se existir uma configuração em js/config.js:
 *
 *   window.ONDA_CONFIG = {
 *     youtubeApiKey: 'SUA_CHAVE',            // opcional
 *     firebaseConfig: {                      // Firebase > Configurações do projeto
 *       apiKey: '...',
 *       authDomain: 'spotify-copia-d898f.firebaseapp.com',
 *       projectId: 'spotify-copia-d898f',
 *       storageBucket: 'spotify-copia-d898f.appspot.com',
 *       messagingSenderId: '...',
 *       appId: '...'
 *     }
 *   };
 *
 * Estrutura no Firestore:
 *   users/{uid}                 -> nome, email, imagem, curtidas, histórico, buscas, prefs
 *   users/{uid}/playlists/{id}  -> playlist com as músicas (campo `tracks`)
 *
 * Sem configuração o app continua a funcionar com a base de dados local
 * (IndexedDB), como antes.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

(function () {
  'use strict';

  var cfg = (window.ONDA_CONFIG && window.ONDA_CONFIG.firebaseConfig) || null;
  if (!cfg || !cfg.apiKey || !cfg.projectId) return;

  var auth;
  var db;

  try {
    var app = initializeApp(cfg);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    window.console && window.console.warn('Firebase não iniciou:', err);
    return;
  }

  function userDoc(uid) {
    return doc(db, 'users', uid);
  }

  function playlistsCol(uid) {
    return collection(db, 'users', uid, 'playlists');
  }

  function loadProfile(uid) {
    return getDoc(userDoc(uid)).then(function (snap) {
      return snap.exists() ? snap.data() : null;
    });
  }

  function saveProfile(uid, data) {
    var payload = {};
    Object.keys(data).forEach(function (key) {
      if (data[key] !== undefined) payload[key] = data[key];
    });
    payload.updatedAt = serverTimestamp();
    return setDoc(userDoc(uid), payload, { merge: true });
  }

  function loadPlaylists(uid) {
    return getDocs(playlistsCol(uid)).then(function (snap) {
      return snap.docs.map(function (item) {
        var data = item.data() || {};
        return {
          id: item.id,
          name: data.name || 'Playlist',
          colors: data.colors || [],
          createdAt: data.createdAt || 0,
          position: data.position || 0,
          tracks: Array.isArray(data.tracks) ? data.tracks : []
        };
      }).sort(function (a, b) { return a.position - b.position; });
    });
  }

  function savePlaylists(uid, playlists) {
    return getDocs(playlistsCol(uid)).then(function (snap) {
      var batch = writeBatch(db);
      var keep = {};

      (playlists || []).forEach(function (playlist, index) {
        keep[playlist.id] = true;
        batch.set(doc(db, 'users', uid, 'playlists', playlist.id), {
          name: playlist.name,
          colors: playlist.colors || [],
          tracks: playlist.tracks || [],
          createdAt: playlist.createdAt || 0,
          position: index,
          updatedAt: serverTimestamp()
        });
      });

      snap.docs.forEach(function (item) {
        if (!keep[item.id]) batch.delete(item.ref);
      });

      return batch.commit();
    });
  }

  function friendly(err) {
    var code = (err && err.code) || '';

    if (code === 'auth/email-already-in-use') return 'Esse email já tem conta. Entre com a palavra-passe.';
    if (code === 'auth/invalid-email') return 'Email inválido.';
    if (code === 'auth/weak-password') return 'A palavra-passe precisa de 6 caracteres ou mais (regra do Firebase).';
    if (code === 'auth/wrong-password') return 'Palavra-passe errada.';
    if (code === 'auth/user-not-found') return 'Não existe conta com esse email.';
    if (code === 'auth/invalid-credential') return 'Email ou palavra-passe incorretos.';
    if (code === 'auth/too-many-requests') return 'Muitas tentativas. Espere um pouco e tente de novo.';
    if (code === 'auth/network-request-failed') return 'Sem ligação. Verifique a internet.';
    if (code === 'auth/operation-not-allowed') return 'Ative o login por email/palavra-passe no Firebase (Authentication > Sign-in method).';
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      return 'O Firestore recusou o acesso: publique as regras de segurança (users/{uid}).';
    }
    if (code === 'unavailable') return 'Nuvem indisponível agora. Tente de novo.';

    return (err && err.message) || 'Não foi possível continuar.';
  }

  window.OndaCloud = {
    ready: true,
    provider: 'firebase',
    requiresEmail: true,
    friendly: friendly,

    /* quem está ligado (ou null) */
    session: function () {
      return new Promise(function (resolve) {
        var stop = onAuthStateChanged(auth, function (user) {
          try { stop(); } catch (err) {}
          resolve(user || null);
        }, function () {
          resolve(null);
        });
      });
    },

    signUp: function (name, email, password) {
      var cleanName = String(name || '').trim();
      var cleanEmail = String(email || '').trim();

      return createUserWithEmailAndPassword(auth, cleanEmail, password).then(function (cred) {
        var display = cleanName || cleanEmail.split('@')[0];
        var updates = [];
        try { updates.push(updateProfile(cred.user, { displayName: display })); } catch (err) {}
        return Promise.all(updates).catch(function () {}).then(function () {
          return saveProfile(cred.user.uid, {
            name: display,
            email: cleanEmail,
            createdAt: serverTimestamp()
          }).catch(function () {});
        }).then(function () {
          return { id: cred.user.uid, name: display, email: cleanEmail, avatar: '' };
        });
      });
    },

    signIn: function (email, password) {
      var cleanEmail = String(email || '').trim();

      return signInWithEmailAndPassword(auth, cleanEmail, password).then(function (cred) {
        return loadProfile(cred.user.uid).then(function (profile) {
          return {
            id: cred.user.uid,
            name: (profile && profile.name) || cred.user.displayName || cleanEmail.split('@')[0],
            email: cleanEmail,
            avatar: (profile && profile.avatar) || ''
          };
        }).catch(function () {
          return { id: cred.user.uid, name: cred.user.displayName || cleanEmail.split('@')[0], email: cleanEmail, avatar: '' };
        });
      });
    },

    signOutUser: function () {
      return signOut(auth).catch(function () {});
    },

    account: function (uid) {
      return loadProfile(uid);
    },

    saveAccount: function (uid, data) {
      return saveProfile(uid, data);
    },

    loadLibrary: function (uid) {
      return Promise.all([loadProfile(uid), loadPlaylists(uid)]).then(function (results) {
        var profile = results[0] || {};
        return {
          name: profile.name || '',
          avatar: profile.avatar || '',
          playlists: results[1] || [],
          likes: Array.isArray(profile.likes) ? profile.likes : [],
          recent: Array.isArray(profile.recent) ? profile.recent : [],
          searches: Array.isArray(profile.searches) ? profile.searches : [],
          ytTracks: Array.isArray(profile.ytTracks) ? profile.ytTracks : [],
          prefs: profile.prefs || {}
        };
      });
    },

    saveLibrary: function (uid, store) {
      return saveProfile(uid, {
        likes: store.likes || [],
        recent: (store.recent || []).slice(0, 60),
        searches: store.searches || [],
        ytTracks: store.ytTracks || [],
        prefs: store.prefs || {}
      }).then(function () {
        return savePlaylists(uid, store.playlists || []);
      });
    }
  };

  try { window.dispatchEvent(new Event('onda-cloud-ready')); } catch (err) {}
})();
