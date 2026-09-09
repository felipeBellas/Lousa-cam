"use strict";

/* =========================================================
   LOUSA CAM 2.0
   Base original + texto + colar + objetos
   ========================================================= */

const $ = id => document.getElementById(id);

const video = $("video");
const canvas = $("canvas");
const ctx = canvas.getContext("2d", { alpha: true });

const startOverlay = $("startOverlay");
const startBtn = $("startBtn");
const statusEl = $("status");
const recordBtn = $("record");

const menuBtn = $("menuBtn");
const menuPanel = $("menuPanel");

const settingsBtn = $("settings");
const toolsPanel = $("tools");

const textToolButton = $("textToolButton");
const canvasMenu = $("canvasMenu");
const pasteButton = $("pasteButton");

const inlineEditor = $("inlineEditor");
const objectCancel = $("objectCancel");

/* =========================================================
   ESTADO
   ========================================================= */

let facingMode = "user";
let stream = null;

let drawing = false;
let tool = "pen";
let color = "#fff";
let lineWidth = 5;

let strokes = [];
let redoStack = [];
let currentStroke = null;

let objects = [];
let selectedObjectId = null;
let editingObjectId = null;

let pointerStart = null;
let pointerMode = null;
let activePointerId = null;

let mediaRecorder = null;
let chunks = [];
let recording = false;

let renderCanvas = null;
let renderCtx = null;
let animationId = null;

let wakeLock = null;

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function toast(message, duration = 2200) {
  statusEl.textContent = message;
  statusEl.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    statusEl.classList.remove("show");
  }, duration);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeId(prefix = "obj") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

/* =========================================================
   CANVAS
   ========================================================= */

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);

  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  redraw();
  updateEditorPosition();
  updateCancelPosition();
}

function redraw() {
  ctx.clearRect(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );

  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }

  for (const object of objects) {
    drawObject(ctx, object);
  }

  if (
    selectedObjectId &&
    !editingObjectId
  ) {
    const selected = getObjectById(selectedObjectId);

    if (selected) {
      drawSelection(ctx, selected);
    }
  }
}

/* =========================================================
   DESENHO
   ========================================================= */

function drawStroke(c, stroke) {
  if (!stroke.points.length) {
    return;
  }

  c.save();

  c.lineCap = "round";
  c.lineJoin = "round";
  c.lineWidth = stroke.width;

  c.globalCompositeOperation =
    stroke.tool === "eraser"
      ? "destination-out"
      : "source-over";

  c.strokeStyle = stroke.color;

  c.beginPath();

  c.moveTo(
    stroke.points[0].x,
    stroke.points[0].y
  );

  for (let i = 1; i < stroke.points.length; i++) {
    c.lineTo(
      stroke.points[i].x,
      stroke.points[i].y
    );
  }

  if (stroke.points.length === 1) {
    c.lineTo(
      stroke.points[0].x + 0.01,
      stroke.points[0].y + 0.01
    );
  }

  c.stroke();
  c.restore();
}

/* =========================================================
   OBJETOS
   ========================================================= */

function getObjectById(id) {
  return objects.find(object => object.id === id) || null;
}

function drawObject(c, object) {
  if (object.type === "text") {
    drawTextObject(c, object);
    return;
  }

  if (object.type === "image") {
    drawImageObject(c, object);
  }
}

function drawTextObject(c, object) {
  c.save();

  c.font =
    `${object.fontSize}px Arial, sans-serif`;

  c.fillStyle = object.color || "#fff";

  c.textBaseline = "top";

  const lines = String(object.text || "").split("\n");

  const lineHeight =
    object.fontSize * 1.15;

  for (let i = 0; i < lines.length; i++) {
    c.fillText(
      lines[i],
      object.x + 6,
      object.y + 4 + i * lineHeight
    );
  }

  c.restore();
}

function drawImageObject(c, object) {
  if (!object.image) {
    return;
  }

  c.save();

  c.globalAlpha =
    object.opacity == null
      ? 1
      : object.opacity;

  c.drawImage(
    object.image,
    object.x,
    object.y,
    object.width,
    object.height
  );

  c.restore();
}

function drawSelection(c, object) {
  c.save();

  c.strokeStyle =
    "rgba(255,255,255,0.95)";

  c.lineWidth = 1.5;
  c.setLineDash([6, 4]);

  c.strokeRect(
    object.x,
    object.y,
    object.width,
    object.height
  );

  c.setLineDash([]);

  /*
    Pequeno indicador de redimensionamento.
  */
  c.fillStyle = "#fff";

  c.fillRect(
    object.x + object.width - 8,
    object.y + object.height - 8,
    8,
    8
  );

  c.restore();
}

