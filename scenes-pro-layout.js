/* LOUSA CAM 2.0 — CENAS PRO | palco ajustado ao espaco real do iPhone */
(() => {
  'use strict';
  const editor = document.getElementById('scenesEditorView');
  const tools = document.querySelector('.scenes-tools');
  const outer = document.querySelector('.scenes-stage-outer');
  const stage = document.getElementById('scenesStage');
  if (!editor || !tools || !outer || !stage) return;

  const root = document.documentElement;
  const makeButton = (label, klass) => {
    let button = tools.querySelector('.' + klass);
    if (button) return button;
    button = document.createElement('button');
    button.type = 'button';
    button.className = klass;
    button.textContent = label;
    tools.appendChild(button);
    return button;
  };
  const focus = makeButton('Expandir', 'scenes-pro-focus-toggle');
  const properties = makeButton('Ajustes', 'scenes-pro-properties-toggle');
  const sync = () => {
    const expanded = root.classList.contains('scenes-pro-focus');
    focus.textContent = expanded ? 'Ferramentas' : 'Expandir';
    focus.setAttribute('aria-pressed', String(expanded));
    const open = root.classList.contains('scenes-pro-properties-open');
    properties.textContent = open ? 'Fechar ajustes' : 'Ajustes';
    properties.setAttribute('aria-expanded', String(open));
  };

  let frame = 0;
  const fitStage = () => {
    frame = 0;
    if (!root.classList.contains('scenes-pro-editor-active') || window.innerWidth > 760) {
      stage.style.removeProperty('--scenes-fit-width');
      stage.style.removeProperty('--scenes-fit-height');
      return;
    }
    const styles = getComputedStyle(outer);
    const horizontal = parseFloat(styles.paddingLeft || 0) + parseFloat(styles.paddingRight || 0);
    const vertical = parseFloat(styles.paddingTop || 0) + parseFloat(styles.paddingBottom || 0);
    const availableWidth = Math.max(0, outer.clientWidth - horizontal - 2);
    const availableHeight = Math.max(0, outer.clientHeight - vertical - 2);
    if (availableWidth < 10 || availableHeight < 10) return;
    const portrait = stage.classList.contains('scenes-portrait');
    const ratio = portrait ? 9 / 16 : 16 / 9;
    const width = Math.min(availableWidth, availableHeight * ratio);
    const height = width / ratio;
    stage.style.setProperty('--scenes-fit-width', width.toFixed(2) + 'px');
    stage.style.setProperty('--scenes-fit-height', height.toFixed(2) + 'px');
  };
  const scheduleFit = () => {
    if (!frame) frame = requestAnimationFrame(fitStage);
  };
  const update = () => {
    const visible = !editor.hidden && getComputedStyle(editor).display !== 'none';
    root.classList.toggle('scenes-pro-editor-active', visible);
    if (!visible) root.classList.remove('scenes-pro-focus', 'scenes-pro-properties-open');
    sync();
    scheduleFit();
  };
  focus.addEventListener('click', () => {
    root.classList.toggle('scenes-pro-focus');
    root.classList.remove('scenes-pro-properties-open');
    sync(); scheduleFit();
  });
  properties.addEventListener('click', () => {
    root.classList.remove('scenes-pro-focus');
    root.classList.toggle('scenes-pro-properties-open');
    sync(); scheduleFit();
  });
  new MutationObserver(update).observe(editor, {
    attributes: true, attributeFilter: ['hidden', 'style', 'class']
  });
  new MutationObserver(scheduleFit).observe(stage, {
    attributes: true, attributeFilter: ['class']
  });
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(scheduleFit).observe(outer);
  }
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', scheduleFit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleFit);
  update();
})();
