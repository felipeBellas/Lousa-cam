
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — CENAS
   SCENES-PLAYER.JS — ETAPA 6

   Controlador independente de apresentações.
   Ajuste: transmite aspectRatio ao Renderer.
   Não modifica câmera, Pencil ou MediaRecorder.
   ========================================================= */

(() => {
  const Storage = window.ScenesStorage;
  const Renderer = window.ScenesRenderer;

  const state = {
    presentation: null,
    sceneIndex: 0,
    active: false,
    loading: false,
    canvas: null,
    context: null,
    generation: 0
  };

  const listeners = new Map();

  function on(eventName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback inválido.");
    }
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }
    listeners.get(eventName).add(callback);
    return () => off(eventName, callback);
  }

  function off(eventName, callback) {
    const callbacks = listeners.get(eventName);
    if (!callbacks) return;
    callbacks.delete(callback);
    if (callbacks.size === 0) listeners.delete(eventName);
  }

  function emit(eventName, detail = {}) {
    const callbacks = listeners.get(eventName);
    if (!callbacks) return;
    for (const callback of callbacks) {
      try {
        callback(detail);
      } catch (error) {
        console.error("[ScenesPlayer] Erro no evento:", eventName, error);
      }
    }
  }

  function getSceneCount() {
    return state.presentation?.scenes?.length || 0;
  }

  function getCurrentScene() {
    if (!state.presentation) return null;
    return state.presentation.scenes[state.sceneIndex] || null;
  }

  function getState() {
    return {
      active: state.active,
      loading: state.loading,
      presentationId: state.presentation?.id || null,
      presentationTitle: state.presentation?.title || null,
      aspectRatio: state.presentation?.aspectRatio || null,
      sceneIndex: state.sceneIndex,
      sceneNumber: getSceneCount() ? state.sceneIndex + 1 : 0,
      sceneCount: getSceneCount(),
      sceneTitle: getCurrentScene()?.title || null,
      hasPrevious: state.active && state.sceneIndex > 0,
      hasNext: state.active && state.sceneIndex < getSceneCount() - 1
    };
  }

  function setCanvas(canvas) {
    if (canvas === null) {
      state.canvas = null;
      state.context = null;
      emit("canvaschange", getState());
      return;
    }
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("O destino deve ser um HTMLCanvasElement.");
    }
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D indisponível.");
    state.canvas = canvas;
    state.context = context;
    render();
    emit("canvaschange", getState());
  }

  function clearCanvas() {
    if (!state.canvas || !state.context) return;
    const ctx = state.context;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.restore();
  }

  function render() {
    if (!state.active) {
      clearCanvas();
      return false;
    }
    const scene = getCurrentScene();
    if (!scene || !Renderer) {
      clearCanvas();
      return false;
    }
    if (!state.context) return false;

    Renderer.renderScene(state.context, scene, {
      clear: true,
      aspectRatio: state.presentation?.aspectRatio
    });
    emit("render", getState());
    return true;
  }

  /*
   * Desenha sobre o contexto de composição,
   * sem limpá-lo.
   *
   * A chamada pelo app.js será integrada
   * em etapa posterior.
   */
  function renderOnContext(context) {
    if (!state.active || !Renderer) return false;
    const scene = getCurrentScene();
    if (!scene || !context) return false;

    Renderer.renderScene(context, scene, {
      clear: false,
      aspectRatio: state.presentation?.aspectRatio
    });
    return true;
  }

  async function loadPresentation(id) {
    if (!Storage || !Renderer) {
      throw new Error(
        "ScenesStorage ou ScenesRenderer não foi carregado."
      );
    }
    if (typeof id !== "string" || !id) {
      throw new TypeError("ID de apresentação inválido.");
    }

    const generation = ++state.generation;
    state.loading = true;
    state.active = false;
    clearCanvas();
    emit("loading", getState());

    try {
      const presentation = await Storage.getPresentation(id);

      if (generation !== state.generation) return false;

      if (!presentation) {
        throw new Error("Apresentação não encontrada.");
      }

      if (
        !Array.isArray(presentation.scenes) ||
        presentation.scenes.length === 0
      ) {
        throw new Error("A apresentação não contém cenas.");
      }

      await Renderer.cachePresentationImages(presentation);

      if (generation !== state.generation) return false;

      state.presentation = presentation;
      state.sceneIndex = 0;
      state.active = true;

      render();
      emit("loaded", getState());
      emit("scenechange", getState());

      return true;
    } catch (error) {
      if (generation === state.generation) {
        state.presentation = null;
        state.sceneIndex = 0;
        state.active = false;
        clearCanvas();
        emit("error", {
          message: error.message,
          error
        });
      }
      throw error;
    } finally {
      if (generation === state.generation) {
        state.loading = false;
        emit("loadingend", getState());
      }
    }
  }

  function goToScene(index) {
    if (!state.active || !state.presentation) return false;

    const target = Number(index);

    if (
      !Number.isInteger(target) ||
      target < 0 ||
      target >= getSceneCount()
    ) {
      return false;
    }

    if (target === state.sceneIndex) return true;

    state.sceneIndex = target;
    render();
    emit("scenechange", getState());

    return true;
  }

  function nextScene() {
    return goToScene(state.sceneIndex + 1);
  }

  function previousScene() {
    return goToScene(state.sceneIndex - 1);
  }

  function firstScene() {
    return goToScene(0);
  }

  function lastScene() {
    return goToScene(getSceneCount() - 1);
  }

  function closePresentation() {
    state.generation++;
    state.presentation = null;
    state.sceneIndex = 0;
    state.active = false;
    state.loading = false;

    clearCanvas();
    emit("closed", getState());
  }

  async function listPresentations() {
    if (!Storage) {
      throw new Error("ScenesStorage não está disponível.");
    }
    return Storage.getPresentations();
  }

  function isActive() {
    return state.active;
  }

  function hasNext() {
    return state.active &&
      state.sceneIndex < getSceneCount() - 1;
  }

  function hasPrevious() {
    return state.active &&
      state.sceneIndex > 0;
  }

  window.ScenesPlayer = Object.freeze({
    on,
    off,

    setCanvas,
    clearCanvas,

    loadPresentation,
    closePresentation,
    listPresentations,

    getState,
    getCurrentScene,
    getSceneCount,

    goToScene,
    nextScene,
    previousScene,
    firstScene,
    lastScene,

    render,
    renderOnContext,

    isActive,
    hasNext,
    hasPrevious
  });
})();