/* =========================================================
   MEDIDAS DE TEXTO
   ========================================================= */

function measureTextObject(text, fontSize) {
  const lines = String(text || "Texto").split("\n");

  const measureCanvas =
    measureTextObject.canvas ||
    (measureTextObject.canvas =
      document.createElement("canvas"));

  const measureCtx =
    measureCanvas.getContext("2d");

  measureCtx.font =
    `${fontSize}px Arial, sans-serif`;

  let width = 60;

  for (const line of lines) {
    width = Math.max(
      width,
      measureCtx.measureText(line).width + 14
    );
  }

  const height = Math.max(
    34,
    lines.length * fontSize * 1.15 + 10
  );

  return {
    width,
    height
  };
}

/* =========================================================
   SELEÇÃO DE OBJETOS
   ========================================================= */

function objectContainsPoint(object, x, y) {
  return (
    x >= object.x &&
    x <= object.x + object.width &&
    y >= object.y &&
    y <= object.y + object.height
  );
}

function findObjectAt(x, y) {
  for (let i = objects.length - 1; i >= 0; i--) {
    if (
      objectContainsPoint(
        objects[i],
        x,
        y
      )
    ) {
      return objects[i];
    }
  }

  return null;
}

function isResizeHandle(object, x, y) {
  const size = 26;

  return (
    x >= object.x + object.width - size &&
    x <= object.x + object.width + 8 &&
    y >= object.y + object.height - size &&
    y <= object.y + object.height + 8
  );
}

/* =========================================================
   EDITOR INLINE
   ========================================================= */

function openInlineEditor(object) {
  if (!object || object.type !== "text") {
    return;
  }

  finishInlineTextEdit(false);

  editingObjectId = object.id;
  selectedObjectId = object.id;

  inlineEditor.textContent =
    object.text || "";

  inlineEditor.style.fontSize =
    `${object.fontSize}px`;

  inlineEditor.style.width =
    `${Math.max(object.width, 80)}px`;

  inlineEditor.style.height =
    `${Math.max(object.height, 36)}px`;

  inlineEditor.classList.add("show");

  updateEditorPosition();

  requestAnimationFrame(() => {
    inlineEditor.focus();

    try {
      const selection =
        window.getSelection();

      const range =
        document.createRange();

      range.selectNodeContents(
        inlineEditor
      );

      selection.removeAllRanges();
      selection.addRange(range);
    } catch (_) {}
  });

  redraw();
}

function updateEditorPosition() {
  if (!editingObjectId) {
    return;
  }

  const object =
    getObjectById(editingObjectId);

  if (!object) {
    return;
  }

  inlineEditor.style.left =
    `${object.x}px`;

  inlineEditor.style.top =
    `${object.y}px`;

  inlineEditor.style.width =
    `${Math.max(object.width, 60)}px`;

  inlineEditor.style.height =
    `${Math.max(object.height, 30)}px`;

  inlineEditor.style.fontSize =
    `${object.fontSize}px`;
}

function finishInlineTextEdit(redrawAfter = true) {
  if (!editingObjectId) {
    return;
  }

  const object =
    getObjectById(editingObjectId);

  if (object) {
    const text =
      inlineEditor.innerText
        .replace(/\r/g, "")
        .trimEnd();

    object.text =
      text || "Texto";

    const dimensions =
      measureTextObject(
        object.text,
        object.fontSize
      );

    object.width =
      Math.max(
        dimensions.width,
        inlineEditor.offsetWidth || 60
      );

    object.height =
      Math.max(
        dimensions.height,
        inlineEditor.offsetHeight || 30
      );
  }

  editingObjectId = null;

  inlineEditor.classList.remove("show");
  inlineEditor.textContent = "";

  if (redrawAfter) {
    redraw();
  }
}

inlineEditor.addEventListener(
  "input",
  () => {
    const object =
      getObjectById(editingObjectId);

    if (!object) {
      return;
    }

    const text =
      inlineEditor.innerText
        .replace(/\r/g, "");

    object.text = text;

    object.width =
      Math.max(
        60,
        inlineEditor.scrollWidth
      );

    object.height =
      Math.max(
        30,
        inlineEditor.scrollHeight
      );

    redraw();
  }
);

inlineEditor.addEventListener(
  "blur",
  () => {
    finishInlineTextEdit();
  }
);

/* =========================================================
   CANCELAR IMAGEM
   ========================================================= */

function updateCancelPosition() {
  if (!selectedObjectId) {
    objectCancel.classList.remove("show");
    return;
  }

  const object =
    getObjectById(selectedObjectId);

  if (!object || object.type !== "image") {
    objectCancel.classList.remove("show");
    return;
  }

  objectCancel.style.left =
    `${clamp(
      object.x + object.width - 84,
      8,
      window.innerWidth - 92
    )}px`;

  objectCancel.style.top =
    `${clamp(
      object.y - 48,
      8,
      window.innerHeight - 48
    )}px`;

  objectCancel.classList.add("show");
}

