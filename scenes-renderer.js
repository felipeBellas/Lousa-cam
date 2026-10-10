
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — CENAS
   SCENES-RENDERER.JS — ETAPA 5

   Renderizador independente para Canvas 2D.

   Recursos:
   - Fundo transparente ou sólido
   - Textos com múltiplas linhas
   - Imagens armazenadas como Blob
   - Formas geométricas
   - Posição, tamanho e rotação
   - Opacidade
   - Ajuste proporcional ao Canvas
   - Cache de imagens
   - Miniaturas
   - Liberação de recursos

   Não modifica a câmera nem a gravação.
   ========================================================= */

(() => {

  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 720;

  const imageCache = new Map();

  const DEFAULT_FONT =
    'Arial, Helvetica, sans-serif';

  /* =====================================================
     UTILITÁRIOS
     ===================================================== */

  function number(value, fallback = 0) {

    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;

  }

  function clamp(value, min, max) {

    return Math.min(
      max,
      Math.max(min, value)
    );

  }

  function normalizeColor(value, fallback = "#ffffff") {

    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      return fallback;
    }

    return value;

  }

  function getDimensions(canvas) {

    return {
      width: canvas.width,
      height: canvas.height
    };

  }

  function getScale(canvas) {

    const dimensions = getDimensions(canvas);

    return {
      x: dimensions.width / BASE_WIDTH,
      y: dimensions.height / BASE_HEIGHT
    };

  }

  /* =====================================================
     CACHE DE IMAGENS
     ===================================================== */

  async function loadImage(blob) {

    if (!(blob instanceof Blob)) {
      return null;
    }

    if (imageCache.has(blob)) {
      return imageCache.get(blob);
    }

    const promise = new Promise((resolve, reject) => {

      const url = URL.createObjectURL(blob);

      const image = new Image();

      image.onload = () => {

        URL.revokeObjectURL(url);

        resolve(image);

      };

      image.onerror = () => {

        URL.revokeObjectURL(url);

        reject(
          new Error("Não foi possível carregar a imagem.")
        );

      };

      image.src = url;

    });

    imageCache.set(blob, promise);

    try {

      return await promise;

    } catch (error) {

      imageCache.delete(blob);

      throw error;

    }

  }

  async function prepareScene(scene) {

    if (!scene || !Array.isArray(scene.elements)) {
      return;
    }

    const images = scene.elements.filter(
      element =>
        element.type === "image" &&
        element.blob instanceof Blob
    );

    await Promise.all(
      images.map(element => loadImage(element.blob))
    );

  }

  async function preparePresentation(presentation) {

    if (!presentation || !Array.isArray(presentation.scenes)) {
      return;
    }

    for (const scene of presentation.scenes) {
      await prepareScene(scene);
    }

  }

  /* =====================================================
     FUNDO
     ===================================================== */

  function drawBackground(ctx, scene, canvas) {

    const background = scene.background || {};

    if (background.type !== "solid") {
      return;
    }

    ctx.save();

    ctx.fillStyle = normalizeColor(
      background.color,
      "#ffffff"
    );

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.restore();

  }

  /* =====================================================
     TEXTO — QUEBRA DE LINHAS
     ===================================================== */

  function wrapText(ctx, text, maxWidth) {

    const lines = [];

    const paragraphs = String(text || "").split("\n");

    for (const paragraph of paragraphs) {

      if (!paragraph.trim()) {

        lines.push("");

        continue;

      }

      const words = paragraph.split(/\s+/);

      let line = "";

      for (const word of words) {

        const candidate = line
          ? `${line} ${word}`
          : word;

        if (
          ctx.measureText(candidate).width <= maxWidth ||
          !line
        ) {

          line = candidate;

        } else {

          lines.push(line);
          line = word;

        }

      }

      lines.push(line);

    }

    return lines;

  }

  /* =====================================================
     TEXTO
     ===================================================== */

  function drawText(ctx, element) {

    const width = Math.max(
      1,
      number(element.width, 300)
    );

    const height = Math.max(
      1,
      number(element.height, 100)
    );

    const fontSize = clamp(
      number(element.fontSize, 48),
      8,
      300
    );

    const fontFamily =
      element.fontFamily || DEFAULT_FONT;

    const fontWeight =
      element.fontWeight || "normal";

    const fontStyle =
      element.fontStyle || "normal";

    ctx.font =
      `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

    ctx.fillStyle = normalizeColor(
      element.color,
      "#ffffff"
    );

    ctx.textBaseline = "top";

    const alignment =
      element.align || "left";

    ctx.textAlign = alignment;

    const padding = number(
      element.padding,
      0
    );

    const availableWidth = Math.max(
      1,
      width - padding * 2
    );

    const lines = wrapText(
      ctx,
      element.text || "",
      availableWidth
    );

    const lineHeight =
      fontSize * number(element.lineHeight, 1.15);

    let x = padding;

    if (alignment === "center") {
      x = width / 2;
    }

    if (alignment === "right") {
      x = width - padding;
    }

    ctx.save();

    ctx.beginPath();

    ctx.rect(
      0,
      0,
      width,
      height
    );

    ctx.clip();

    for (let i = 0; i < lines.length; i++) {

      const y = padding + i * lineHeight;

      if (y > height) break;

      ctx.fillText(
        lines[i],
        x,
        y
      );

    }

    ctx.restore();

  }

  /* =====================================================
     IMAGENS
     ===================================================== */

  function drawImage(ctx, element) {

    const blob = element.blob;

    if (!(blob instanceof Blob)) {
      return;
    }

    const cached = imageCache.get(blob);

    if (!cached || typeof cached.then === "function") {
      return;
    }

    const image = cached;

    const width = Math.max(
      1,
      number(element.width, 300)
    );

    const height = Math.max(
      1,
      number(element.height, 200)
    );

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
      return;
    }

    const fit = Math.min(
      width / naturalWidth,
      height / naturalHeight
    );

    const drawWidth = naturalWidth * fit;
    const drawHeight = naturalHeight * fit;

    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;

    ctx.drawImage(
      image,
      x,
      y,
      drawWidth,
      drawHeight
    );

  }

  /* =====================================================
     FORMAS
     ===================================================== */

  function drawShape(ctx, element) {

    const width = Math.max(
      1,
      number(element.width, 300)
    );

    const height = Math.max(
      1,
      number(element.height, 200)
    );

    const shape = element.shape || "rectangle";

    ctx.fillStyle = normalizeColor(
      element.color,
      "#3287ff"
    );

    ctx.beginPath();

    switch (shape) {

      case "ellipse":

        ctx.ellipse(
          width / 2,
          height / 2,
          width / 2,
          height / 2,
          0,
          0,
          Math.PI * 2
        );

        break;

      case "triangle":

        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        break;

      case "line":

        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);

        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = Math.max(
          2,
          number(element.strokeWidth, 5)
        );

        ctx.stroke();

        return;

      case "arrow":

        const arrowHeight = height * 0.35;

        ctx.moveTo(0, height / 2 - arrowHeight / 2);
        ctx.lineTo(width * 0.65, height / 2 - arrowHeight / 2);
        ctx.lineTo(width * 0.65, 0);
        ctx.lineTo(width, height / 2);
        ctx.lineTo(width * 0.65, height);
        ctx.lineTo(width * 0.65, height / 2 + arrowHeight / 2);
        ctx.lineTo(0, height / 2 + arrowHeight / 2);
        ctx.closePath();

        break;

      case "rounded":

        const radius = Math.min(
          number(element.radius, 20),
          width / 2,
          height / 2
        );

        ctx.roundRect(
          0,
          0,
          width,
          height,
          radius
        );

        break;

      case "rectangle":
      default:

        ctx.rect(
          0,
          0,
          width,
          height
        );

        break;

    }

    ctx.fill();

  }

  /* =====================================================
     ELEMENTO INDIVIDUAL
     ===================================================== */

  function drawElement(ctx, element) {

    if (!element || element.visible === false) {
      return;
    }

    const x = number(element.x, 0);
    const y = number(element.y, 0);

    const width = Math.max(
      1,
      number(element.width, 300)
    );

    const height = Math.max(
      1,
      number(element.height, 200)
    );

    const rotation =
      number(element.rotation, 0) *
      Math.PI / 180;

    const opacity = clamp(
      number(element.opacity, 1),
      0,
      1
    );

    ctx.save();

    ctx.globalAlpha *= opacity;

    ctx.translate(
      x + width / 2,
      y + height / 2
    );

    ctx.rotate(rotation);

    ctx.translate(
      -width / 2,
      -height / 2
    );

    switch (element.type) {

      case "text":
        drawText(ctx, element);
        break;

      case "image":
        drawImage(ctx, element);
        break;

      case "shape":
        drawShape(ctx, element);
        break;

    }

    ctx.restore();

  }

  /* =====================================================
     RENDERIZAÇÃO DA CENA
     ===================================================== */

  function renderScene(ctx, scene, options = {}) {

    if (!ctx || !scene) return;

    const canvas = ctx.canvas;

    if (!canvas) return;

    const clear = options.clear === true;

    ctx.save();

    if (clear) {
      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    const scale = getScale(canvas);

    ctx.scale(
      scale.x,
      scale.y
    );

    drawBackground(ctx, scene, {
      width: BASE_WIDTH,
      height: BASE_HEIGHT
    });

    const elements = Array.isArray(scene.elements)
      ? scene.elements
      : [];

    for (const element of elements) {
      drawElement(ctx, element);
    }

    ctx.restore();

  }

  /* =====================================================
     RENDERIZAÇÃO DE APRESENTAÇÃO
     ===================================================== */

  function renderPresentation(
    ctx,
    presentation,
    sceneIndex = 0,
    options = {}
  ) {

    if (
      !presentation ||
      !Array.isArray(presentation.scenes)
    ) {
      return;
    }

    const scene = presentation.scenes[sceneIndex];

    if (!scene) return;

    renderScene(
      ctx,
      scene,
      options
    );

  }

  /* =====================================================
     MINIATURA
     ===================================================== */

  async function createThumbnail(
    scene,
    width = 320,
    height = 180
  ) {

    await prepareScene(scene);

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    renderScene(
      ctx,
      scene,
      { clear: true }
    );

    return canvas.toDataURL("image/png");

  }

  /* =====================================================
     DESENHO EM CANVAS EXTERNO

     Uso futuro:
     renderizar a Cena sobre o quadro da câmera.
     ===================================================== */

  function renderToCanvas(
    canvas,
    scene,
    options = {}
  ) {

    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Canvas inválido.");
    }

    const ctx = canvas.getContext("2d");

    renderScene(
      ctx,
      scene,
      options
    );

    return canvas;

  }

  /* =====================================================
     CACHE — PREPARAÇÃO E LIMPEZA
     ===================================================== */

  async function cacheSceneImages(scene) {

    if (!scene || !Array.isArray(scene.elements)) {
      return;
    }

    for (const element of scene.elements) {

      if (
        element.type === "image" &&
        element.blob instanceof Blob
      ) {

        const image = await loadImage(element.blob);

        imageCache.set(
          element.blob,
          image
        );

      }

    }

  }

  async function cachePresentationImages(presentation) {

    if (
      !presentation ||
      !Array.isArray(presentation.scenes)
    ) {
      return;
    }

    for (const scene of presentation.scenes) {
      await cacheSceneImages(scene);
    }

  }

  function clearCache() {

    imageCache.clear();

  }

  /* =====================================================
     API PÚBLICA
     ===================================================== */

  window.ScenesRenderer = Object.freeze({

    BASE_WIDTH,
    BASE_HEIGHT,

    prepareScene,
    preparePresentation,

    cacheSceneImages,
    cachePresentationImages,

    renderScene,
    renderPresentation,
    renderToCanvas,

    createThumbnail,

    clearCache

  });

})();
