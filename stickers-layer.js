/* LOUSA CAM — biblioteca de Stickers embutida, isolada da câmera. */
(() => {
  'use strict';
  const layer = document.createElement('div');
  layer.id = 'lcStickersEmbeddedLayer';
  Object.assign(layer.style,{position:'fixed',inset:'0',zIndex:'30002',display:'none',background:'#f6f8f5'});
  const frame = document.createElement('iframe');
  frame.title = 'Biblioteca de Stickers animados';
  Object.assign(frame.style,{width:'100%',height:'100%',border:'0',display:'block'});
  layer.appendChild(frame);document.body.appendChild(layer);
  function close(){layer.style.display='none';frame.removeAttribute('src');}
  function open(){layer.style.display='block';frame.src='./stickers.html';}
  window.LousaStickersLayer = Object.freeze({open,close});
  window.addEventListener('message',event=>{
    if(event.origin!==window.location.origin || event.source!==frame.contentWindow)return;
    const data=event.data;
    if(data?.type==='lousa-cam-stickers-close'){close();window.LousaCascadeMenu?.openStudio();return;}
    if(data?.type==='lousa-cam-sticker-apply'){
      if(data.mime!=='image/png'||!(data.bytes instanceof ArrayBuffer)||data.bytes.byteLength>2*1024*1024)return;
      if(!['none','pulse','float','bounce','swing','spin','frames'].includes(data.motion)||!Number.isFinite(data.speed)||data.speed<0.2||data.speed>3)return;
      try{
        window.dispatchEvent(new CustomEvent('lousa-cam-sticker-image',{detail:{blob:new Blob([data.bytes],{type:'image/png'}),sprite:(data.sprite instanceof ArrayBuffer && data.sprite.byteLength<2*1024*1024)?new Blob([data.sprite],{type:'image/png'}):null,frames:data.frames,motion:data.motion,speed:data.speed}}));
        close();
      }catch(error){console.error('[Stickers]',error);}
    }
    if(data?.type==='lousa-cam-sticker-created'&&typeof data.id==='string'){
      close();
      if(window.ScenesCamera?.openTemplate)window.ScenesCamera.openTemplate(data.id);
      else document.getElementById('glassScenesButton')?.click();
    }
  });
})();