objectCancel.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    finishInlineTextEdit();

    selectedObjectId = null;

    objectCancel.classList.remove(
      "show"
    );

    redraw();
  }
);

/* =========================================================
   CRIAÇÃO DE TEXTO
   ========================================================= */

function createTextObject(x, y, text = "Texto") {
  const fontSize = 32;

  const dimensions =
    measureTextObject(
      text,
      fontSize
    );

  const object = {
    id: makeId("text"),
    type: "text",
    x: clamp(
      x,
      4,
      Math.max(
        4,
        window.innerWidth -
          dimensions.width -
          4
      )
    ),
    y: clamp(
      y,
      4,
      Math.max(
        4,
        window.innerHeight -
          dimensions.height -
          4
      )
    ),
    width: dimensions.width,
    height: dimensions.height,
    fontSize,
    color,
    text
  };

  objects.push(object);

  selectedObjectId = object.id;

  redraw();

  openInlineEditor(object);
}

/* =========================================================
   COLAGEM DE TEXTO
   ========================================================= */

async function pasteFromClipboard() {
  closeCanvasMenu();

  try {
    /*
      Primeiro tenta ler imagem e/ou texto
      pela Clipboard API.
    */
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.read ===
        "function"
    ) {
      const items =
        await navigator.clipboard.read();

      for (const item of items) {

        /*
          Imagem tem prioridade.
        */
        const imageType =
          item.types.find(type =>
            type.startsWith("image/")
          );

        if (imageType) {
          const blob =
            await item.getType(
              imageType
            );

          await insertImageBlob(
            blob,
            pastePosition.x,
            pastePosition.y
          );

          return;
        }

        const textType =
          item.types.find(type =>
            type === "text/plain"
          );

        if (textType) {
          const blob =
            await item.getType(
              textType
            );

          const text =
            await blob.text();

          if (text.trim()) {
            insertPastedText(
              text,
              pastePosition.x,
              pastePosition.y
            );

            return;
          }
        }
      }
    }

    /*
      Segunda tentativa: somente texto.
    */
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.readText ===
        "function"
    ) {
      const text =
        await navigator.clipboard.readText();

      if (text.trim()) {
        insertPastedText(
          text,
          pastePosition.x,
          pastePosition.y
        );

        return;
      }
    }

    /*
      Se a API não permitir leitura,
      o usuário pode usar Ctrl+V / Cmd+V.
    */
    toast(
      "Toque novamente em Colar ou use Colar do sistema.",
      3500
    );

  } catch (error) {
    console.error(
      "Clipboard:",
      error
    );

    toast(
      "O navegador bloqueou o acesso à área de transferência.",
      4000
    );
  }
}

let pastePosition = {
  x: 40,
  y: 120
};

function insertPastedText(
  text,
  x,
  y
) {
  const cleanText =
    String(text)
      .replace(/\r/g, "")
      .trim();

  if (!cleanText) {
    return;
  }

  createTextObject(
    x,
    y,
    cleanText
  );

  toast("Texto colado");
}

/* =========================================================
   COLAGEM DE IMAGEM
   ========================================================= */

function insertImageBlob(
  blob,
  x,
  y
) {
  return new Promise(
    resolve => {

      const url =
        URL.createObjectURL(blob);

      const image =
        new Image();

      image.onload = () => {

        let width =
          image.naturalWidth || 500;

        let height =
          image.naturalHeight || 300;

        /*
          Limita a imagem inicial para
          não ocupar a lousa inteira.
        */
        const maxWidth =
          window.innerWidth * 0.55;

        const maxHeight =
          window.innerHeight * 0.55;

        const scale =
          Math.min(
            1,
            maxWidth / width,
            maxHeight / height
          );

        width *= scale;
        height *= scale;

        const object = {
          id: makeId("image"),
          type: "image",
          x: clamp(
            x,
            4,
            Math.max(
              4,
              window.innerWidth -
                width -
                4
            )
          ),
          y: clamp(
            y,
            4,
            Math.max(
              4,
              window.innerHeight -
                height -
                4
            )
          ),
          width,
          height,
          image
        };

        objects.push(object);

        selectedObjectId =
          object.id;

        URL.revokeObjectURL(url);

        redraw();
        updateCancelPosition();

        toast("Imagem colada");

        resolve();
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);

        toast(
          "Não foi possível inserir a imagem.",
          3500
        );

        resolve();
      };

      image.src = url;
    }
  );
}

