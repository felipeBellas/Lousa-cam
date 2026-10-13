/* LOUSA CAM — CENAS PRO | controles do layout iPhone */

(() => {
  'use strict';
  const editor=document.getElementById('scenesEditorView');
  const tools=document.querySelector('.scenes-tools');
  if(!editor||!tools)return;
  const root=document.documentElement;
  const makeButton=(label,klass)=>{
    const button=document.createElement('button');
    button.type='button';button.className=klass;button.textContent=label;
    tools.appendChild(button);return button;
  };
  const focus=makeButton('Expandir','scenes-pro-focus-toggle');
  const properties=makeButton('Ajustes','scenes-pro-properties-toggle');
  const sync=()=>{
    const expanded=root.classList.contains('scenes-pro-focus');
    focus.textContent=expanded?'Ferramentas':'Expandir';
    focus.setAttribute('aria-pressed',String(expanded));
    const open=root.classList.contains('scenes-pro-properties-open');
    properties.textContent=open?'Fechar ajustes':'Ajustes';
    properties.setAttribute('aria-expanded',String(open));
  };
  focus.addEventListener('click',()=>{
    root.classList.toggle('scenes-pro-focus');
    root.classList.remove('scenes-pro-properties-open');sync();
  });
  properties.addEventListener('click',()=>{
    root.classList.remove('scenes-pro-focus');
    root.classList.toggle('scenes-pro-properties-open');sync();
  });
  const update=()=>{
    root.classList.toggle('scenes-pro-editor-active',!editor.hidden);
    if(editor.hidden){root.classList.remove('scenes-pro-focus','scenes-pro-properties-open')}
    sync();
  };
  new MutationObserver(update).observe(editor,{attributes:true,attributeFilter:['hidden','style','class']});
  update();
})();
