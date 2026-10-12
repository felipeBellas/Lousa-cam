/* Cenas Pro — ativa layout tipo app SOMENTE dentro do editor. */
(() => {
  'use strict';
  const editor = document.getElementById('scenesEditorView');
  const tools = document.querySelector('.scenes-tools');
  if (!editor || !tools) return;
  const html = document.documentElement;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'scenes-pro-properties-toggle';
  toggle.textContent = 'Ajustes';
  toggle.setAttribute('aria-label', 'Abrir ou fechar propriedades da cena');
  toggle.setAttribute('aria-expanded', 'false');
  tools.appendChild(toggle);
  toggle.addEventListener('click', () => {
    const open = html.classList.toggle('scenes-pro-properties-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Fechar ajustes' : 'Ajustes';
  });
  const update = () => {
    const active = !editor.hidden;
    html.classList.toggle('scenes-pro-editor-active', active);
    if (!active) {
      html.classList.remove('scenes-pro-properties-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Ajustes';
    }
  };
  new MutationObserver(update).observe(editor, {attributes:true,attributeFilter:['hidden','style','class']});
  update();
})();
