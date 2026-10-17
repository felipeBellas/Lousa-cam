(() => {
'use strict';
const $=id=>document.getElementById(id);
const catalog=$('catalog');
const groups=[
 ['Gaming & Stream',['LIVE Pulse','XP Corners','Arcade HUD','Speedrun','Pixel Hearts','Boss Fight','Neon Arena','Glitch Scan','Level Up','Controller Vibe']],
 ['Aesthetic & Lifestyle',['Soft Diary','Polaroid Mood','Cloud Nine','Film Date','Pastel Ribbon','Dream Notes','Golden Hour','Mirror Selfie','Scrapbook','Soft Glow']],
 ['Street & Pop',['Graffiti Tag','Sticker Bomb','Comic Wow','Y2K Chrome','Skate Tape','Doodle Pop','Pop Explosion','Spray Paint','Street Label','Hype Stars']],
 ['Podcast & Creator',['On Air','Soundwave','Lower Third','Creator ID','Talk Bubble','Mic Check','Reaction Cam','Interview Split']],
 ['Tech & Futurista',['Cyber Grid','Radar Scan','Digital Code','Orbit UI','Hologram','Circuit Flow','Data Stream']],
 ['Educação Criativa',['Brain Spark','Science Lab','Study Notes','Idea Flash','Explainer']]
];
const models=groups.flatMap(([category,names])=>names.map(name=>({name,category,index:0,tier:''})));
models.forEach((m,i)=>{m.index=i;m.tier=i<20?'FREE':'PRO · TESTE';});
const escapeXML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function art(m,w,h,a,b){
 const i=m.index, A=a,B=b;
 const path=(d,stroke=A,sw=10,fill='none',extra='')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
 const rect=(x,y,ww,hh,rx=0,fill='none',stroke=A,sw=9)=>`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
 const circle=(x,y,r,fill='none',stroke=A,sw=8)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
 const text=(x,y,t,size=46,color='#ffffff',extra='')=>`<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-weight="900" font-size="${size}" fill="${color}" ${extra}>${escapeXML(t)}</text>`;
 const star=(x,y,r=24)=>path(`M${x} ${y-r}L${x+r*.25} ${y-r*.24}L${x+r} ${y}L${x+r*.25} ${y+r*.24}L${x} ${y+r}L${x-r*.25} ${y+r*.24}L${x-r} ${y}L${x-r*.25} ${y-r*.24}Z`,B,5,B);
 const dotrow=(x,y,n,dx=35)=>Array.from({length:n},(_,j)=>circle(x+j*dx,y,7,j%2?B:A,'none',0)).join('');
 const edge=()=>path('M65 265V70H265 M735 70H935V265 M65 735V930H265 M735 930H935V735',A,18);
 const waves=(y,n=3)=>Array.from({length:n},(_,j)=>path(`M${70+j*15} ${y+j*25} Q280 ${y-80+j*25} 500 ${y+j*25} T${930-j*15} ${y+j*25}`,j%2?B:A,9)).join('');
 const badge=(label,x=80,y=110,ww=400)=>rect(x,y,ww,90,30,'url(#g)','none',0)+text(x+26,y+62,label,52,'#ffffff');
 const confetti=(count=14)=>Array.from({length:count},(_,j)=>{const x=85+(j*173)%830,y=95+(j*239)%790;return j%3===0?star(x,y,13):j%3===1?circle(x,y,10,j%2?B:A,'none',0):rect(x,y,25,9,4,j%2?B:A,'none',0)}).join('');
 let s='';
 switch(i){
 case 0:s=badge('● LIVE',75,90,340)+path('M75 270V145 M75 270H270 M925 730V855H730',B,15)+dotrow(100,915,5);break;
 case 1:s=edge()+badge('XP +250',590,810,330)+rect(95,875,350,22,11,B,'none',0)+rect(95,875,240,22,11,A,'none',0);break;
 case 2:s=rect(45,45,910,910,15,'none',A,5)+path('M45 180H955 M45 820H955 M250 45V180 M750 820V955',B,12)+text(85,135,'ARCADE // 01',46,A)+dotrow(710,875,6,34);break;
 case 3:s=path('M0 170L470 90 M530 910L1000 830',A,30)+path('M0 225L470 145 M530 855L1000 775',B,12)+badge('SPEEDRUN',95,750,530);break;
 case 4:s=Array.from({length:5},(_,j)=>text(95+j*160,130+(j%2)*50,'♥',80,j%2?B:A)).join('')+path('M70 780H930',A,13)+text(95,860,'+ 1 LIFE',70,B);break;
 case 5:s=badge('BOSS FIGHT',85,90,610)+rect(90,205,820,32,8,'#303039',A,5)+rect(94,209,560,24,4,B,'none',0)+path('M65 660L250 660L250 920 M935 340H750V90',A,16);break;
 case 6:s=Array.from({length:3},(_,j)=>rect(45+j*18,45+j*18,910-j*36,910-j*36,55,'none',j%2?B:A,10)).join('')+badge('ARENA',300,820,400);break;
 case 7:s=Array.from({length:12},(_,j)=>rect(50+(j*127)%830,65+j*72,100+(j%3)*35,7,0,j%2?A:B,'none',0)).join('')+text(95,900,'GLITCH / 404',58,A);break;
 case 8:s=badge('LEVEL UP!',110,85,680)+Array.from({length:5},(_,j)=>star(180+j*155,890,35)).join('')+path('M65 300V85H280 M935 700V915H720',B,14);break;
 case 9:s=path('M110 800C120 650 260 630 350 690L420 730H580L650 690C740 630 880 650 890 800L850 855L720 805H280L150 855Z',A,11,'url(#g)')+circle(290,755,22,'#ffffff','none',0)+path('M250 755H330 M290 715V795',B,10)+dotrow(675,740,3,50);break;
 case 10:s=rect(80,75,840,850,70,'none',A,8)+star(135,135,23)+star(865,845,29)+badge('dear diary',160,820,650);break;
 case 11:s=rect(125,95,750,810,15,'none','#ffffff',45)+rect(155,125,690,625,8,'none',A,7)+text(230,840,'good memories ♡',50,B);break;
 case 12:s=waves(135,2)+Array.from({length:4},(_,j)=>circle(190+j*210,825+(j%2)*35,55,'none',j%2?B:A,8)).join('')+star(500,150,32);break;
 case 13:s=path('M100 90V910 M900 90V910',A,20)+Array.from({length:8},(_,j)=>rect(55,100+j*110,90,58,8,'none',B,6)+rect(855,100+j*110,90,58,8,'none',B,6)).join('')+text(285,920,'REC ●',50,A);break;
 case 14:s=path('M0 110Q500 250 1000 110 M0 850Q500 700 1000 850',B,28)+badge('soft vibes',235,785,550);break;
 case 15:s=rect(90,90,820,820,50,'none',B,5)+star(145,170,35)+star(840,770,28)+text(160,865,'dream notes',54,A);break;
 case 16:s=circle(830,190,105,'url(#g)','none',0)+path('M65 800Q500 690 935 800',B,26)+text(95,890,'GOLDEN HOUR',60,A);break;
 case 17:s=rect(70,65,860,870,120,'none',A,12)+rect(100,95,800,810,100,'none',B,4)+star(160,800,45)+text(525,875,'SELFIE',60,A);break;
 case 18:s=rect(75,75,290,175,12,'none',A,9)+rect(660,745,275,165,12,'none',B,9)+path('M60 660L250 740 M700 170L920 90',B,16)+star(830,250,30);break;
 case 19:s=Array.from({length:4},(_,j)=>path(`M${70+j*14} ${150+j*14}Q500 ${40+j*14} ${930-j*14} ${150+j*14}`,j%2?B:A,8)).join('')+badge('SOFT GLOW',190,815,620);break;
 case 20:s=path('M70 250L230 105L440 185 M580 860L780 730L940 790',A,30)+text(100,885,'STREET!',98,B,'transform="rotate(-8 100 885)"');break;
 case 21:s=confetti(25)+badge('VIBE CHECK',160,780,680);break;
 case 22:s=path('M140 155L260 180L320 90L430 160L570 110L650 185L820 130L770 280L880 360L740 440L790 565L650 530L560 640L430 530L270 590L260 430L100 390L190 280Z',A,14,'url(#g)')+text(255,390,'WOW!',120,'#ffffff');break;
 case 23:s=rect(65,70,870,860,50,'none',A,15)+path('M80 240H920 M80 760H920',B,30)+text(230,850,'Y2K  ☆',95,A);break;
 case 24:s=path('M0 180L1000 105 M0 800L1000 875',A,65)+path('M0 215L1000 140 M0 835L1000 910',B,10)+text(115,790,'SK8',100,B);break;
 case 25:s=confetti(15)+path('M80 160Q230 70 390 180 M620 800Q800 920 920 760',A,15)+text(130,900,'DOODLE!',78,B);break;
 case 26:s=Array.from({length:12},(_,j)=>path(`M500 500L${500+450*Math.cos(j*Math.PI/6)} ${500+450*Math.sin(j*Math.PI/6)}`,j%2?B:A,15)).join('')+circle(500,500,135,'url(#g)','none',0)+text(425,520,'POP',70);break;
 case 27:s=Array.from({length:9},(_,j)=>circle(100+(j*179)%800,95+(j*113)%790,18+j%3*12,j%2?B:A,'none',0)).join('')+badge('SPRAY',280,820,450);break;
 case 28:s=path('M0 100H780L1000 235H220Z',A,10,'url(#g)')+text(100,195,'STREET MODE',60)+path('M0 825H800L1000 930H180Z',B,12);break;
 case 29:s=Array.from({length:8},(_,j)=>star(125+(j*197)%750,110+(j*139)%770,25+j%3*12)).join('')+badge('HYPE!',290,805,420);break;
 case 30:s=badge('● ON AIR',90,85,470)+circle(825,160,60,'none',B,10)+path('M805 135Q825 105 845 135V165Q825 195 805 165Z M825 195V220',B,9)+dotrow(100,900,8,45);break;
 case 31:s=Array.from({length:22},(_,j)=>rect(80+j*39,790-(j%7)*23,15,80+(j%7)*46,8,j%2?A:B,'none',0)).join('')+badge('SOUND ON',100,90,580);break;
 case 32:s=rect(0,775,1000,145,0,'url(#g)','none',0)+rect(65,795,16,105,8,'#ffffff','none',0)+text(115,855,'YOUR NAME',64)+text(115,898,'CREATOR • CHANNEL',29);break;
 case 33:s=circle(185,815,85,'none',A,14)+badge('@CREATOR',300,780,615)+path('M100 165H900',B,12)+text(110,130,'CREATOR ID',40,A);break;
 case 34:s=rect(85,725,830,155,65,'url(#g)','none',0)+path('M230 870L190 930L345 870',B,8,B)+text(135,825,'YOUR THOUGHTS...',55);break;
 case 35:s=path('M500 760V900 M440 900H560',A,15)+rect(450,700,100,150,48,'none',B,12)+path('M415 775Q415 865 500 865T585 775',A,10)+badge('MIC CHECK',100,90,580);break;
 case 36:s=rect(690,680,260,260,25,'none',B,15)+badge('REACTION',75,90,590)+path('M75 680V930H620',A,16);break;
 case 37:s=path('M500 90V910',A,14)+rect(55,60,890,880,35,'none',B,10)+badge('INTERVIEW',270,805,460);break;
 case 38:s=Array.from({length:9},(_,j)=>path(`M${90+j*100} 70V930 M70 ${90+j*100}H930`,j%2?B:A,2,'none','opacity=".55"')).join('')+edge();break;
 case 39:s=circle(500,500,345,'none',A,8)+circle(500,500,235,'none',B,4)+path('M500 500L825 350',A,12)+circle(825,350,22,B,'none',0)+badge('SCANNING',280,840,480);break;
 case 40:s=Array.from({length:12},(_,j)=>text(85,110+j*68,j%2?'1010 0011 1101':'0110 1001 0010',39,j%2?A:B,'opacity=".65"')).join('')+badge('DIGITAL',270,790,460);break;
 case 41:s=circle(500,500,330,'none',A,12)+circle(500,500,190,'none',B,8)+path('M500 80V220 M500 780V920 M80 500H220 M780 500H920',A,13)+star(740,270,34);break;
 case 42:s=rect(70,80,860,840,70,'none',A,6)+rect(95,105,810,790,65,'none',B,3)+Array.from({length:5},(_,j)=>circle(155+j*70,150,12,j%2?B:A,'none',0)).join('')+text(125,855,'HOLOGRAM',70,A);break;
 case 43:s=path('M70 220H250V380H430V150H690V280H930 M70 770H340V590H600V850H930',A,12)+[ [250,380],[430,150],[690,280],[340,590],[600,850] ].map(([x,y])=>circle(x,y,21,B,'none',0)).join('');break;
 case 44:s=Array.from({length:9},(_,j)=>path(`M${80+j*105} 80V${320+j%4*110}`,j%2?A:B,10)).join('')+Array.from({length:9},(_,j)=>circle(80+j*105,350+j%4*110,15,j%2?A:B,'none',0)).join('')+badge('DATA',330,830,350);break;
 case 45:s=star(175,155,70)+path('M85 775Q500 690 915 775',A,16)+badge('BIG IDEA!',210,810,610);break;
 case 46:s=Array.from({length:6},(_,j)=>circle(500+220*Math.cos(j*Math.PI/3),480+220*Math.sin(j*Math.PI/3),20,j%2?B:A,'none',0)).join('')+circle(500,480,75,'none',A,10)+path('M280 480Q500 200 720 480Q500 760 280 480',B,12)+badge('SCIENCE',260,815,490);break;
 case 47:s=rect(90,90,820,820,15,'none',A,8)+Array.from({length:8},(_,j)=>path(`M140 ${230+j*75}H860`,'#ffffff',3,'none','opacity=".65"')).join('')+path('M170 145H500',B,18)+badge('STUDY',300,820,400);break;
 case 48:s=path('M460 620L420 730H580L540 620 M360 450Q350 310 500 300Q650 310 640 450L565 575H435Z',A,12,'none')+Array.from({length:6},(_,j)=>path(`M500 240V${190-j%2*20}`,B,8)).join('')+badge('IDEA!',300,820,400);break;
 case 49:s=badge('EXPLAINER',120,85,750)+path('M90 780H850 M90 830H700 M90 880H570',A,17)+star(850,835,50);break;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1000 1000" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${A}"/><stop offset="1" stop-color="${B}"/></linearGradient></defs>${s}</svg>`;
}
function render(){catalog.replaceChildren();const portrait=$('ratio').value==='9:16',w=portrait?720:1280,h=portrait?1280:720,a=$('primary').value,b=$('secondary').value;
 models.forEach(m=>{const card=document.createElement('article');card.className='card';const preview=document.createElement('div');preview.className='preview';preview.innerHTML=art(m,w,h,a,b);const name=document.createElement('div');name.className='name';name.textContent=m.name;const category=document.createElement('div');category.className='category';category.textContent=m.category;const tier=document.createElement('div');tier.className='tier';tier.textContent=m.tier;const button=document.createElement('button');button.textContent='Aplicar na câmera';button.addEventListener('click',()=>applyCamera(m,button));const scenesButton=document.createElement('button');scenesButton.textContent='Adicionar às Cenas';scenesButton.addEventListener('click',()=>create(m,scenesButton));card.append(preview,category,name,tier,button,scenesButton);catalog.appendChild(card);});}
async function generatePng(m){
 const portrait=$('ratio').value==='9:16',w=portrait?720:1280,h=portrait?1280:720;
 const svg=art(m,w,h,$('primary').value,$('secondary').value);
 const image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try { await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Falha ao renderizar moldura.'));image.src=url;}); }
 finally {URL.revokeObjectURL(url);}
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(image,0,0,w,h);
 return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Falha ao gerar PNG.')),'image/png'));
}
async function applyCamera(m,button){
 button.disabled=true;button.textContent='Aplicando…';
 try {const png=await generatePng(m);
  if(window.parent===window)throw new Error('Abra a biblioteca pela câmera.');
  const buffer=await png.arrayBuffer();
  window.parent.postMessage({type:'lousa-cam-frame-apply',mime:'image/png',bytes:buffer},window.location.origin,[buffer]);
 }catch(error){$('status').textContent='Erro: '+error.message;}
 finally{button.disabled=false;button.textContent='Aplicar na câmera';}
}
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