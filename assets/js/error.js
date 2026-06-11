/* =========================================================
   error.js — animations for the SIGNAL LOST page
   Reuses PF.utils / PF.text / PF.fx / PF.ambient.
   ========================================================= */
(function () {
  'use strict';
  var utils   = PF.utils;
  var text    = PF.text;
  var fx      = PF.fx;
  var ambient = PF.ambient;
  var $       = utils.$;
  var $$      = utils.$$;
  var rand    = utils.rand;
  var prefs   = utils.prefs;

  var TYPED_TEXT = 'CONNECTION TIMED OUT // STATIC INCOMING';

  /* random "sector" + live uptime telemetry */
  function fillTelemetry() {
    var sector = $('#err-sector');
    if (sector) {
      var hex = Math.floor(rand(0x1000, 0xffff)).toString(16).toUpperCase();
      sector.textContent = hex + '-' + Math.floor(rand(10, 99));
    }
    var up = $('#err-uptime');
    if (up) {
      var start = Date.now();
      function tick() {
        var s = Math.floor((Date.now() - start) / 1000);
        var hh = String(Math.floor(s / 3600)).padStart(2, '0');
        var mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        var ss = String(s % 60).padStart(2, '0');
        up.textContent = hh + ':' + mm + ':' + ss;
      }
      tick();
      setInterval(tick, 1000);
    }
  }

  /* scramble-decode the 404 numerals: reveals chars left-to-right
     while the rest cycle through random glyphs */
  function scrambleNumerals(el, target, duration) {
    duration = duration || 900;
    var chars = text.SCRAMBLE_CHARS;
    var start = performance.now();
    function frame(now) {
      var t = (now - start) / duration;
      if (t >= 1) { el.textContent = target; return; }
      var revealed = Math.floor(t * target.length);
      var out = '';
      for (var i = 0; i < target.length; i++) {
        if (i < revealed || target[i] === ' ') out += target[i];
        else out += chars[Math.floor(Math.random() * chars.length)];
      }
      el.textContent = out;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    ambient.buildStarfield();
    fillTelemetry();

    var typed = $('#error-typed');
    var caret = typed ? typed.querySelector('.caret') : null;

    if (prefs.reduced || !prefs.hasAnime) {
      if (typed) typed.insertBefore(document.createTextNode(TYPED_TEXT), caret);
      $$('[data-typewriter]').forEach(function (el) {
        el.textContent = el.getAttribute('data-text') || '';
      });
      return;
    }

    /* big 404 entrance + scramble cycle */
    var code = $('.error__code');
    if (code) {
      window.anime({
        targets: code,
        opacity: [0, 1],
        scale: [0.6, 1],
        translateY: [40, 0],
        duration: 1100,
        easing: 'easeOutExpo',
        complete: function () { scrambleNumerals(code, code.textContent, 700); }
      });

      /* looping micro-glitch */
      function glitch() {
        var dx = rand(-6, 6);
        var dy = rand(-3, 3);
        window.anime({
          targets: code,
          keyframes: [
            { translateX: dx, translateY: dy, duration: 60 },
            { translateX: -dx * 0.6, translateY: -dy * 0.6, duration: 60 },
            { translateX: 0, translateY: 0, duration: 80 }
          ],
          easing: 'steps(1)',
          complete: function () { setTimeout(glitch, rand(1600, 3800)); }
        });
      }
      setTimeout(glitch, 1500);
    }

    /* "SIGNAL LOST" eyebrow — typewriter */
    $$('[data-typewriter]').forEach(function (el) {
      var t = el.getAttribute('data-text') || '';
      setTimeout(function () { text.typewriter(el, t, { speed: 70 }); }, 200);
    });

    /* typed subtitle inserted before the caret */
    if (typed) {
      var charNode = document.createTextNode('');
      typed.insertBefore(charNode, caret);
      var i = 0;
      (function step() {
        if (i > TYPED_TEXT.length) return;
        charNode.nodeValue = TYPED_TEXT.slice(0, i);
        i++;
        setTimeout(step, rand(36, 105));
      })();
    }

    fx.initMagnetic({ strength: 22 });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
