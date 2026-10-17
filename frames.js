(() => {
'use strict';
const $=id=>document.getElementById(id);
const catalog=$('catalog');
const titles=['Neon Loop','Glass Frame','Pop Corners','Creator Border','Candy Waves','Sunset Glow','Pixel Party','Bubble Joy','Mint Outline','Sticker Star','Bold Caption','Lightning','Speech Pop','Arrow Flow','Heart Beat','Comic Burst','Sparkles','Rainbow Arc','Play Tag','Fresh Label','Cyber Pulse','Electric Edge','Holo Frame','Gradient Orbit','Ultra Pop','Liquid Chrome','Retro Arcade','Studio Live','Neon Ribbon','Creator Focus','Vibe Motion','Dreamy Glow','Street Art','Color Splash','Orbit Rings','Glow Star','Energy Bolt','Social Story','Vlog Accent','Gaming Pulse','Tech Lines','Vapor Wave','Festival Pop','Funky Bubble','Aqua Glass','Future Portal','Candy Ribbon','Hype Frame','Motion Lines','Prism Lights'];
const kinds=['border','glass','corners','border','waves','border','pixel','bubble','border','star','label','bolt','speech','arrow','heart','burst','sparkle','arc','play','label'];
const special=['border','border','glass','corners','waves','glass','pixel','label','border','arc','border','bubble','burst','border','arc','bolt','speech','star','corners','pixel','border','waves','glass','arc','label','border','ribbon','border','waves','glass'];
const models=titles.map((name,i)=>({name,tier:i<20?'FREE':'PRO · TESTE',kind:i<20?kinds[i]:special[i-20],index:i}));
const escapeXML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function art(m,w,h,a,b){
 const k=m.kind, cx=w/2,cy=h/2,stroke=Math.max(10,Math.round(w*.022)),pad=Math.round(w*.07),id='g';
 const rect=(x,y,ww,hh,r,fill='none',sw=stroke)=>`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="${r}" fill="${fill}" stroke="url(#g)" stroke-width="${sw}"/>`;
 const ellipse=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
 let shapes='';
 if(['border','glass','pixel'].includes(k)){
   shapes=rect(pad,pad,w-2*pad,h-2*pad,k==='pixel'?6:Math.round(w*.08),'none',stroke*(k==='glass'?2:1));
   if(k==='glass')shapes+=rect(pad+stroke*2,pad+stroke*2,w-2*pad-4*stroke,h-2*pad-4*stroke,45,'none',stroke/2);
   if(k==='pixel')for(let j=0;j<7;j++)shapes+=`<rect x="${pad+j*w*.115}" y="${pad-stroke/2}" width="${stroke}" height="${stroke}" fill="${j%2?a:b}"/>`;
 } else if(k==='corners'){
   const L=w*.23,P=pad;
   shapes=`<path d="M${P+L} ${P}H${P}V${P+L} M${w-P-L} ${P}H${w-P}V${P+L} M${P} ${h-P-L}V${h-P}H${P+L} M${w-P-L} ${h-P}H${w-P}V${h-P-L}" fill="none" stroke="url(#g)" stroke-width="${stroke*1.8}" stroke-linecap="round"/>`;
 } else if(k==='waves'||k==='ribbon'){
   shapes=`<path d="M0 ${h*.22} Q${w*.25} ${h*.06} ${w*.5} ${h*.2} T${w} ${h*.15} M0 ${h*.82} Q${w*.25} ${h*.96} ${w*.5} ${h*.82} T${w} ${h*.86}" fill="none" stroke="url(#g)" stroke-width="${stroke*2}" stroke-linecap="round"/>`;
 } else if(k==='bubble'||k==='arc'){
   shapes=`<circle cx="${w*.78}" cy="${h*.2}" r="${w*.13}" fill="none" stroke="${a}" stroke-width="${stroke}"/><circle cx="${w*.2}" cy="${h*.77}" r="${w*.1}" fill="none" stroke="${b}" stroke-width="${stroke}"/>`;
 } else if(k==='label'||k==='play'||k==='speech'){
   shapes=`<rect x="${w*.1}" y="${h*.72}" width="${w*.8}" height="${h*.13}" rx="${stroke*2}" fill="url(#g)"/>`;
   if(k==='play')shapes+=`<path d="M${w*.15} ${h*.755}l${w*.04} ${h*.03}-${w*.04} ${h*.03}z" fill="#fff"/>`;
   if(k==='speech')shapes+=`<path d="M${w*.27} ${h*.85}l${w*.07} ${h*.07}v-${h*.07}" fill="${b}"/>`;
 } else if(k==='star'||k==='heart'||k==='burst'||k==='sparkle'||k==='bolt'||k==='arrow'){
   const points=k==='bolt'?'40,5 10,55 38,55 23,95 92,38 60,38 72,5':k==='arrow'?'5,40 62,40 62,15 95,50 62,85 62,60 5,60':k==='heart'?'50,90 12,55 10,28 28,12 50,30 72,12 90,28 88,55':'50,4 62,36 96,50 62,64 50,96 38,64 4,50 38,36';
   shapes=`<g transform="translate(${w*.32} ${h*.28}) scale(${w*.0035} ${h*.0035})"><polygon points="${points}" fill="url(#g)"/></g>`;
 } else shapes=rect(pad,pad,w-2*pad,h-2*pad,40);
 const shift=m.index%5;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="${shift%2?1:0}" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>${shapes}</svg>`;
}
function render(){catalog.replaceChildren();const portrait=$('ratio').value==='9:16',w=portrait?720:1280,h=portrait?1280:720,a=$('primary').value,b=$('secondary').value;
 models.forEach(m=>{const card=document.createElement('article');card.className='card';const preview=document.createElement('div');preview.className='preview';preview.innerHTML=art(m,w,h,a,b);const name=document.createElement('div');name.className='name';name.textContent=m.name;const tier=document.createElement('div');tier.className='tier';tier.textContent=m.tier;const button=document.createElement('button');button.textContent=m.tier==='FREE'?'Adicionar às Cenas':'Testar elemento PRO';button.addEventListener('click',()=>create(m,button));card.append(preview,name,tier,button);catalog.appendChild(card);});}
async function create(m,button){button.disabled=true;button.textContent='Preparando…';try{
 const ratio=$('ratio').value,portrait=ratio==='9:16',w=portrait?720:1280,h=portrait?1280:720;
 const svg=art(m,w,h,$('primary').value,$('secondary').value);
 const image=new Image();const svgBlob=new Blob([svg],{type:'image/svg+xml'});const url=URL.createObjectURL(svgBlob);
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Não foi possível renderizar o elemento.'));image.src=url;});}finally{URL.revokeObjectURL(url);}
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,w,h);
 const png=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar PNG.')),'image/png'));
 if(!window.ScenesStorage)throw new Error('Armazenamento de Cenas indisponível.');
 const created=await ScenesStorage.createPresentation({title:`${m.name} — ${ratio}`,aspectRatio:ratio,templateId:`frame-${m.index+1}`,scenes:[{title:m.name,background:{type:'transparent'},elements:[{id:ScenesStorage.createId('element'),type:'image',blob:png,x:0,y:0,width:w,height:h,rotation:0,opacity:1}]}]});
 if(window.parent!==window)window.parent.postMessage({type:'lousa-cam-frame-created',id:created.id},window.location.origin);
 else window.location.assign('./scenes.html');
 }catch(error){$('status').textContent='Erro: '+error.message;button.disabled=false;button.textContent='Tentar novamente';}}
$('back').addEventListener('click',()=>{if(window.parent!==window)window.parent.postMessage({type:'lousa-cam-frames-close'},window.location.origin);else window.location.assign('./index.html');});
for(const id of ['primary','secondary','ratio'])$(id).addEventListener('input',render);
render();
})();