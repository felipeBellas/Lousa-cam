/* LOUSA CAM — ETAPA 3C | Mascara e caneta sincronizadas, sem vazamento antecipado */
(function () {
  'use strict';
  function initSplash() {
    var splash = document.getElementById('lcSplash');
    if (!splash) return;
    // Retorno interno de Cenas/Templates: não repetir animação de abertura.
    // A câmera continua sob controle do fluxo original do app.js.
    if (new URLSearchParams(window.location.search).get('camera') === '1') {
      splash.remove();
      return;
    }
    var pen = splash.querySelector('#lcMovingPen');
    var name = splash.querySelector('#lcNameReveal');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finished = false, raf = 0, timer = 0;
    // Cada etapa so revela o que a ponta ja percorreu.
    var stages = [
      { id: 'lcCameraPath', from: 150, to: 2350, selector: '.lc-camera-reveal' },
      { id: 'lcLensPath', from: 2350, to: 3400, selector: '.lc-lens-reveal' },
      { id: 'lcWavePath', from: 3400, to: 4020, selector: '.lc-wave-reveal' }
    ].map(function (s) {
      return { path: splash.querySelector('#' + s.id), mask: splash.querySelector(s.selector), from: s.from, to: s.to };
    });
    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      if (pen) pen.style.opacity = '0';
      splash.classList.add('lc-splash-out');
      setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, reduced ? 30 : 500);
    }
    function complete() {
      splash.classList.add('lc-logo-complete');
      if (pen) pen.style.opacity = '0';
    }
    if (reduced) {
      complete();
      timer = setTimeout(finish, 350);
    } else {
      var start = performance.now();
      function animate(now) {
        if (finished) return;
        var elapsed = now - start;
        var active = null;
        stages.forEach(function (s) {
          if (!s.path || !s.mask) return;
          var t = Math.max(0, Math.min(1, (elapsed - s.from) / (s.to - s.from)));
          // A mesma fracao t move a ponta E abre a mascara: sem partes futuras visiveis.
          s.mask.style.strokeDashoffset = String(100 * (1 - t));
          if (elapsed >= s.from && elapsed < s.to) active = { path: s.path, t: t };
        });
        if (name) {
          var n = Math.max(0, Math.min(1, (elapsed - 4020) / 380));
          name.style.transform = 'scaleX(' + n.toFixed(4) + ')';
        }
        if (active && pen) {
          var p = active.path.getPointAtLength(active.t * active.path.getTotalLength());
          pen.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ')');
          pen.style.opacity = '1';
        } else if (pen) pen.style.opacity = '0';
        if (elapsed >= 4400) complete();
        if (elapsed < 4700) raf = requestAnimationFrame(animate);
      }
      raf = requestAnimationFrame(animate);
      timer = setTimeout(finish, 4900);
    }
    splash.addEventListener('click', finish, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSplash, { once: true });
  else initSplash();
}());