/* =========================================================
   PASTE EVENT NATIVO
   ========================================================= */

document.addEventListener(
  "paste",
  event => {

    /*
      Não interfere quando o usuário
      está editando texto.
    */
    if (
      document.activeElement ===
      inlineEditor
    ) {
      return;
    }

    const clipboard =
      event.clipboardData;

    if (!clipboard) {
      return;
    }

    const items =
      Array.from(
        clipboard.items || []
      );

    const imageItem =
      items.find(item =>
        item.type.startsWith("image/")
      );

    if (imageItem) {
      event.preventDefault();

      const blob =
        imageItem.getAsFile();

      if (blob) {
        insertImageBlob(
          blob,
          pastePosition.x,
          pastePosition.y
        );
      }

      closeCanvasMenu();

      return;
    }

    const text =
      clipboard.getData("text/plain");

    if (text) {
      event.preventDefault();

      insertPastedText(
        text,
        pastePosition.x,
        pastePosition.y
      );

      closeCanvasMenu();
    }
  }
);

/* =========================================================
   MENU COLAR
   ========================================================= */

function openCanvasMenu(x, y) {
  pastePosition = {
    x,
    y
  };

  canvasMenu.style.left =
    `${clamp(
      x,
      8,
      window.innerWidth - 100
    )}px`;

  canvasMenu.style.top =
    `${clamp(
      y,
      8,
      window.innerHeight - 52
    )}px`;

  canvasMenu.classList.add("open");
}

function closeCanvasMenu() {
  canvasMenu.classList.remove("open");
}

pasteButton.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    pasteFromClipboard();
  }
);

/* =========================================================
   DESENHO / INTERAÇÃO COM A LOUSA
   ========================================================= */

function beginDraw(event) {
  if (event.target !== canvas) {
    return;
  }

  event.preventDefault();

  /*
    Tocar na lousa fecha automaticamente
    o painel da caneta.
  */
  closePanels();

  const point =
    getPointerPosition(event);

  /*
    Primeiro verifica se há objeto.
  */
  const object =
    findObjectAt(
      point.x,
      point.y
    );

  if (object) {

    closeCanvasMenu();

    selectedObjectId =
      object.id;

    updateCancelPosition();

    /*
      Texto:
      toque diretamente nele para editar.
    */
    if (
      object.type === "text" &&
      !isResizeHandle(
        object,
        point.x,
        point.y
      )
    ) {
      openInlineEditor(object);
      return;
    }

    pointerStart = {
      x: point.x,
      y: point.y,
      objectX: object.x,
      objectY: object.y,
      objectWidth: object.width,
      objectHeight: object.height
    };

    pointerMode =
      isResizeHandle(
        object,
        point.x,
        point.y
      )
        ? "resize"
        : "move";

    activePointerId =
      event.pointerId;

    try {
      canvas.setPointerCapture(
        event.pointerId
      );
    } catch (_) {}

    redraw();

    return;
  }

  /*
    Toque vazio na lousa:
    abre SOMENTE Colar.
  */
  if (
    tool !== "pen" &&
    tool !== "eraser"
  ) {
    return;
  }

  /*
    Se o toque for curto, deixamos o menu
    aparecer somente no fim.
  */
  pointerStart = {
    x: point.x,
    y: point.y,
    time: Date.now()
  };

  pointerMode = "drawing";

  drawing = true;

  activePointerId =
    event.pointerId;

  try {
    canvas.setPointerCapture(
      event.pointerId
    );
  } catch (_) {}

  currentStroke = {
    tool,
    color,
    width: lineWidth,
    points: [point]
  };

  redoStack = [];

  drawStroke(
    ctx,
    currentStroke
  );
}

function moveDraw(event) {
  if (
    event.target !== canvas &&
    !drawing &&
    !pointerMode
  ) {
    return;
  }

  event.preventDefault();

  const point =
    getPointerPosition(event);

  /*
    Movimento de objeto.
  */
  if (
    selectedObjectId &&
    (
      pointerMode === "move" ||
      pointerMode === "resize"
    )
  ) {

    const object =
      getObjectById(
        selectedObjectId
      );

    if (!object || !pointerStart) {
      return;
    }

    const dx =
      point.x -
      pointerStart.x;

    const dy =
      point.y -
      pointerStart.y;

    if (
      pointerMode === "move"
    ) {
      object.x =
        clamp(
          pointerStart.objectX +
            dx,
          0,
          Math.max(
            0,
            window.innerWidth -
              object.width
          )
        );

      object.y =
        clamp(
          pointerStart.objectY +
            dy,
          0,
          Math.max(
            0,
            window.innerHeight -
              object.height
          )
        );
    }

    if (
      pointerMode === "resize"
    ) {
      object.width =
        clamp(
          pointerStart.objectWidth +
            dx,
          50,
          window.innerWidth -
            object.x -
            4
        );

      object.height =
        clamp(
          pointerStart.objectHeight +
            dy,
          30,
          window.innerHeight -
            object.y -
            4
        );

      if (
        object.type === "text"
      ) {
        object.fontSize =
          clamp(
            object.fontSize *
              (
                object.height /
                Math.max(
                  30,
                  pointerStart.objectHeight
                )
              ),
            12,
            120
          );
      }
    }

    updateCancelPosition();

    redraw();

    return;
  }

  /*
    Desenho.
  */
  if (
    drawing &&
    pointerMode === "drawing" &&
    currentStroke
  ) {
    const points =
      currentStroke.points;

    const last =
      points[
        points.length - 1
      ];

    const distance =
      Math.hypot(
        point.x - last.x,
        point.y - last.y
      );

    if (distance < 0.8) {
      return;
    }

    points.push(point);

    drawStroke(
      ctx,
      currentStroke
    );
  }
}

