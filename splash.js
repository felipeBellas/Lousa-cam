/* LOUSA CAM — ETAPA 3C | AJUSTE FINO — caneta recortada do logo.png */

(function () {
  'use strict';
  function initSplash() {
    var splash = document.getElementById('lcSplash');
    if (!splash) return;
    var finished = false, raf = 0, timer = 0;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pen = splash.querySelector('#lcMovingPen');
    var paths = [
      { id: 'lcCameraPath', from: 200, to: 2100 },
      { id: 'lcLensPath', from: 1950, to: 2950 },
      { id: 'lcPenPath', from: 2800, to: 3650 },
      { id: 'lcWavePath', from: 3350, to: 3950 }
    ];
    function finish() {
      if (finished) return;
      finished = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      if (pen) pen.style.opacity = '0';
      splash.classList.add('lc-splash-out');
      window.setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, reduced ? 30 : 500);
    }
    if (!reduced && pen) {
      var start = performance.now();
      var nodes = paths.map(function (entry) {
        return { path: splash.querySelector('#' + entry.id), from: entry.from, to: entry.to };
      });
      function animate(now) {
        if (finished) return;
        var elapsed = now - start;
        var active = null;
        for (var i = 0; i < nodes.length; i++) {
          if (elapsed >= nodes[i].from && elapsed <= nodes[i].to && nodes[i].path) {
            active = nodes[i];
            break;
          }
        }
        if (active) {
          var t = Math.min(1, Math.max(0, (elapsed - active.from) / (active.to - active.from)));
          var length = active.path.getTotalLength();
          var point = active.path.getPointAtLength(t * length);
          // Mantém a ponta da caneta oficial alinhada ao percurso.
          // Não giramos a imagem recortada: preserva a perspectiva Liquid Glass original.
          pen.setAttribute('transform', 'translate(' + point.x.toFixed(2) + ' ' + point.y.toFixed(2) + ')');
          pen.style.opacity = '1';
        } else {
          pen.style.opacity = '0';
        }
        if (elapsed < 4300) raf = window.requestAnimationFrame(animate);
        else pen.style.opacity = '0';
      }
      raf = window.requestAnimationFrame(animate);
    }
    timer = window.setTimeout(finish, reduced ? 350 : 4700);
    splash.addEventListener('click', finish, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSplash, { once: true });
  else initSplash();
}());
