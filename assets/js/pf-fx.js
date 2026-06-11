/* =========================================================
   pf-fx — user-input-driven interactive effects
   exports: window.PF.fx.{initTilt, initMagnetic, initCopyEmail}
   ========================================================= */
(function () {
  'use strict';
  var $ = PF.utils.$;
  var $$ = PF.utils.$$;

  /* Project card 3D tilt + glow tracking */
  function initTilt() {
    $$('[data-tilt]').forEach(function (card) {
      var state = { rx: 0, ry: 0 };
      function apply() {
        card.style.transform = 'perspective(900px) rotateX(' + state.rx.toFixed(2) + 'deg) rotateY(' + state.ry.toFixed(2) + 'deg)';
      }
      function move(e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        window.anime.remove(state);
        state.rx = (0.5 - py) * 8;
        state.ry = (px - 0.5) * 10;
        apply();
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
      }
      function leave() {
        window.anime.remove(state);
        window.anime({
          targets: state,
          rx: 0,
          ry: 0,
          duration: 700,
          easing: 'easeOutElastic(1, 0.6)',
          update: apply
        });
      }
      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
    });
  }

  /* Magnetic buttons — gentle pull toward cursor */
  function initMagnetic(opts) {
    opts = opts || {};
    var strength = opts.strength || 18;
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        window.anime.remove(el);
        window.anime({
          targets: el,
          translateX: (x / rect.width) * strength,
          translateY: (y / rect.height) * strength,
          duration: 400,
          easing: 'easeOutQuad'
        });
      });
      el.addEventListener('mouseleave', function () {
        window.anime.remove(el);
        window.anime({
          targets: el,
          translateX: 0,
          translateY: 0,
          duration: 600,
          easing: 'easeOutElastic(1, 0.5)'
        });
      });
    });
  }

  /* Copy-to-clipboard email — gracefully falls back to execCommand */
  function initCopyEmail() {
    var btn = $('#copy-email');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var email = btn.getAttribute('data-email') || '';
      function done() {
        btn.classList.add('is-copied');
        if (typeof window.anime === 'function') {
          window.anime({
            targets: btn,
            scale: [{ value: 0.96, duration: 120 }, { value: 1, duration: 300, easing: 'easeOutElastic(1, 0.5)' }]
          });
        }
        setTimeout(function () { btn.classList.remove('is-copied'); }, 1800);
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = email;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(done).catch(fallback);
      } else {
        fallback();
      }
    });
  }

  PF.fx = {
    initTilt: initTilt,
    initMagnetic: initMagnetic,
    initCopyEmail: initCopyEmail
  };
})();