function endDraw(event) {
  const point =
    getPointerPosition(event);

  /*
    Finaliza movimentação/redimensionamento.
  */
  if (
    pointerMode === "move" ||
    pointerMode === "resize"
  ) {
    pointerMode = null;
    pointerStart = null;

    if (
      activePointerId != null &&
      canvas.releasePointerCapture
    ) {
      try {
        if (
          canvas.hasPointerCapture(
            activePointerId
          )
        ) {
          canvas.releasePointerCapture(
            activePointerId
          );
        }
      } catch (_) {}
    }

    activePointerId = null;

    updateCancelPosition();
    redraw();

    return;
  }

  /*
    Finaliza desenho.
  */
  if (
    drawing &&
    currentStroke
  ) {

    drawing = false;

    if (
      currentStroke.points.length
    ) {
      strokes.push(
        currentStroke
      );
    }

    currentStroke = null;
  }

  /*
    Clique/tap curto em local vazio:
    abre somente o menu Colar.
  */
  if (
    pointerMode === "drawing" &&
    pointerStart
  ) {
    const duration =
      Date.now() -
      pointerStart.time;

    const distance =
      Math.hypot(
        point.x -
          pointerStart.x,
        point.y -
          pointerStart.y
      );

    if (
      duration < 350 &&
      distance < 10
    ) {
      /*
        Não abrir menu quando acabou
        de desenhar um ponto.
      */
      if (
        tool === "pen" ||
        tool === "eraser"
      ) {
        openCanvasMenu(
          point.x,
          point.y
        );
      }
    }
  }

  pointerMode = null;
  pointerStart = null;

  if (
    activePointerId != null &&
    canvas.releasePointerCapture
  ) {
    try {
      if (
        canvas.hasPointerCapture(
          activePointerId
        )
      ) {
        canvas.releasePointerCapture(
          activePointerId
        );
      }
    } catch (_) {}
  }

  activePointerId = null;

  redraw();
}

canvas.addEventListener(
  "pointerdown",
  beginDraw,
  { passive: false }
);

canvas.addEventListener(
  "pointermove",
  moveDraw,
  { passive: false }
);

canvas.addEventListener(
  "pointerup",
  endDraw
);

canvas.addEventListener(
  "pointercancel",
  endDraw
);

canvas.addEventListener(
  "pointerleave",
  event => {
    if (
      event.pointerType === "mouse" &&
      drawing
    ) {
      endDraw(event);
    }
  }
);

/* =========================================================
   TEXTO
   ========================================================= */

textToolButton.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    closePanels();
    closeCanvasMenu();

    const x =
      Math.max(
        30,
        window.innerWidth / 2 - 80
      );

    const y =
      Math.max(
        100,
        window.innerHeight / 2 - 30
      );

    createTextObject(
      x,
      y,
      "Texto"
    );
  }
);

/* =========================================================
   CORES
   ========================================================= */

document
  .querySelectorAll(".color")
  .forEach(button => {

    button.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        color =
          button.dataset.color;

        tool = "pen";

        document
          .querySelectorAll(".color")
          .forEach(item => {
            item.classList.remove(
              "active"
            );
          });

        button.classList.add(
          "active"
        );

        $("toolName").textContent =
          "Caneta";

        $("eraser").style.outline =
          "";
      }
    );
  });

$("width").addEventListener(
  "input",
  event => {
    lineWidth =
      Number(event.target.value);
  }
);

$("eraser").addEventListener(
  "click",
  event => {

    event.stopPropagation();

    if (tool === "eraser") {

      tool = "pen";

      $("toolName").textContent =
        "Caneta";

      $("eraser").style.outline =
        "";

    } else {

      tool = "eraser";

      $("toolName").textContent =
        "Borracha";

      $("eraser").style.outline =
        "2px solid #fff";
    }
  }
);

