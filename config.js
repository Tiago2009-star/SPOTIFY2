/* Configuração local do Onda (este ficheiro está no .gitignore).
 *
 * youtubeApiKey  -> YouTube Data API v3 (busca de vídeos)
 * firebaseConfig -> Firebase > Configurações do projeto > Seus apps (Web)
 *
 * Enquanto apiKey/appId estiverem vazios, o app usa a base de dados local
 * (IndexedDB) e não tenta ligar à nuvem.
 */
window.ONDA_CONFIG = {
  youtubeApiKey: 'AIzaSyBCH_8hi_hMWfjKDASd_u3MOPLFkbzvzNo',

  firebaseConfig: {
    apiKey: 'AIzaSyBCH_8hi_hMWfjKDASd_u3MOPLFkbzvzNo',
    authDomain: 'spotify-copia-3809d.firebaseapp.com',
    projectId: 'spotify-copia-3809d',
    storageBucket: 'spotify-copia-3809d.firebasestorage.app',
    messagingSenderId: '382769400696',
    appId: '1:382769400696:web:76f7e909a63f2b91c4568d',
    measurementId: 'G-84FBZGM3XV'
  }
};
