/* LOUSA CAM — Molduras independentes na câmera (etapa 2) */
(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;
  const style = document.createElement('style');
  style.textContent = `
    #lcFrameOverlay {position:absolute;inset:0;z-index:35;pointer-events:none;overflow:hidden}
    #lcFrameOverlay .lc-frame-object {position:absolute;touch-action:none;pointer-events:auto;cursor:move;user-select:none;-webkit-user-select:none}
    #lcFrameOverlay .lc-frame-object img {width:100%;height:100%;display:block;pointer-events:none;object-fit:fill}
    #lcFrameOverlay .lc-frame-object.selected {outline:2px dashed #fff;outline-offset:3px}
    #lcFrameOverlay .lc-frame-object.locked {pointer-events:none;outline:0}
    #lcFrameTools {position:absolute;right:12px;bottom:125px;z-index:80;display:none;gap:6px;flex-wrap:wrap;max-width:min(320px,90%);padding:8px;border-radius:13px;background:rgba(245,248,245,.94);box-shadow:0 4px 20px #0003;color:#263d33;font:12px system-ui}
    #lcFrameTools button {border:0;border-radius:8px;padding:8px;background:#ddeee4;color:#263d33;font:600 12px system-ui}
    #lcFrameTools label {display:flex;align-items:center;gap:5px}
    #lcFrameTools input {width:95px}
    #lcFrameEdit {position:absolute;right:12px;bottom:125px;z-index:79;display:none;border:0;border-radius:12px;padding:10px;background:#ddeee4;color:#263d33;font:600 13px system-ui}
  `;
  document.head.appendChild(style);
  const layer = document.createElement('div'); layer.id = 'lcFrameOverlay'; app.appendChild(layer);
  const tools = document.createElement('div'); tools.id = 'lcFrameTools';
  const makeButton = (label, action) => { const b=document.createElement('button'); b.type='button'; b.textContent=label; b.addEventListener('click',action); tools.appendChild(b); return b; };
  const sizeLabel = document.createElement('label'); sizeLabel.textContent='Tamanho';
  const size = document.createElement('input'); size.type='range'; size.min='15'; size.max='100'; size.value='85'; sizeLabel.appendChild(size); tools.appendChild(sizeLabel);
  let active=null; const items=[];
  const show = () => { tools.style.display=active&&!active.locked?'flex':'none'; edit.style.display=items.some(i=>i.locked)?'block':'none'; items.forEach(i=>i.el.classList.toggle('selected',i===active&&!i.locked)); if(active)size.value=String(Math.round(active.w*100)); };
  size.addEventListener('input',()=>{if(!active)return;const old=active.w;active.w=Number(size.value)/100;active.h=Math.min(1.8,active.h*(active.w/old));place(active);});
  makeButton('Fixar',()=>{if(active){active.locked=true;active.el.classList.add('locked');active=null;show();}});
  makeButton('Remover',()=>{if(active){active.el.remove();URL.revokeObjectURL(active.url);items.splice(items.indexOf(active),1);active=null;show();}});
  makeButton('Concluir',()=>{active=null;show();});
  app.appendChild(tools);
  const edit=document.createElement('button');edit.id='lcFrameEdit';edit.type='button';edit.textContent='Editar moldura';edit.addEventListener('click',()=>{const item=items[items.length-1];if(item){item.locked=false;item.el.classList.remove('locked');active=item;show();}});app.appendChild(edit);
  function place(item){const {x,y,w,h}=item;Object.assign(item.el.style,{left:`${x*100}%`,top:`${y*100}%`,width:`${w*100}%`,height:`${h*100}%`});}
  function add(blob){if(!(blob instanceof Blob)||blob.type!=='image/png'||blob.size>6*1024*1024||blob.size<20)throw Error('Imagem PNG inválida ou muito grande.');
    const url=URL.createObjectURL(blob),el=document.createElement('div'),img=document.createElement('img');el.className='lc-frame-object';img.alt='Moldura aplicada';img.src=url;el.appendChild(img);layer.appendChild(el);
    const item={url,img,el,x:.075,y:.075,w:.85,h:.85,locked:false};items.push(item);place(item);active=item;show();
    let drag=null;el.addEventListener('pointerdown',event=>{if(item.locked)return;event.preventDefault();active=item;show();drag={id:event.pointerId,x:event.clientX,y:event.clientY,ox:item.x,oy:item.y};el.setPointerCapture(event.pointerId);});
    el.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const r=app.getBoundingClientRect();item.x=Math.max(-.7,Math.min(.95,drag.ox+(event.clientX-drag.x)/r.width));item.y=Math.max(-.7,Math.min(.95,drag.oy+(event.clientY-drag.y)/r.height));place(item);});
    el.addEventListener('pointerup',()=>drag=null);el.addEventListener('pointercancel',()=>drag=null);
  }
  // Desenha somente as imagens, sem controles, no canvas de gravação.
  window.LousaFramesOverlay=Object.freeze({add,draw(ctx,x,y,w,h){for(const item of items){if(!item.img.complete||!item.img.naturalWidth)continue;try{ctx.drawImage(item.img,x+item.x*w,y+item.y*h,item.w*w,item.h*h);}catch(error){console.warn('[Frames] Desenho ignorado:',error);}}}});
})();
