
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — CENAS
   SCENES-RENDERER.JS

   ETAPA 7 — REVISÃO DE COMPATIBILIDADE

   - Cache de imagens corrigido
   - Renderização síncrona após preparação
   - Transparência preservada
   - Compatível com Canvas de gravação
   - Sem alterações no aplicativo principal
   ========================================================= */

(() => {

  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 720;

  const imageCache = new WeakMap();

  const DEFAULT_FONT = "Arial, Helvetica, sans-serif";

  /* =====================================================
     UTILITÁRIOS
     ===================================================== */

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeColor(value, fallback = "#ffffff") {
    return typeof value === "string" && value.trim()
      ? value
      : fallback;
  }

  function getBlob(element) {
    return element?.blob instanceof Blob
      ? element.blob
      : null;
  }

  /* =====================================================
     CACHE DE IMAGENS
     ===================================================== */

  function loadImage(blob) {

    if (!(blob instanceof Blob)) {
      return Promise.resolve(null);
    }

    const cached = imageCache.get(blob);

    if (cached) {
      return cached.promise;
    }

    const entry = {
      image: null,
      promise: null
    };

    entry.promise = new Promise((resolve, reject) => {

      const url = URL.createObjectURL(blob);
      const image = new Image();

      let completed = false;

      function finish(error = null) {

        if (completed) return;
        completed = true;

        URL.revokeObjectURL(url);

        if (error) {
          imageCache.delete(blob);
          reject(error);
        } else {
          entry.image = image;
          resolve(image);
        }

      }

      image.onload = () => finish();

      image.onerror = () => {
        finish(new Error("Falha ao carregar imagem da cena."));
      };

      image.src = url;

    });

    imageCache.set(blob, entry);

    return entry.promise;

  }

  function getLoadedImage(blob) {

    if (!(blob instanceof Blob)) {
      return null;
    }

    return imageCache.get(blob)?.image || null;

  }

  async function prepareScene(scene) {

    if (!scene || !Array.isArray(scene.elements)) {
      return;
    }

    const images = scene.elements
      .filter(element => element.type === "image")
      .map(getBlob)
      .filter(Boolean);

    await Promise.all(images.map(loadImage));

  }

  async function preparePresentation(presentation) {

    if (!presentation || !Array.isArray(presentation.scenes)) {
      return;
    }

    for (const scene of presentation.scenes) {
      await prepareScene(scene);
    }

  }

  const cacheSceneImages = prepareScene;
  const cachePresentationImages = preparePresentation;

  /* =====================================================
     FUNDO
     ===================================================== */

  function drawBackground(ctx, scene) {

    const background = scene.background || {};

    if (background.type !== "solid") {
      return;
    }

    ctx.save();

    ctx.fillStyle = normalizeColor(
      background.color,
      "#ffffff"
    );

    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.restore();

  }

  /* =====================================================
     TEXTO
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

        const candidate = line ? `${line} ${word}` : word;

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

  function drawText(ctx, element) {

    const width = Math.max(1, number(element.width, 300));
    const height = Math.max(1, number(element.height, 100));

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

    const alignment = element.align || "left";
    ctx.textAlign = alignment;

    const padding = Math.max(
      0,
      number(element.padding, 0)
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
    ctx.rect(0, 0, width, height);
    ctx.clip();

    for (let i = 0; i < lines.length; i++) {

      const y = padding + i * lineHeight;

      if (y >= height) break;

      ctx.fillText(lines[i], x, y);

    }

    ctx.restore();

  }

  /* =====================================================
     IMAGENS
     ===================================================== */

  function drawImage(ctx, element) {

    const blob = getBlob(element);

    if (!blob) return;

    const image = getLoadedImage(blob);

    if (!image) return;

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

    ctx.drawImage(
      image,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );

  }

  /* =====================================================
     FORMAS
     ===================================================== */

  function roundedRectangle(ctx, width, height, radius) {

    const r = clamp(radius, 0, Math.min(width, height) / 2);

    ctx.moveTo(r, 0);
    ctx.lineTo(width - r, 0);
    ctx.quadraticCurveTo(width, 0, width, r);
    ctx.lineTo(width, height - r);
    ctx.quadraticCurveTo(width, height, width - r, height);
    ctx.lineTo(r, height);
    ctx.quadraticCurveTo(0, height, 0, height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();

  }

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

      case "arrow": {

        const arrowHeight = height * 0.35;

        ctx.moveTo(0, height / 2 - arrowHeight / 2);
        ctx.lineTo(width * 0.65, height / 2 - arrowHeight / 2);
        ctx.lineTo(width * 0.65, 0);
        ctx.lineTo(width, height / 2);
        ctx.lineTo(width * 0.65, height);
        ctx.lineTo(
          width * 0.65,
          height / 2 + arrowHeight / 2
        );
        ctx.lineTo(0, height / 2 + arrowHeight / 2);
        ctx.closePath();

        break;
      }

      case "rounded":

        roundedRectangle(
          ctx,
          width,
          height,
          number(element.radius, 20)
        );

        break;

      case "rectangle":
      default:

        ctx.rect(0, 0, width, height);
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
      number(element.rotation, 0) * Math.PI / 180;

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
     RENDERIZAÇÃO PRINCIPAL
     ===================================================== */

  function renderScene(ctx, scene, options = {}) {

    if (!ctx || !ctx.canvas || !scene) {
      return false;
    }

    const canvas = ctx.canvas;

    ctx.save();

    try {

      if (options.clear === true) {

        ctx.save();

        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.restore();

      }

      const scaleX = canvas.width / BASE_WIDTH;
      const scaleY = canvas.height / BASE_HEIGHT;

      ctx.scale(scaleX, scaleY);

      drawBackground(ctx, scene);

      const elements = Array.isArray(scene.elements)
        ? scene.elements
        : [];

      for (const element of elements) {
        drawElement(ctx, element);
      }

      return true;

    } finally {

      ctx.restore();

    }

  }

  function renderPresentation(
    ctx,
    presentation,
    sceneIndex = 0,
    options = {}
  ) {

    if (!Array.isArray(presentation?.scenes)) {
      return false;
    }

    const scene = presentation.scenes[sceneIndex];

    if (!scene) return false;

    return renderScene(ctx, scene, options);

  }

  /* =====================================================
     RENDERIZAÇÃO EM CANVAS EXTERNO
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

    if (!ctx) {
      throw new Error("Contexto 2D indisponível.");
    }

    renderScene(ctx, scene, options);

    return canvas;

  }

  /* =====================================================
     MINIATURAS
     ===================================================== */

  async function createThumbnail(
    scene,
    width = 320,
    height = 180
  ) {

    await prepareScene(scene);

    const canvas = document.createElement("canvas");

    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas indisponível.");
    }

    renderScene(ctx, scene, { clear: true });

    return canvas.toDataURL("image/png");

  }

  /* =====================================================
     LIMPEZA DE CACHE

     WeakMap evita manter referências permanentes a Blobs.
     A limpeza explícita redefine o cache.
     ===================================================== */

  let cacheVersion = 0;

  function clearCache() {

    cacheVersion++;

    // O cache WeakMap não oferece clear().
    // As entradas serão liberadas quando seus Blobs
    // não tiverem mais referências.
    return cacheVersion;

  }

  /* =====================================================
     API PÚBLICA
     ===================================================== */

  window.ScenesRenderer = Object.freeze({

    BASE_WIDTH,
    BASE_HEIGHT,

    loadImage,
    getLoadedImage,

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
