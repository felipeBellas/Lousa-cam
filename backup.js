"use strict";
/* LOUSA CAM — Exportação local ZIP, somente leitura. Formato v1. */
window.LousaCamBackup = (() => {
  const encoder = new TextEncoder();
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  const u16 = (view, offset, n) => view.setUint16(offset, n, true);
  const u32 = (view, offset, n) => view.setUint32(offset, n >>> 0, true);
  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (const b of bytes) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  const asBytes = async value => value instanceof Blob
    ? new Uint8Array(await value.arrayBuffer()) : encoder.encode(value);
  async function buildZip(entries) {
    const parts = [], central = [];
    let offset = 0;
    for (const entry of entries) {
      const name = encoder.encode(entry.name);
      const bytes = await asBytes(entry.data);
      if (bytes.length > 0xFFFFFFFF || offset > 0xFFFFFFFF) throw new Error('Backup excede o limite do formato ZIP.');
      const crc = crc32(bytes);
      const header = new Uint8Array(30 + name.length);
      const h = new DataView(header.buffer);
      u32(h, 0, 0x04034b50); u16(h, 4, 20); u16(h, 6, 0x0800);
      u16(h, 8, 0); u32(h, 14, crc); u32(h, 18, bytes.length);
      u32(h, 22, bytes.length); u16(h, 26, name.length);
      header.set(name, 30);
      const record = new Uint8Array(46 + name.length);
      const r = new DataView(record.buffer);
      u32(r, 0, 0x02014b50); u16(r, 4, 20); u16(r, 6, 20);
      u16(r, 8, 0x0800); u16(r, 10, 0); u32(r, 16, crc);
      u32(r, 20, bytes.length); u32(r, 24, bytes.length);
      u16(r, 28, name.length); u32(r, 42, offset);
      record.set(name, 46);
      central.push(record);
      parts.push(header, entry.data instanceof Blob ? entry.data : bytes);
      offset += header.length + bytes.length;
    }
    if (entries.length > 65535) throw new Error('Quantidade de arquivos acima do limite ZIP.');
    const centralSize = central.reduce((sum, item) => sum + item.length, 0);
    if (offset + centralSize > 0xFFFFFFFF) throw new Error('Backup muito grande para ZIP clássico.');
    const end = new Uint8Array(22);
    const e = new DataView(end.buffer);
    u32(e, 0, 0x06054b50); u16(e, 8, entries.length);
    u16(e, 10, entries.length); u32(e, 12, centralSize); u32(e, 16, offset);
    return new Blob([...parts, ...central, end], {type: 'application/zip'});
  }
  async function exportBackup(includeGallery = false) {
    if (!window.ScenesStorage?.getPresentations) throw new Error('Armazenamento de Cenas indisponível.');
    if (includeGallery && !window.VideoStorage?.getVideos) throw new Error('Armazenamento da Galeria indisponível.');
    const presentations = await window.ScenesStorage.getPresentations();
    const videos = includeGallery ? await window.VideoStorage.getVideos() : [];
    const entries = [];
    let assetCount = 0;
    // Preserva blobs em qualquer profundidade, sem alterar os objetos originais.
    async function serialize(value, path = []) {
      if (value instanceof Blob) {
        const filename = `assets/${String(++assetCount).padStart(6, '0')}.bin`;
        entries.push({name: filename, data: value});
        return {__lousaCamBlob: filename, type: value.type, name: value instanceof File ? value.name : null};
      }
      if (Array.isArray(value)) return Promise.all(value.map((v, i) => serialize(v, [...path, i])));
      if (value && typeof value === 'object') {
        if (value instanceof Date) return {__lousaCamDate: value.toISOString()};
        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) throw new Error('Encontrado recurso binário não suportado; backup cancelado para evitar perda.');
        const result = {};
        for (const [key, item] of Object.entries(value)) result[key] = await serialize(item, [...path, key]);
        return result;
      }
      return value;
    }
    const payload = {
      format: 'lousa-cam-backup', version: 1, exportedAt: new Date().toISOString(),
      includesGallery: includeGallery,
      presentations: await serialize(presentations),
      videos: await serialize(videos)
    };
    entries.unshift({name: 'manifest.json', data: JSON.stringify(payload, null, 2)});
    const zip = await buildZip(entries);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `Lousa-Cam-Backup-${includeGallery ? 'Completo' : 'Cenas'}-${stamp}.zip`;
    const url = URL.createObjectURL(zip);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return {filename, presentations: presentations.length, videos: videos.length, bytes: zip.size};
  }
  return Object.freeze({exportBackup});
})();
