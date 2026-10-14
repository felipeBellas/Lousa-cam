"use strict";
/* LOUSA CAM — Importação de backup ZIP v1. Não substitui registros existentes. */
window.LousaCamBackupImport = (() => {
  const decoder = new TextDecoder('utf-8', {fatal:true});
  const crcTable = new Uint32Array(256);
  for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xEDB88320^(c>>>1):c>>>1;crcTable[i]=c>>>0;}
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  function parseZip(buffer){
    const bytes=new Uint8Array(buffer), v=new DataView(buffer);
    const u16=p=>v.getUint16(p,true),u32=p=>v.getUint32(p,true);
    if(bytes.length<22)throw Error('ZIP incompleto.');
    let end=-1;
    for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){end=p;break;}}
    if(end<0)throw Error('Final do ZIP não encontrado.');
    if(u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))throw Error('ZIP multidisco não suportado.');
    const count=u16(end+10),start=u32(end+16),size=u32(end+12);
    if(start+size>end)throw Error('Índice ZIP inválido.');
    const files=new Map();let pos=start;
    for(let i=0;i<count;i++){
      if(pos+46>start+size||u32(pos)!==0x02014b50)throw Error('Índice ZIP corrompido.');
      const flags=u16(pos+8),method=u16(pos+10),crc=u32(pos+16),packed=u32(pos+20),unpacked=u32(pos+24),nameLen=u16(pos+28),extra=u16(pos+30),comment=u16(pos+32),local=u32(pos+42);
      if(flags&1||method!==0||packed!==unpacked)throw Error('Formato ZIP não suportado.');
      if(pos+46+nameLen+extra+comment>start+size)throw Error('Nome ZIP inválido.');
      const name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));
      if(!name||name.includes('..')||name.startsWith('/')||files.has(name))throw Error('Entrada ZIP inválida ou duplicada.');
      if(local+30>bytes.length||u32(local)!==0x04034b50)throw Error('Entrada ZIP incompleta.');
      const dataStart=local+30+u16(local+26)+u16(local+28);
      if(dataStart+packed>start)throw Error('Dados ZIP fora dos limites.');
      const data=bytes.subarray(dataStart,dataStart+packed);
      if(crc32(data)!==crc)throw Error('Falha na integridade do arquivo: '+name);
      files.set(name,data);
      pos+=46+nameLen+extra+comment;
    }
    if(pos!==start+size)throw Error('Índice ZIP inconsistente.');
    return files;
  }
  function revive(value,files,used){
    if(Array.isArray(value))return value.map(v=>revive(v,files,used));
    if(value&&typeof value==='object'){
      if(Object.prototype.hasOwnProperty.call(value,'__lousaCamBlob')){
        const path=value.__lousaCamBlob;
        if(typeof path!=='string'||!path.startsWith('assets/')||!files.has(path)||used.has(path))throw Error('Recurso ausente ou duplicado no backup.');
        used.add(path);const bytes=files.get(path);
        const blob=new Blob([bytes],{type:typeof value.type==='string'?value.type:''});
        return typeof value.name==='string'&&typeof File!=='undefined'?new File([blob],value.name,{type:blob.type}):blob;
      }
      if(Object.keys(value).length===1&&typeof value.__lousaCamDate==='string'){
        const date=new Date(value.__lousaCamDate);if(!Number.isFinite(date.getTime()))throw Error('Data inválida.');return date;
      }
      const result=Object.create(null);
      for(const [key,item] of Object.entries(value))result[key]=revive(item,files,used);
      return result;
    }
    return value;
  }
  function validateRecords(items,label){
    if(!Array.isArray(items))throw Error(label+' inválidos.');
    const ids=new Set();
    for(const item of items){
      if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!item.id||ids.has(item.id))throw Error('ID inválido ou repetido em '+label+'.');
      ids.add(item.id);
    }
  }
  async function insertMissing(dbName,storeName,records){
    if(!records.length)return {added:0,skipped:0};
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open(dbName,1);
      req.onupgradeneeded=()=>{req.transaction.abort();};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||Error('Banco indisponível: '+dbName));
      req.onblocked=()=>reject(Error('Feche outras abas do Lousa Cam.'));
    });
    try{
      if(!db.objectStoreNames.contains(storeName))throw Error('Coleção local indisponível: '+storeName);
      return await new Promise((resolve,reject)=>{
        let added=0,skipped=0,settled=false;
        const tx=db.transaction(storeName,'readwrite'),store=tx.objectStore(storeName);
        const fail=error=>{if(!settled){settled=true;reject(error);}};
        tx.oncomplete=()=>{if(!settled){settled=true;resolve({added,skipped});}};
        tx.onerror=()=>fail(tx.error||Error('Falha ao importar '+storeName));
        tx.onabort=()=>fail(tx.error||Error('Importação cancelada.'));
        for(const record of records){
          const get=store.get(record.id);
          get.onsuccess=()=>{if(get.result){skipped++;return;}store.add(record);added++;};
        }
      });
    }finally{db.close();}
  }
  async function importBackup(file){
    if(!(file instanceof Blob))throw Error('Selecione um arquivo ZIP.');
    if(file.size>1500*1024*1024)throw Error('Arquivo acima do limite de 1,5 GB desta versão.');
    const files=parseZip(await file.arrayBuffer());
    if(!files.has('manifest.json'))throw Error('Manifesto não encontrado.');
    let manifest;
    try{manifest=JSON.parse(decoder.decode(files.get('manifest.json')));}catch(_){throw Error('Manifesto inválido.');}
    if(manifest?.format!=='lousa-cam-backup'||manifest.version!==1)throw Error('Versão de backup incompatível.');
    const used=new Set();
    const presentations=revive(manifest.presentations,files,used);
    const videos=revive(manifest.videos,files,used);
    validateRecords(presentations,'apresentações');validateRecords(videos,'vídeos');
    if(manifest.includesGallery!==true&&videos.length)throw Error('Manifesto inconsistente.');
    for(const name of files.keys())if(name.startsWith('assets/')&&!used.has(name))throw Error('Recurso não referenciado: '+name);
    // Registros com IDs já existentes são preservados. Cada coleção usa uma transação atômica.
    const scenes=await insertMissing('lousa-cam-scenes','presentations',presentations);
    const gallery=await insertMissing('lousa-cam-gallery','videos',videos);
    return {scenes,gallery};
  }
  return Object.freeze({importBackup});
})();