/* =========================================================
   DESFAZER / REFAZER
   ========================================================= */

$("undo").addEventListener(
  "click",
  () => {

    finishInlineTextEdit();

    /*
      Primeiro desfaz objetos.
      Depois, traços.
    */
    if (objects.length) {
      const object =
        objects.pop();

      redoStack.push({
        type: "object",
        object
      });

      selectedObjectId = null;

      updateCancelPosition();
      redraw();

      return;
    }

    if (!strokes.length) {
      return;
    }

    redoStack.push({
      type: "stroke",
      stroke: strokes.pop()
    });

    redraw();
  }
);

$("redo").addEventListener(
  "click",
  () => {

    const item =
      redoStack.pop();

    if (!item) {
      return;
    }

    if (
      item.type === "stroke"
    ) {
      strokes.push(
        item.stroke
      );
    }

    if (
      item.type === "object"
    ) {
      objects.push(
        item.object
      );
    }

    redraw();
  }
);

/* =========================================================
   LIMPAR
   ========================================================= */

$("clear").addEventListener(
  "click",
  () => {

    finishInlineTextEdit(
      false
    );

    /*
      Sem confirm().
      Sem parar a câmera.
      Sem parar o stream.
    */
    strokes = [];
    objects = [];
    redoStack = [];

    selectedObjectId = null;

    closeCanvasMenu();
    closePanels();

    objectCancel.classList.remove(
      "show"
    );

    redraw();

    toast("Lousa limpa");
  }
);

/* =========================================================
   PAINÉIS ORIGINAIS
   ========================================================= */

function closePanels(except = null) {

  ["menuPanel", "tools"]
    .forEach(id => {

      if (id !== except) {

        const panel = $(id);

        panel.classList.remove(
          "open"
        );

        panel.setAttribute(
          "aria-hidden",
          "true"
        );
      }
    });
}

menuBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    const opening =
      !menuPanel.classList.contains(
        "open"
      );

    closePanels(
      opening
        ? "menuPanel"
        : null
    );

    if (opening) {

      menuPanel.classList.add(
        "open"
      );

      menuPanel.setAttribute(
        "aria-hidden",
        "false"
      );
    }
  }
);

settingsBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    const opening =
      !toolsPanel.classList.contains(
        "open"
      );

    closePanels(
      opening
        ? "tools"
        : null
    );

    if (opening) {

      toolsPanel.classList.add(
        "open"
      );

      toolsPanel.setAttribute(
        "aria-hidden",
        "false"
      );
    }
  }
);

/*
  Clique fora dos painéis.
*/
document.addEventListener(
  "pointerdown",
  event => {

    if (
      !event.target.closest(
        "#menuPanel"
      ) &&
      !event.target.closest(
        "#menuBtn"
      ) &&
      !event.target.closest(
        "#tools"
      ) &&
      !event.target.closest(
        "#settings"
      )
    ) {
      closePanels();
    }

    if (
      !event.target.closest(
        "#canvasMenu"
      ) &&
      !event.target.closest(
        "#canvas"
      )
    ) {
      closeCanvasMenu();
    }
  }
);

/* =========================================================
   CÂMERA
   ========================================================= */

