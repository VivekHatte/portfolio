/* =========================================================
   pf-utils — base helpers and capability detection
   exports: window.PF.utils.{$, $$, rand, pick, prefs}
   ========================================================= */
(function () {
  'use strict';
  window.PF = window.PF || {};

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Loaded after anime.min.js (both defer, in document order) so window.anime
  // is already resolved when this runs.
  var prefs = {
    reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    hasAnime: typeof window.anime === 'function'
  };

  PF.utils = {
    $: $,
    $$: $$,
    rand: rand,
    pick: pick,
    prefs: prefs
  };

  // Tiny site-wide DOM bits — footer year + js-enabled flag
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
