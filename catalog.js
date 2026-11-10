/*
 * Catálogo do Onda.
 *
 * O app é só YouTube: não há faixas de demonstração embutidas nem secção de
 * ficheiros locais. Toda a música vem da busca do YouTube.
 *
 * O ficheiro continua a existir para manter a estrutura (albums/tracks) que o
 * app espera; se um dia quiser voltar a ter um catálogo fixo, basta preencher
 * as listas abaixo.
 */
window.CATALOG = (function () {
  'use strict';

  return { albums: [], tracks: [] };
})();
