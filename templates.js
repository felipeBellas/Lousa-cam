(() => {
'use strict';
const models = [
 ['Abertura de aula','Educação','free','CIÊNCIAS','Aprendendo juntos','Comece a aula com uma apresentação clara.'],
 ['Explicação de conceito','Educação','pro','CONCEITO','Entenda o assunto','Organize uma explicação por etapas.'],
 ['Resumo da aula','Educação','pro','RESUMO','O que aprendemos?','Revise os pontos essenciais.'],
 ['Abertura de vídeo','Criadores','pro','BEM-VINDOS','Novo vídeo','Uma abertura para seu canal.'],
 ['Apresentação do criador','Criadores','pro','SOBRE MIM','Minha história','Apresente sua trajetória.'],
 ['Encerramento','Criadores','pro','ATÉ A PRÓXIMA','Obrigado por assistir','Finalize seu conteúdo.'],
 ['Passo a passo','Tutoriais','pro','PASSO A PASSO','Etapa 1','Ensine de forma organizada.'],
 ['Demonstração','Tutoriais','pro','DEMONSTRAÇÃO','Veja como funciona','Mostre o processo.'],
 ['Dicas rápidas','Tutoriais','pro','DICAS','Três ideias úteis','Conteúdo direto ao ponto.'],
 ['Apresentação de projeto','Profissional','pro','PROJETO','Nossa proposta','Apresente objetivos.'],
 ['Comparação','Profissional','pro','COMPARAÇÃO','Antes e depois','Compare alternativas.'],
 ['Resultados','Profissional','pro','RESULTADOS','O que alcançamos','Apresente conclusões.']
];
const $=id=>document.getElementById(id);
const gallery=$('models');
let ratio='9:16';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 gallery.innerHTML='';
 models.forEach((m,i)=>{
  const card=document.createElement('article');card.className='template-card';
  card.innerHTML=`<div class="preview ${ratio==='9:16'?'portrait':'landscape'}"><div class="preview-head">LOUSA CAM</div><div class="preview-main"><strong>${escapeHTML(m[3])}</strong><span>${escapeHTML(m[4])}</span></div><div class="preview-foot">${escapeHTML(m[1])}</div></div><div class="template-info"><div class="template-meta"><span>${escapeHTML(m[1])}</span><b class="${m[2]==='free'?'free':'pro'}">${m[2]==='free'?'FREE':'PRO'}</b></div><h2>${escapeHTML(m[0])}</h2><p>${escapeHTML(m[5])}</p><button type="button" data-model="${i}" ${m[2]==='pro'?'disabled':''}>${m[2]==='free'?'Usar template':'Disponível com PRO'}</button></div>`;
  gallery.append(card);
 });
}
function text(id,text,x,y,width,height,fontSize,color,align='center',weight='bold'){
 return {id,type:'text',x,y,width,height,rotation:0,opacity:1,text,fontSize,color,align,fontFamily:'Arial, sans-serif',fontWeight:weight};
}
function buildPresentation(m){
 const portrait=ratio==='9:16', w=portrait?720:1280,h=portrait?1280:720;
 const id=()=>ScenesStorage.createId('element');
 const ink='#23483C',muted='#4F7264';
 const elements=portrait?[
 text(id(),m[3],55,310,610,135,70,ink),
 text(id(),m[4],65,475,590,115,42,muted),
 text(id(),'LOUSA CAM',95,1000,530,75,28,ink)
 ]:[
 text(id(),m[3],85,190,770,110,75,ink,'left'),
 text(id(),m[4],90,315,760,100,44,muted,'left'),
 text(id(),'LOUSA CAM',925,590,270,60,25,ink)
 ];
 return {title:`${m[0]} — ${ratio}`,aspectRatio:ratio,scenes:[{title:'Abertura',background:{type:'transparent'},elements},{title:'Conteúdo',background:{type:'transparent'},elements:portrait?[
 text(id(),'SEU CONTEÚDO',50,190,620,120,57,ink),text(id(),'Toque para editar o texto',65,390,590,110,34,muted)
 ]:[text(id(),'SEU CONTEÚDO',80,180,1100,110,68,ink),text(id(),'Toque para editar o texto',90,325,1080,90,37,muted)]},{title:'Encerramento',background:{type:'transparent'},elements:portrait?[text(id(),'OBRIGADO!',60,410,600,120,70,ink),text(id(),'Até a próxima',70,580,580,100,40,muted)]:[text(id(),'OBRIGADO!',100,225,1080,120,85,ink),text(id(),'Até a próxima',110,380,1060,85,44,muted)]}]};
}
$('orientation').addEventListener('change',e=>{ratio=e.target.value;render();});
gallery.addEventListener('click',async e=>{
 const btn=e.target.closest('button[data-model]');if(!btn)return;
 const m=models[Number(btn.dataset.model)];if(!m||m[2]!=='free')return;
 btn.disabled=true;btn.textContent='Criando...';
 try{
  if(!window.ScenesStorage)throw Error('Armazenamento de Cenas indisponível.');
  await ScenesStorage.createPresentation(buildPresentation(m));
  $('notice').textContent='Template criado! Abra a apresentação na biblioteca de Cenas.';
  $('notice').hidden=false;
  window.location.assign('./scenes.html');
 }catch(err){$('notice').textContent='Não foi possível criar o template: '+err.message;$('notice').hidden=false;btn.disabled=false;btn.textContent='Usar template';}
});
render();
})();
