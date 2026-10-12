
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — CENAS
   SCENES-RENDERER.JS

   ETAPA 9 — CORREÇÃO DE LEGIBILIDADE DOS TEXTOS

   - Preserva imagens e formas
   - Preserva transparência
   - Preserva navegação e compatibilidade com o Player
   - Melhora contraste de textos claros
   - Não modifica os dados das apresentações
   - Não altera o aplicativo principal
   ========================================================= */

(() => {

  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 720;
  const PORTRAIT_WIDTH = 720;
  const PORTRAIT_HEIGHT = 1280;

  let imageCache = new WeakMap();

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
      ? value.trim()
      : fallback;
  }

  function getBlob(element) {
    return element?.blob instanceof Blob
      ? element.blob
      : null;
  }

  /* =====================================================
     CONTRASTE DOS TEXTOS
     ===================================================== */

  function getRGB(color) {

    if (typeof color !== "string") {
      return null;
    }

    const value = color.trim();

    const shortHex = /^#([0-9a-f]{3,4})$/i.exec(value);

    if (shortHex) {
      const hex = shortHex[1];

      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16)
      };
    }

    const longHex = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);

    if (longHex) {
      const hex = longHex[1];

      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }

    const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);

    if (rgb) {
      return {
        r: clamp(Number(rgb[1]), 0, 255),
        g: clamp(Number(rgb[2]), 0, 255),
        b: clamp(Number(rgb[3]), 0, 255)
      };
    }

    return null;
  }

  function isLightColor(color) {

    const rgb = getRGB(color);

    if (!rgb) {
      return false;
    }

    const brightness =
      rgb.r * 0.299 +
      rgb.g * 0.587 +
      rgb.b * 0.114;

    return brightness >= 190;
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

  function drawBackground(ctx, scene, baseWidth = BASE_WIDTH, baseHeight = BASE_HEIGHT) {

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
      baseWidth,
      baseHeight
    );

    ctx.restore();
  }

  /* =====================================================
     QUEBRA DE LINHAS DO TEXTO
     ===================================================== */

  function wrapText(ctx, text, maxWidth) {

    const lines = [];
    const paragraphs = String(text ?? "").split("\n");

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
     DESENHO DO TEXTO
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

    const color = normalizeColor(
      element.color,
      "#ffffff"
    );

    ctx.save();

    ctx.font =
      `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

    ctx.fillStyle = color;
    ctx.textBaseline = "top";

    const alignment = ["left", "center", "right"]
      .includes(element.align)
        ? element.align
        : "left";

    ctx.textAlign = alignment;

    const padding = Math.max(
      0,
      number(element.padding, 0)
    );

    const availableWidth = Math.max(
      1,
      width - padding * 2
    );

    const transform = element.textTransform || "none";
    const originalText = String(element.text ?? "");
    const displayText = transform === "uppercase" ? originalText.toLocaleUpperCase("pt-BR")
      : transform === "lowercase" ? originalText.toLocaleLowerCase("pt-BR")
      : transform === "capitalize" ? originalText.replace(/\b\p{L}/gu, c => c.toLocaleUpperCase("pt-BR"))
      : originalText;
    const letterSpacing = clamp(number(element.letterSpacing, 0), -5, 30);
    const lines = wrapText(ctx, displayText, availableWidth);

    const lineHeight =
      fontSize * Math.max(
        0.5,
        number(element.lineHeight, 1.15)
      );

    let x = padding;

    if (alignment === "center") {
      x = width / 2;
    }

    if (alignment === "right") {
      x = width - padding;
    }

    /* ---------------------------------------------
       CONTRASTE

       Textos claros recebem contorno escuro fino.
       A cor original do texto permanece inalterada.
       --------------------------------------------- */

    const needsOutline = isLightColor(color);

    if (needsOutline) {

      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";

      ctx.lineWidth = clamp(
        fontSize * 0.055,
        1,
        5
      );

      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
    }

    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    for (let i = 0; i < lines.length; i++) {

      const y = padding + i * lineHeight;

      if (y >= height) {
        break;
      }

      const line = lines[i];

      if (!line) {
        continue;
      }

      if (needsOutline) {
        ctx.strokeText(line, x, y);
      }

      if (letterSpacing !== 0 && "letterSpacing" in ctx) {
        ctx.letterSpacing = `${letterSpacing}px`;
      }
      ctx.fillText(line, x, y);
      if (element.textDecoration === "underline") {
        const lineWidth = ctx.measureText(line).width;
        const left = alignment === "center" ? x - lineWidth / 2 : alignment === "right" ? x - lineWidth : x;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, fontSize / 18);
        ctx.beginPath();
        ctx.moveTo(left, y + fontSize * 1.03);
        ctx.lineTo(left + lineWidth, y + fontSize * 1.03);
        ctx.stroke();
        ctx.restore();
      }
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

    const r = clamp(
      radius,
      0,
      Math.min(width, height) / 2
    );

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

        ctx.moveTo(
          0,
          height / 2 - arrowHeight / 2
        );

        ctx.lineTo(
          width * 0.65,
          height / 2 - arrowHeight / 2
        );

        ctx.lineTo(width * 0.65, 0);
        ctx.lineTo(width, height / 2);
        ctx.lineTo(width * 0.65, height);

        ctx.lineTo(
          width * 0.65,
          height / 2 + arrowHeight / 2
        );

        ctx.lineTo(
          0,
          height / 2 + arrowHeight / 2
        );

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

      // Usa as dimensões lógicas informadas pelo Player.
      // Mantém o padrão horizontal para chamadas antigas.
      const baseWidth = options.aspectRatio === "9:16"
        ? PORTRAIT_WIDTH : BASE_WIDTH;
      const baseHeight = options.aspectRatio === "9:16"
        ? PORTRAIT_HEIGHT : BASE_HEIGHT;

      // Encaixe proporcional: evita deformar cenas verticais.
      const scale = Math.min(
        canvas.width / baseWidth,
        canvas.height / baseHeight
      );
      const offsetX = (canvas.width - baseWidth * scale) / 2;
      const offsetY = (canvas.height - baseHeight * scale) / 2;

      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      drawBackground(ctx, scene, baseWidth, baseHeight);

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

    return renderScene(ctx, scene, { ...options, aspectRatio: options.aspectRatio || presentation.aspectRatio });
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

    canvas.width = Math.max(
      1,
      Math.round(width)
    );

    canvas.height = Math.max(
      1,
      Math.round(height)
    );

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas indisponível.");
    }

    renderScene(ctx, scene, { clear: true });

    return canvas.toDataURL("image/png");
  }

  /* =====================================================
     LIMPEZA DE CACHE
     ===================================================== */

  function clearCache() {

    imageCache = new WeakMap();

    return true;
  }

  /* =====================================================
     API PÚBLICA
     ===================================================== */

  window.ScenesRenderer = Object.freeze({

    BASE_WIDTH,
    BASE_HEIGHT,
    PORTRAIT_WIDTH,
    PORTRAIT_HEIGHT,

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
