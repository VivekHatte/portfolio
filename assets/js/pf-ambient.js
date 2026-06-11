/* =========================================================
   pf-ambient — passive background / chrome effects
   exports: window.PF.ambient.{buildStarfield, startMissionClock,
                               initNavScroll, initParticles}
   ========================================================= */
(function () {
  'use strict';
  var utils = PF.utils;
  var $ = utils.$;
  var $$ = utils.$$;
  var rand = utils.rand;

  /* Global twinkling starfield, sized to viewport. Safe to call once. */
  function buildStarfield() {
    var sf = $('#starfield');
    if (!sf || sf.__built) return;
    sf.__built = true;
    var count = Math.min(160, Math.floor((window.innerWidth * window.innerHeight) / 9000));
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      var cls = ['star'];
      var r = Math.random();
      if (r > 0.93) cls.push('star--lg');
      if (r > 0.85 && r <= 0.93) cls.push('star--cyan');
      else if (r > 0.78 && r <= 0.85) cls.push('star--magenta');
      s.className = cls.join(' ');
      s.style.left = rand(0, 100) + 'vw';
      s.style.top = rand(0, 100) + 'vh';
      s.style.animation = 'twinkle ' + rand(2.4, 6.0).toFixed(2) + 's ease-in-out ' + rand(0, 4).toFixed(2) + 's infinite';
      s.style.opacity = rand(0.2, 0.9).toFixed(2);
      frag.appendChild(s);
    }
    sf.appendChild(frag);
  }

  /* Mission Time clock in the nav — counts up from page load. */
  function startMissionClock() {
    var clock = $('#mission-clock-text');
    if (!clock) return;
    var start = Date.now();
    function tick() {
      var s = Math.floor((Date.now() - start) / 1000);
      var hh = String(Math.floor(s / 3600)).padStart(2, '0');
      var mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      var ss = String(s % 60).padStart(2, '0');
      clock.textContent = 'MT ' + hh + ':' + mm + ':' + ss;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* Nav backdrop transitions in once the user scrolls past the hero edge. */
  function initNavScroll() {
    var nav = $('#nav');
    if (!nav) return;
    function onScroll() {
      if (window.scrollY > 16) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Mobile nav toggle — hamburger ↔ slide-down panel.
     Auto-closes on link tap, ESC, and when viewport grows back to desktop. */
  function initNavToggle() {
    var btn = $('.nav__toggle');
    var panel = $('#primary-nav');
    if (!btn || !panel) return;

    function close() {
      btn.classList.remove('is-open');
      panel.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open navigation menu');
      document.body.classList.remove('nav-open');
    }
    function open() {
      btn.classList.add('is-open');
      panel.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Close navigation menu');
      document.body.classList.add('nav-open');
    }

    btn.addEventListener('click', function () {
      if (panel.classList.contains('is-open')) close();
      else open();
    });

    $$('a', panel).forEach(function (link) {
      link.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
    });

    // Snap the menu closed if the viewport grows past the mobile breakpoint
    // (e.g. rotating a tablet from portrait to landscape).
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 821px)');
      var sync = function () {
        if (mq.matches && panel.classList.contains('is-open')) close();
      };
      if (mq.addEventListener) mq.addEventListener('change', sync);
      else if (mq.addListener) mq.addListener(sync);
    }
  }

  /* Floating hero particles — randomly scattered, gently drifting (requires anime). */
  function initParticles() {
    var particles = $$('.hero__particle');
    if (!particles.length) return;
    if (typeof window.anime !== 'function') return;
    var host = $('.hero');
    if (!host) return;
    var hostRect = host.getBoundingClientRect();
    var w = hostRect.width;
    var h = hostRect.height || window.innerHeight;
    particles.forEach(function (p) {
      p.style.left = rand(0, w) + 'px';
      p.style.top = rand(0, h) + 'px';
    });
    window.anime({
      targets: '.hero__particle',
      opacity: [
        { value: [0, 0.9], duration: 800, easing: 'easeOutQuad' },
        { value: 0.25, duration: 1600, easing: 'easeInOutSine' }
      ],
      translateY: function () { return rand(-80, -180); },
      translateX: function () { return rand(-40, 40); },
      scale: function () { return rand(0.6, 1.4); },
      delay: window.anime.stagger(80, { from: 'random' }),
      duration: function () { return rand(4000, 8000); },
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine'
    });
  }

  PF.ambient = {
    buildStarfield: buildStarfield,
    startMissionClock: startMissionClock,
    initNavScroll: initNavScroll,
    initNavToggle: initNavToggle,
    initParticles: initParticles
  };
})();
