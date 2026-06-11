/* =========================================================
   main.js — page orchestration
   Wires the pf-* modules together: hero entrance timeline,
   IntersectionObserver-driven reveals, count-ups, and boot.
   Loaded last; pf-utils / pf-text / pf-fx / pf-ambient must
   be present on window.PF by the time this runs.
   ========================================================= */
(function () {
  'use strict';
  var utils   = PF.utils;
  var text    = PF.text;
  var fx      = PF.fx;
  var ambient = PF.ambient;
  var $       = utils.$;
  var $$      = utils.$$;
  var prefs   = utils.prefs;

  // The hero <h1> needs char-splitting BEFORE we decide between full
  // animation and the static fallback — both branches target .char nodes.
  var titleEl = $('[data-split]');
  if (titleEl) text.splitChars(titleEl);

  /* ---------------------------------------------------------
     Static fallback for no-anime / reduced-motion users
     --------------------------------------------------------- */
  function applyStaticFallback() {
    ambient.buildStarfield();
    ambient.startMissionClock();
    $$('.hero__title .char, .hero__title .accent[data-glitch]').forEach(function (c) {
      c.style.opacity = 1; c.style.transform = 'none';
    });
    ['.hero__tag', '.hero__subtitle', '.hero__actions', '.hero__scroll'].forEach(function (s) {
      var el = $(s); if (el) { el.style.opacity = 1; el.style.transform = 'none'; }
    });
    $$('.reveal, .skill, .project, .hero__subtitle .word').forEach(function (el) {
      el.style.opacity = 1; el.style.transform = 'none';
    });
    $$('[data-typewriter]').forEach(function (el) {
      el.textContent = el.getAttribute('data-text') || el.textContent;
    });
  }

  /* ---------------------------------------------------------
     Hero entrance timeline (only fires when .hero__title exists)
     --------------------------------------------------------- */
  function initHeroEntrance() {
    if (!titleEl) return;
    var tl = window.anime.timeline({ easing: 'easeOutExpo', autoplay: false });
    tl.add({
      targets: '.hero__title .char, .hero__title .accent[data-glitch]',
      opacity: [0, 1],
      translateY: ['110%', '0%'],
      rotate: [8, 0],
      duration: 900,
      delay: window.anime.stagger(22)
    })
    .add({
      targets: '.hero__tag',
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 700,
      complete: function () {
        var typeEl = document.querySelector('.hero__tag [data-typewriter]');
        if (typeEl) text.typewriter(typeEl, typeEl.getAttribute('data-text') || '');
      }
    }, '-=700')
    .add({
      targets: '.hero__subtitle',
      opacity: [0, 1],
      duration: 1,
      begin: function () {
        var sub = $('.hero__subtitle');
        if (sub) text.revealWords(sub);
      }
    }, '-=400')
    .add({
      targets: '.hero__actions',
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 700
    }, '-=400')
    .add({
      targets: '.hero__scroll',
      opacity: [0, 1],
      translateY: [-10, 0],
      duration: 600
    }, '-=300');

    tl.play();

    var heroAccent = document.querySelector('.hero__title .accent[data-glitch]');
    if (heroAccent) setTimeout(function () { text.startGlitchLoop(heroAccent); }, 1500);
  }

  /* ---------------------------------------------------------
     Section reveals — fade-up + chained text effects per element
     --------------------------------------------------------- */
  function initReveals() {
    var generalIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        generalIo.unobserve(el);
        if (el.classList.contains('skill')) return;

        window.anime({
          targets: el,
          opacity: [0, 1],
          translateY: [40, 0],
          duration: 900,
          easing: 'easeOutExpo',
          complete: function () {
            runChainedEffects(el);
          }
        });
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { generalIo.observe(el); });

    // about paragraphs reveal words without needing the .reveal wrapper
    $$('.about__text [data-words]').forEach(function (w) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          if (entry.target.__worded) return;
          entry.target.__worded = true;
          text.revealWords(entry.target);
        });
      }, { threshold: 0.4 });
      io.observe(w);
    });

    revealSkillsGrid();
    revealProjectsGrid();
  }

  // Runs scramble / typewriter / words effects nested inside an element
  // that just finished its fade-up reveal.
  function runChainedEffects(el) {
    var scrambles = el.matches('[data-scramble]') ? [el] : $$('[data-scramble]', el);
    scrambles.forEach(function (s) {
      if (s.__scrambled) return;
      s.__scrambled = true;
      text.scrambleText(s, { duration: 1100 });
    });
    var typers = el.matches('[data-typewriter]') ? [el] : $$('[data-typewriter]', el);
    typers.forEach(function (t) {
      if (t.__typed) return;
      t.__typed = true;
      text.typewriter(t, t.getAttribute('data-text') || '', { speed: 36 });
    });
    var wordEls = el.matches('[data-words]') ? [el] : $$('[data-words]', el);
    wordEls.forEach(function (w) {
      if (w.__worded) return;
      w.__worded = true;
      text.revealWords(w);
    });
  }

  function revealSkillsGrid() {
    var grid = $('#skills-grid');
    if (!grid) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        window.anime({
          targets: '#skills-grid .skill',
          opacity: [0, 1],
          translateY: [18, 0],
          scale: [0.94, 1],
          // Now that skills are grouped into multiple sub-grids of varying
          // sizes, fall back to a flat index-based stagger instead of a 2D
          // grid pattern. Keeps the cascade feeling tight across groups.
          delay: window.anime.stagger(28),
          duration: 650,
          easing: 'easeOutBack'
        });
      });
    }, { threshold: 0.2 });
    io.observe(grid);
  }

  function revealProjectsGrid() {
    var grid = $('.projects__grid');
    if (!grid) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        window.anime({
          targets: '.projects__grid .project',
          opacity: [0, 1],
          translateY: [40, 0],
          scale: [0.97, 1],
          delay: window.anime.stagger(110),
          duration: 800,
          easing: 'easeOutExpo',
          complete: function () {
            $$('.projects__grid [data-scramble-on-enter]').forEach(function (t, i) {
              setTimeout(function () { text.scrambleText(t, { duration: 900 }); }, 110 * i);
            });
          }
        });
      });
    }, { threshold: 0.15 });
    io.observe(grid);
  }

  /* ---------------------------------------------------------
     Count-up metric animations (mission page)
     --------------------------------------------------------- */
  function initCountUps() {
    var nodes = $$('[data-count]');
    if (!nodes.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.__counted) return;
        el.__counted = true;
        io.unobserve(el);
        text.countUp(
          el,
          parseFloat(el.getAttribute('data-count') || '0'),
          {
            decimals: parseInt(el.getAttribute('data-decimals') || '0', 10),
            suffix: el.getAttribute('data-suffix') || '',
            prefix: el.getAttribute('data-prefix') || ''
          }
        );
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function boot() {
    ambient.initNavScroll();
    ambient.initNavToggle();

    if (!prefs.hasAnime || prefs.reduced) {
      applyStaticFallback();
      return;
    }

    ambient.buildStarfield();
    ambient.startMissionClock();
    ambient.initParticles();
    $$('[data-text-flicker]').forEach(text.flickerOnce);

    initHeroEntrance();
    initReveals();
    initCountUps();

    fx.initTilt();
    fx.initMagnetic();
    fx.initCopyEmail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