async function startCamera() {

  if (
    !window.isSecureContext
  ) {
    toast(
      "Abra o Lousa Cam em HTTPS para usar a câmera.",
      6000
    );

    return false;
  }

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    toast(
      "Este navegador não oferece acesso à câmera.",
      5000
    );

    return false;
  }

  /*
    Não interrompe a câmera atual antes
    de conseguir a nova câmera.
  */
  let newStream = null;

  try {

    /*
      Primeira tentativa:
      câmera + microfone.
    */
    newStream =
      await navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: {
              ideal: facingMode
            },
            width: {
              ideal: 1920,
              max: 1920
            },
            height: {
              ideal: 1080,
              max: 1080
            },
            frameRate: {
              ideal: 30,
              max: 30
            }
          },

          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

  } catch (error) {

    console.warn(
      "Câmera + microfone falhou:",
      error
    );

    /*
      Segunda tentativa:
      somente câmera.

      Isso ajuda quando o Safari bloqueia
      o microfone, mas permite a câmera.
    */
    try {

      newStream =
        await navigator.mediaDevices
          .getUserMedia({
            video: {
              facingMode: {
                ideal: facingMode
              },
              width: {
                ideal: 1920,
                max: 1920
              },
              height: {
                ideal: 1080,
                max: 1080
              },
              frameRate: {
                ideal: 30,
                max: 30
              }
            },
            audio: false
          });

      toast(
        "Câmera ativada. Microfone indisponível.",
        3500
      );

    } catch (cameraError) {

      console.error(
        cameraError
      );

      let message =
        "Não foi possível iniciar a câmera.";

      if (
        cameraError.name ===
        "NotAllowedError"
      ) {
        message =
          "Permita o acesso à câmera no Safari.";
      } else if (
        cameraError.name ===
        "NotFoundError"
      ) {
        message =
          "Câmera não encontrada.";
      } else if (
        cameraError.name ===
        "NotReadableError"
      ) {
        message =
          "A câmera está sendo usada por outro aplicativo.";
      } else if (
        cameraError.name ===
        "SecurityError"
      ) {
        message =
          "O acesso à câmera foi bloqueado por segurança.";
      }

      toast(
        message,
        5000
      );

      return false;
    }
  }

  /*
    Só agora substitui o stream anterior.
  */
  if (stream) {
    stream
      .getTracks()
      .forEach(track =>
        track.stop()
      );
  }

  stream = newStream;

  video.srcObject = stream;

  video.classList.toggle(
    "mirror",
    facingMode === "user"
  );

  try {
    await video.play();
  } catch (error) {
    console.warn(
      "video.play():",
      error
    );
  }

  startOverlay.classList.add(
    "hidden"
  );

  await requestWakeLock();

  /*
    Mostra mensagem somente se ainda
    não tiver mostrado a mensagem de
    microfone indisponível.
  */
  if (
    stream.getAudioTracks().length
  ) {
    toast("Câmera ativada");
  }

  return true;
}

/* =========================================================
   TROCAR CÂMERA
   ========================================================= */

$("flip").addEventListener(
  "click",
  async () => {

    facingMode =
      facingMode === "user"
        ? "environment"
        : "user";

    await startCamera();
  }
);

/* =========================================================
   WAKE LOCK
   ========================================================= */

async function requestWakeLock() {

  try {

    if (
      "wakeLock" in navigator
    ) {

      wakeLock =
        await navigator.wakeLock
          .request("screen");

      wakeLock.addEventListener?.(
        "release",
        () => {
          wakeLock = null;
        }
      );
    }

  } catch (error) {

    console.log(
      "Wake Lock indisponível"
    );
  }
}

document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      document.visibilityState ===
        "visible" &&
      stream
    ) {
      await requestWakeLock();
    }
  }
);

/* =========================================================
   GRAVAÇÃO
   ========================================================= */

function getSupportedMimeType() {

  const formats = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];

  if (!window.MediaRecorder) {
    return "";
  }

  return (
    formats.find(type =>
      MediaRecorder.isTypeSupported(
        type
      )
    ) || ""
  );
}

function drawVideoCover(
  context,
  videoElement,
  width,
  height
) {

  const videoWidth =
    videoElement.videoWidth ||
    width;

  const videoHeight =
    videoElement.videoHeight ||
    height;

  const scale =
    Math.max(
      width / videoWidth,
      height / videoHeight
    );

  const drawWidth =
    videoWidth * scale;

  const drawHeight =
    videoHeight * scale;

  const x =
    (width - drawWidth) / 2;

  const y =
    (height - drawHeight) / 2;

  context.drawImage(
    videoElement,
    0,
    0,
    videoWidth,
    videoHeight,
    x,
    y,
    drawWidth,
    drawHeight
  );
}

function renderFrame() {

  if (
    !recording ||
    !renderCanvas ||
    !renderCtx
  ) {
    return;
  }

  const width =
    renderCanvas.width;

  const height =
    renderCanvas.height;

  renderCtx.clearRect(
    0,
    0,
    width,
    height
  );

  /*
    Vídeo.
  */
  renderCtx.save();

  if (
    facingMode === "user"
  ) {
    renderCtx.translate(
      width,
      0
    );

    renderCtx.scale(
      -1,
      1
    );
  }

  drawVideoCover(
    renderCtx,
    video,
    width,
    height
  );

  renderCtx.restore();

  /*
    Lousa.
  */
  renderCtx.save();

  renderCtx.scale(
    width /
      Math.max(
        1,
        window.innerWidth
      ),

    height /
      Math.max(
        1,
        window.innerHeight
      )
  );

  for (
    const stroke of strokes
  ) {
    drawStroke(
      renderCtx,
      stroke
    );
  }

  for (
    const object of objects
  ) {
    drawObject(
      renderCtx,
      object
    );
  }

  renderCtx.restore();

  animationId =
    requestAnimationFrame(
      renderFrame
    );
}

