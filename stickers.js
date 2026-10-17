/* Lousa Cam — catálogo original de stickers desenhados em SVG e exportados como PNG. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const catalog=$('catalog');
const names=['Coração Pop','Estrela Viral','Raio Neon','Fogo Creator','Smile','Surpresa','Coroa','Flor Pastel','Borboleta','Brilho','Play','Like','Gamepad','Troféu','Pixel Heart','Microfone','Câmera','Nota Musical','Planeta','Átomo','Check','Alerta','WOW!','BOOM!','LIVE','LEVEL UP','LOL','NEW','LOVE','REC'];
const symbols=['♥','★','ϟ','🔥','☺','😮','♛','✿','🦋','✦','▶','👍','🎮','🏆','♥','🎤','📷','♫','🪐','⚛','✓','!','WOW!','BOOM!','LIVE','LEVEL UP','LOL','NEW','LOVE','REC'];
const models=names.map((name,i)=>({name,symbol:symbols[i],tier:i<12?'FREE':'PRO · TESTE',index:i}));
function settings(){return {motion:$('motion').value,speed:Number($('speed').value),color:$('color').value};}
function svgFor(model){
  const {color}=settings();
  // Nenhuma entrada textual do usuário é inserida no SVG: valores fixos ou input[type=color].
  const text=model.symbol;
  const isWord=text.length>3;
  const size=isWord?(text.length>5?31:46):104;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="5" flood-opacity=".26"/></filter></defs><g filter="url(#shadow)"><circle cx="128" cy="128" r="110" fill="${color}" stroke="#fff" stroke-width="11"/><circle cx="102" cy="90" r="80" fill="#fff" opacity=".13"/></g><text x="128" y="143" text-anchor="middle" dominant-baseline="middle" font-family="Arial,Apple Color Emoji,Segoe UI Emoji,sans-serif" font-size="${size}" font-weight="900" fill="white" stroke="${isWord?'#25372c':'none'}" stroke-width="${isWord?1:0}">${text}</text></svg>`;
}
async function png(model){
  const markup=svgFor(model),url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'}));
  const img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Falha ao desenhar Sticker'));img.src=url;});}
  finally{URL.revokeObjectURL(url);}
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  canvas.getContext('2d').drawImage(img,0,0);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Falha ao gerar PNG')),'image/png'));
}
async function apply(model,button){
  button.disabled=true;
  try{
    const blob=await png(model),bytes=await blob.arrayBuffer();
    if(window.parent===window)throw new Error('Abra a biblioteca pelo Estúdio Criativo.');
    window.parent.postMessage({type:'lousa-cam-sticker-apply',mime:'image/png',bytes,...settings()},window.location.origin,[bytes]);
  }catch(error){$('status').textContent=error.message;button.disabled=false;}
}
async function scenes(model,button){
  button.disabled=true;
  try{
    const blob=await png(model),opts=settings();
    if(!window.ScenesStorage)throw new Error('Cenas indisponíveis.');
    const created=await ScenesStorage.createPresentation({title:`Sticker — ${model.name}`,aspectRatio:'9:16',templateId:`sticker-${model.index+1}`,scenes:[{title:model.name,background:{type:'transparent'},elements:[{id:ScenesStorage.createId('element'),type:'image',blob,x:232,y:472,width:256,height:256,rotation:0,opacity:1,lcStickerMotion:{kind:opts.motion,speed:opts.speed}}]}]});
    if(window.parent!==window)window.parent.postMessage({type:'lousa-cam-sticker-created',id:created.id},window.location.origin);
    else window.location.assign('./scenes.html');
  }catch(error){$('status').textContent=error.message;button.disabled=false;}
}
function render(){
  catalog.replaceChildren();
  for(const model of models){
    const card=document.createElement('article');card.className='card';
    const preview=document.createElement('div');preview.className='preview';preview.dataset.motion=settings().motion;
    const image=document.createElement('img');image.alt='';image.src=URL.createObjectURL(new Blob([svgFor(model)],{type:'image/svg+xml'}));
    image.addEventListener('load',()=>URL.revokeObjectURL(image.src),{once:true});preview.appendChild(image);
    const name=document.createElement('div');name.className='name';name.textContent=model.name;
    const tier=document.createElement('div');tier.className='tier';tier.textContent=model.tier;
    const camera=document.createElement('button');camera.textContent='Aplicar na câmera';camera.addEventListener('click',()=>apply(model,camera));
    const scene=document.createElement('button');scene.textContent='Adicionar às Cenas';scene.addEventListener('click',()=>scenes(model,scene));
    card.append(preview,name,tier,camera,scene);catalog.appendChild(card);
  }
}
$('back').addEventListener('click',()=>{
  if(window.parent!==window)window.parent.postMessage({type:'lousa-cam-stickers-close'},window.location.origin);
  else window.location.assign('./index.html');
});
for(const id of ['color','motion'])$(id).addEventListener('input',render);
$('speed').addEventListener('input',()=>{$('speedText').textContent=settings().speed+'×';});
render();
})();
