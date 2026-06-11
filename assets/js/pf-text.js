/* =========================================================
   pf-text — text animation primitives
   exports: window.PF.text.{splitChars, splitWords, scrambleText,
                            typewriter, revealWords, startGlitchLoop,
                            countUp, flickerOnce, SCRAMBLE_CHARS}
   ========================================================= */
(function () {
  'use strict';
  var utils = PF.utils;
  var rand = utils.rand;

  /* split element's text into char spans grouped by word, preserving inline
     children. Each word becomes a .char-word container with white-space:nowrap
     so line-breaks only happen between words (not mid-word).
     Elements marked [data-glitch] are treated as opaque leaves so the gradient
     paint stays continuous across the whole word. */
  function splitChars(el) {
    var temp = document.createElement('div');
    temp.innerHTML = el.innerHTML;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === Node.TEXT_NODE) {
          var frag = document.createDocumentFragment();
          var parts = n.nodeValue.split(/(\s+)/);
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            var wordEl = document.createElement('span');
            wordEl.className = 'char-word';
            for (var i = 0; i < part.length; i++) {
              var s = document.createElement('span');
              s.className = 'char';
              s.textContent = part[i];
              wordEl.appendChild(s);
            }
            frag.appendChild(wordEl);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === Node.ELEMENT_NODE && n.tagName !== 'BR') {
          if (n.hasAttribute && n.hasAttribute('data-glitch')) return;
          walk(n);
        }
      });
    }
    walk(temp);
    el.innerHTML = temp.innerHTML;
  }

  /* split element's text into word spans (skips nested elements like .accent) */
  function splitWords(el) {
    var parts = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === Node.TEXT_NODE) {
        var words = n.nodeValue.split(/(\s+)/);
        words.forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) {
            parts.push(document.createTextNode(' '));
          } else {
            var s = document.createElement('span');
            s.className = 'word';
            s.textContent = w;
            parts.push(s);
          }
        });
      } else {
        parts.push(n);
      }
    });
    el.innerHTML = '';
    parts.forEach(function (p) { el.appendChild(p); });
  }

  /* scramble decode: cycle random chars until each settles to its final char.
     The glyph set is deliberately narrow — em-dash, brackets, and braces are
     excluded because they're noticeably wider than letters in the Orbitron
     display font and would cause headings to wrap mid-animation, which
     reflows the page and produces a visible vertical jitter. */
  var SCRAMBLE_CHARS = '!?#*+=/\\-_0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function scrambleText(el, options) {
    options = options || {};
    var duration = options.duration || 1100;
    var leaves = [];
    function collect(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === Node.TEXT_NODE) {
          if (!n.nodeValue) return;
          leaves.push({ node: n, target: n.nodeValue });
        } else if (n.nodeType === Node.ELEMENT_NODE && n.tagName !== 'BR') {
          collect(n);
        }
      });
    }
    collect(el);
    if (!leaves.length) return;

    var totalLen = leaves.reduce(function (s, l) { return s + l.target.length; }, 0);
    if (!totalLen) return;

    // Layout lock: capture the heading's natural box height while the target
    // text is still in place, then pin the height and clip overflow for the
    // duration of the scramble. If random glyphs would push the heading to
    // wrap or grow, the overflow is clipped *inside* the heading's natural
    // footprint instead of pushing the rest of the page down (vertical
    // jitter) or spilling characters past the screen edge (horizontal
    // overflow). Both inline styles are released once the scramble settles.
    var rect = el.getBoundingClientRect();
    var prevHeight = el.style.height;
    var prevOverflow = el.style.overflow;
    el.style.height = rect.height + 'px';
    el.style.overflow = 'hidden';

    var positions = [];
    leaves.forEach(function (leaf, li) {
      for (var i = 0; i < leaf.target.length; i++) {
        positions.push({ leaf: li, i: i, ch: leaf.target[i] });
      }
    });
    // shuffle reveal order so it doesn't reveal strictly left-to-right
    var revealOrder = positions.map(function (_, i) { return i; });
    for (var k = revealOrder.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var tmp = revealOrder[k]; revealOrder[k] = revealOrder[j]; revealOrder[j] = tmp;
    }
    var revealAt = new Array(positions.length);
    revealOrder.forEach(function (posIdx, order) {
      revealAt[posIdx] = (order / revealOrder.length) * duration * 0.85;
    });

    var start = performance.now();
    function frame(now) {
      var t = now - start;
      var leafBuffers = leaves.map(function (l) { return new Array(l.target.length); });
      var allDone = true;
      positions.forEach(function (p, idx) {
        if (t >= revealAt[idx] + 90) {
          leafBuffers[p.leaf][p.i] = p.ch;
        } else if (p.ch === ' ' || p.ch === '\n') {
          leafBuffers[p.leaf][p.i] = p.ch;
        } else {
          allDone = false;
          leafBuffers[p.leaf][p.i] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      });
      leaves.forEach(function (l, i) { l.node.nodeValue = leafBuffers[i].join(''); });
      if (!allDone && t < duration + 200) {
        requestAnimationFrame(frame);
      } else {
        leaves.forEach(function (l) { l.node.nodeValue = l.target; });
        el.style.height = prevHeight;
        el.style.overflow = prevOverflow;
      }
    }
    requestAnimationFrame(frame);
  }

  /* typewriter: type out a target string character-by-character */
  function typewriter(el, text, options) {
    options = options || {};
    var speed = options.speed || 32;
    var jitter = options.jitter !== false;
    el.textContent = '';
    var i = 0;
    function step() {
      if (i > text.length) { if (options.done) options.done(); return; }
      el.textContent = text.slice(0, i);
      i++;
      var d = jitter ? (speed + rand(-8, 18)) : speed;
      setTimeout(step, d);
    }
    step();
  }

  /* word-by-word fade-up reveal (requires anime) */
  function revealWords(el) {
    splitWords(el);
    el.style.opacity = 1;
    if (typeof window.anime !== 'function') {
      Array.prototype.forEach.call(el.querySelectorAll('.word'), function (w) {
        w.style.opacity = 1; w.style.transform = 'none';
      });
      return;
    }
    window.anime({
      targets: el.querySelectorAll('.word'),
      opacity: [0, 1],
      translateY: [12, 0],
      delay: window.anime.stagger(28),
      duration: 700,
      easing: 'easeOutExpo'
    });
  }

  /* periodic glitch flash on an element with `.is-glitching` modifier */
  function startGlitchLoop(el) {
    function pulse() {
      el.classList.add('is-glitching');
      setTimeout(function () { el.classList.remove('is-glitching'); }, rand(80, 160));
      setTimeout(pulse, rand(2400, 6000));
    }
    setTimeout(pulse, 1800);
  }

  /* count-up: animate numeric text from 0 to a target value (requires anime) */
  function countUp(el, target, options) {
    options = options || {};
    var duration = options.duration || 1600;
    var decimals = options.decimals != null ? options.decimals : 0;
    var suffix = options.suffix || '';
    var prefix = options.prefix || '';
    var factor = Math.pow(10, decimals);
    if (typeof window.anime !== 'function') {
      el.textContent = prefix + target.toFixed(decimals) + suffix;
      return;
    }
    var obj = { v: 0 };
    window.anime({
      targets: obj,
      v: target,
      duration: duration,
      easing: 'easeOutExpo',
      round: factor,
      update: function () {
        el.textContent = prefix + obj.v.toFixed(decimals) + suffix;
      }
    });
  }

  /* subtle flicker (like a CRT booting) — opacity micro-blinks then settles */
  function flickerOnce(el) {
    if (typeof window.anime !== 'function') return;
    window.anime({
      targets: el,
      opacity: [
        { value: 0, duration: 0 },
        { value: 1, duration: 60 },
        { value: 0.2, duration: 40 },
        { value: 1, duration: 60 },
        { value: 0.5, duration: 40 },
        { value: 1, duration: 120 }
      ],
      easing: 'steps(1)'
    });
  }

  PF.text = {
    splitChars: splitChars,
    splitWords: splitWords,
    scrambleText: scrambleText,
    typewriter: typewriter,
    revealWords: revealWords,
    startGlitchLoop: startGlitchLoop,
    countUp: countUp,
    flickerOnce: flickerOnce,
    SCRAMBLE_CHARS: SCRAMBLE_CHARS
  };
})();
