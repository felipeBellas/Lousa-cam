/* LOUSA CAM — ETAPA 3A | Não acessa câmera, Pencil nem gravação */
(function () {
  'use strict';
  function initSplash() {
    var splash = document.getElementById('lcSplash');
    if (!splash) return;
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      splash.classList.add('lc-splash-out');
      window.setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 500);
    }
    // Tempo curto, sem bloquear indefinidamente a tela de acesso.
    window.setTimeout(finish, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : 3100);
    // Se houver erro em algum estilo, um toque permite dispensar a abertura.
    splash.addEventListener('click', finish, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSplash, { once: true });
  else initSplash();
}());
