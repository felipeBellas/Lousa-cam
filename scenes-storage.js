
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — CENAS
   ARMAZENAMENTO INDEPENDENTE — ETAPA 1

   IndexedDB separado da Galeria de vídeos.
   Nenhuma câmera, gravação ou interface é alterada.

   Estrutura:
   apresentação { id, schemaVersion, title, createdAt,
     updatedAt, aspectRatio, scenes: [
       { id, title, background, elements: [] }
     ] }

   Elementos podem conter dados estruturados e Blobs.
   ========================================================= */

window.ScenesStorage = (() => {
  const DB_NAME = "lousa-cam-scenes";
  const DB_VERSION = 1;
  const STORE_NAME = "presentations";
  const SCHEMA_VERSION = 1;

  function ensureAvailable() {
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB não está disponível neste navegador.");
    }
  }

  function createId(prefix = "scene") {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }

  function openDatabase() {
    ensureAvailable();
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir o banco de Cenas."));
      request.onblocked = () => reject(new Error("Banco de Cenas bloqueado por outra aba."));
    });
  }

  async function runTransaction(mode, action) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let tx;
      let result;
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        db.close();
        if (error) reject(error);
        else resolve(value);
      };
      try {
        tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = action(store);
        if (request) {
          request.onsuccess = () => { result = request.result; };
        }
        tx.oncomplete = () => finish(null, result);
        tx.onerror = () => finish(tx.error || new Error("Falha na transação de Cenas."));
        tx.onabort = () => finish(tx.error || new Error("Transação de Cenas cancelada."));
      } catch (error) {
        finish(error);
      }
    });
  }

  function normalizeScene(scene = {}, index = 0) {
    if (!scene || typeof scene !== "object" || Array.isArray(scene)) {
      throw new TypeError("Cena inválida.");
    }
    return {
      ...scene,
      id: typeof scene.id === "string" && scene.id ? scene.id : createId("scene"),
      title: typeof scene.title === "string" ? scene.title : `Cena ${index + 1}`,
      background: scene.background ?? { type: "transparent" },
      elements: Array.isArray(scene.elements) ? scene.elements : []
    };
  }

  function normalizePresentation(data, existing = null) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new TypeError("Apresentação inválida.");
    }
    const now = Date.now();
    const scenes = Array.isArray(data.scenes) ? data.scenes : (existing?.scenes || []);
    const normalized = scenes.map(normalizeScene);
    const ids = new Set(normalized.map(scene => scene.id));
    if (ids.size !== normalized.length) {
      throw new Error("Existem cenas com IDs repetidos.");
    }
    return {
      ...(existing || {}),
      ...data,
      id: existing?.id || (typeof data.id === "string" && data.id ? data.id : createId("presentation")),
      schemaVersion: SCHEMA_VERSION,
      title: typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : (existing?.title || "Apresentação sem título"),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      aspectRatio: data.aspectRatio || existing?.aspectRatio || "auto",
      scenes: normalized
    };
  }

  async function createPresentation(data = {}) {
    const presentation = normalizePresentation(data);
    // add() impede substituir acidentalmente um ID existente.
    await runTransaction("readwrite", store => store.add(presentation));
    return presentation;
  }

  async function getPresentation(id) {
    if (typeof id !== "string" || !id) throw new TypeError("ID inválido.");
    return (await runTransaction("readonly", store => store.get(id))) || null;
  }

  async function getPresentations() {
    const all = await runTransaction("readonly", store => store.getAll());
    return (all || []).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function savePresentation(data) {
    if (!data || typeof data.id !== "string" || !data.id) {
      throw new TypeError("Para atualizar, informe o ID da apresentação.");
    }
    // Leitura e gravação na MESMA transação: evita recriar apresentação excluída.
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let tx;
      let updated;
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        db.close();
        if (error) reject(error);
        else resolve(value);
      };
      try {
        tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const read = store.get(data.id);
        read.onsuccess = () => {
          if (!read.result) {
            tx.abort();
            return;
          }
          try {
            updated = normalizePresentation(data, read.result);
            store.put(updated);
          } catch (error) {
            tx.abort();
          }
        };
        tx.oncomplete = () => finish(null, updated);
        tx.onerror = () => finish(tx.error || new Error("Falha ao atualizar apresentação."));
        tx.onabort = () => finish(new Error("Apresentação inexistente ou dados inválidos."));
      } catch (error) {
        finish(error);
      }
    });
  }

  async function deletePresentation(id) {
    if (typeof id !== "string" || !id) throw new TypeError("ID inválido.");
    await runTransaction("readwrite", store => store.delete(id));
    return true;
  }

  async function duplicatePresentation(id) {
    const original = await getPresentation(id);
    if (!original) throw new Error("Apresentação não encontrada.");
    const copy = {
      ...original,
      id: createId("presentation"),
      title: `${original.title} (cópia)`,
      scenes: original.scenes.map((scene, index) => ({
        ...scene,
        id: createId("scene"),
        title: scene.title || `Cena ${index + 1}`,
        elements: scene.elements.map(element => ({
          ...element,
          id: createId("element")
        }))
      }))
    };
    return createPresentation(copy);
  }

  async function exportPresentation(id) {
    const presentation = await getPresentation(id);
    if (!presentation) throw new Error("Apresentação não encontrada.");
    // Exportação estruturada; Blobs ficam preservados no objeto JS.
    // A criação de arquivo portátil com imagens será implementada depois.
    return presentation;
  }

  return Object.freeze({
    createId,
    createPresentation,
    savePresentation,
    getPresentation,
    getPresentations,
    deletePresentation,
    duplicatePresentation,
    exportPresentation
  });
})();