async function startRecording() {

  if (!stream) {

    toast(
      "Ative a câmera primeiro."
    );

    return;
  }

  if (
    !window.MediaRecorder ||
    !HTMLCanvasElement
      .prototype
      .captureStream
  ) {

    toast(
      "Seu navegador não suporta gravação integrada.",
      4000
    );

    return;
  }

  const mime =
    getSupportedMimeType();

  if (!mime) {

    toast(
      "Formato de vídeo não suportado neste navegador.",
      4000
    );

    return;
  }

  finishInlineTextEdit();

  chunks = [];

  renderCanvas =
    document.createElement(
      "canvas"
    );

  const width = 1920;

  const aspect =
    window.innerWidth /
    Math.max(
      1,
      window.innerHeight
    );

  renderCanvas.width =
    width;

  renderCanvas.height =
    Math.max(
      1,
      Math.round(
        width / aspect
      )
    );

  renderCtx =
    renderCanvas.getContext(
      "2d"
    );

  if (!renderCtx) {

    toast(
      "Não foi possível preparar a gravação.",
      4000
    );

    return;
  }

  recording = true;

  renderFrame();

  const outputStream =
    renderCanvas.captureStream(
      30
    );

  const audioTrack =
    stream.getAudioTracks()[0];

  if (audioTrack) {
    outputStream.addTrack(
      audioTrack
    );
  }

  try {

    mediaRecorder =
      new MediaRecorder(
        outputStream,
        {
          mimeType: mime,
          videoBitsPerSecond:
            6000000
        }
      );

  } catch (error) {

    console.error(error);

    recording = false;

    cancelAnimationFrame(
      animationId
    );

    toast(
      "Não foi possível iniciar a gravação.",
      4000
    );

    return;
  }

  mediaRecorder.ondataavailable =
    event => {

      if (
        event.data?.size
      ) {
        chunks.push(
          event.data
        );
      }
    };

  mediaRecorder.onerror =
    event => {

      console.error(event);

      toast(
        "Erro durante a gravação.",
        4000
      );
    };

  mediaRecorder.onstop =
    exportRecording;

  mediaRecorder.start(1000);

  recordBtn.classList.add(
    "recording"
  );

  toast(
    "Gravando…"
  );
}

function stopRecording() {

  if (!mediaRecorder) {
    return;
  }

  recording = false;

  cancelAnimationFrame(
    animationId
  );

  animationId = null;

  if (
    mediaRecorder.state !==
    "inactive"
  ) {
    mediaRecorder.stop();
  }

  recordBtn.classList.remove(
    "recording"
  );

  toast(
    "Processando vídeo…",
    3000
  );
}

async function exportRecording() {

  const type =
    mediaRecorder?.mimeType ||
    "video/mp4";

  const extension =
    type.includes("webm")
      ? "webm"
      : "mp4";

  const blob =
    new Blob(
      chunks,
      { type }
    );

  if (!blob.size) {

    toast(
      "A gravação ficou vazia.",
      4000
    );

    cleanupRecording();

    return;
  }

  const filename =
    `lousa-cam-${new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      )}.${extension}`;

  const file =
    new File(
      [blob],
      filename,
      { type }
    );

  if (
    navigator.canShare &&
    navigator.canShare({
      files: [file]
    })
  ) {

    try {

      await navigator.share({
        files: [file],
        title: "Lousa Cam",
        text:
          "Vídeo gravado no Lousa Cam"
      });

      toast(
        "Vídeo compartilhado."
      );

      cleanupRecording();

      return;

    } catch (error) {

      if (
        error.name ===
        "AbortError"
      ) {

        toast(
          "Compartilhamento cancelado."
        );

        cleanupRecording();

        return;
      }
    }
  }

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;
  link.download = filename;
  link.rel = "noopener";

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    15000
  );

  toast(
    `Vídeo salvo como ${extension.toUpperCase()}.`,
    3500
  );

  cleanupRecording();
}

function cleanupRecording() {

  if (renderCanvas) {

    renderCanvas.width = 1;
    renderCanvas.height = 1;
  }

  renderCanvas = null;
  renderCtx = null;
  mediaRecorder = null;
  chunks = [];
}

/* =========================================================
   BOTÃO GRAVAR
   ========================================================= */

recordBtn.addEventListener(
  "click",
  () => {

    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }
);

/* =========================================================
   BOTÃO INICIAL
   ========================================================= */

startBtn.addEventListener(
  "click",
  async () => {
    await startCamera();
  }
);

/* =========================================================
   RESIZE
   ========================================================= */

window.addEventListener(
  "resize",
  () => {
    fitCanvas();
  }
);

window.addEventListener(
  "orientationchange",
  () => {
    setTimeout(
      fitCanvas,
      300
    );
  }
);

/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./sw.js")
        .catch(
          console.error
        );
    }
  );
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

fitCanvas();
