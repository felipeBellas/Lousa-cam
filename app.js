"use strict";

/*
===============================================================
LOUSA CAM
Versão: 20260910-01

Recursos:
- Câmera
- Microfone
- Desenho
- Caneta
- Borracha
- Desfazer/refazer
- Texto
- Imagem
- Colar texto
- Colar imagem
- Mover objetos
- Redimensionar objetos
- Gravação
- Compatibilidade Safari/PWA
===============================================================
*/

const BUILD_VERSION = "20260910-01";

console.log("Lousa Cam:", BUILD_VERSION);


/* ============================================================
   ELEMENTOS
   ============================================================ */

const $ = id => document.getElementById(id);

const video = $("video");
const canvas = $("canvas");
const ctx = canvas.getContext("2d", {
  alpha: true
});

const startOverlay = $("startOverlay");
const startBtn = $("startBtn");
const statusEl = $("status");

const recordBtn = $("record");

const menuBtn = $("menuBtn");
const undoBtn = $("undo");
const redoBtn = $("redo");
const clearBtn = $("clear");

const flipBtn = $("flip");
const settingsBtn = $("settings");

const textToolButton = $("textToolButton");

const toolsPanel = $("tools");
const colorInput = $("color");
const widthInput = $("width");
const eraserBtn = $("eraser");
const toolName = $("toolName");

const canvasMenu = $("canvasMenu");

const imageInput = $("imageInput");

const pasteOverlay = $("pasteOverlay");
const pasteArea = $("pasteArea");
const pasteCancel = $("pasteCancel");


/* ============================================================
   ESTADO
   ============================================================ */

let facingMode = "user";

let stream = null;

let drawing = false;

let tool = "pen";

let color = "#ffffff";

let lineWidth = 5;

let strokes = [];

let boardObjects = [];

let undoStack = [];

let redoStack = [];

let currentStroke = null;

let selectedObject = null;

let draggingObject = false;

let resizingObject = false;

let objectDragOffset = null;

let objectResizeStart = null;

let pointerStart = null;

let pointerMoved = false;

let pointerDownTime = 0;

let pendingObjectPosition = null;

let pendingPastePosition = null;

let mediaRecorder = null;

let chunks = [];

let recording = false;

let renderCanvas = null;

let renderCtx = null;

let animationId = null;

let wakeLock = null;


/* ============================================================
   CONFIGURAÇÕES DE TOQUE
   ============================================================ */

const TAP_MAX_TIME = 350;

const TAP_MAX_DISTANCE = 12;


/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


function distance(x1, y1, x2, y2) {
  return Math.sqrt(
    Math.pow(x2 - x1, 2) +
    Math.pow(y2 - y1, 2)
  );
}


function getCanvasPoint(event) {

  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}


function setStatus(message) {

  if (statusEl) {
    statusEl.textContent = message || "";
  }

  console.log(message);
}


/* ============================================================
   CANVAS
   ============================================================ */

function fitCanvas() {

  const rect = canvas.getBoundingClientRect();

  const dpr = Math.max(
    1,
    Math.min(window.devicePixelRatio || 1, 3)
  );

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  redrawCanvas();
}


function getCanvasSize() {

  const rect = canvas.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height
  };
}


/* ============================================================
   DESENHO
   ============================================================ */

function drawStroke(targetCtx, stroke, scale = 1) {

  if (!stroke || !stroke.points || !stroke.points.length) {
    return;
  }

  targetCtx.save();

  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";

  targetCtx.lineWidth = stroke.width * scale;

  if (stroke.tool === "eraser") {

    targetCtx.globalCompositeOperation =
      "destination-out";

    targetCtx.strokeStyle = "rgba(0,0,0,1)";

  } else {

    targetCtx.globalCompositeOperation =
      "source-over";

    targetCtx.strokeStyle = stroke.color;
  }

  targetCtx.beginPath();

  const first = stroke.points[0];

  targetCtx.moveTo(
    first.x * scale,
    first.y * scale
  );

  for (let i = 1; i < stroke.points.length; i++) {

    const point = stroke.points[i];

    targetCtx.lineTo(
      point.x * scale,
      point.y * scale
    );
  }

  targetCtx.stroke();

  targetCtx.restore();
}


/* ============================================================
   TEXTO
   ============================================================ */

function drawTextObject(targetCtx, object, scale = 1) {

  if (!object || !object.text) {
    return;
  }

  targetCtx.save();

  targetCtx.globalCompositeOperation =
    "source-over";

  targetCtx.fillStyle =
    object.color || "#ffffff";

  targetCtx.font =
    `${object.fontSize * scale}px Arial, Helvetica, sans-serif`;

  targetCtx.textBaseline = "top";

  const maxWidth =
    object.width * scale;

  const words =
    object.text.split(/\s+/);

  const lines = [];

  let line = "";

  for (const word of words) {

    const test =
      line ? `${line} ${word}` : word;

    const width =
      targetCtx.measureText(test).width;

    if (
      width > maxWidth &&
      line
    ) {

      lines.push(line);

      line = word;

    } else {

      line = test;
    }
  }

  if (line) {
    lines.push(line);
  }

  const lineHeight =
    object.fontSize * 1.25 * scale;

  lines.forEach((text, index) => {

    targetCtx.fillText(
      text,
      object.x * scale,
      object.y * scale + index * lineHeight
    );
  });

  targetCtx.restore();
}


/* ============================================================
   IMAGEM
   ============================================================ */

function drawImageObject(targetCtx, object, scale = 1) {

  if (
    !object ||
    !object.image ||
    !object.image.complete
  ) {
    return;
  }

  targetCtx.save();

  targetCtx.globalCompositeOperation =
    "source-over";

  targetCtx.drawImage(
    object.image,
    object.x * scale,
    object.y * scale,
    object.width * scale,
    object.height * scale
  );

  targetCtx.restore();
}


/* ============================================================
   OBJETO
   ============================================================ */

function drawObject(
  targetCtx,
  object,
  scale = 1,
  showSelection = false
) {

  if (object.type === "text") {

    drawTextObject(
      targetCtx,
      object,
      scale
    );

  } else if (object.type === "image") {

    drawImageObject(
      targetCtx,
      object,
      scale
    );
  }

  if (
    showSelection &&
    selectedObject === object
  ) {

    drawSelection(
      targetCtx,
      object,
      scale
    );
  }
}


/* ============================================================
   SELEÇÃO
   ============================================================ */

function drawSelection(
  targetCtx,
  object,
  scale = 1
) {

  targetCtx.save();

  targetCtx.strokeStyle =
    "#ffffff";

  targetCtx.lineWidth =
    2 * scale;

  targetCtx.setLineDash([
    7 * scale,
    5 * scale
  ]);

  targetCtx.strokeRect(
    object.x * scale,
    object.y * scale,
    object.width * scale,
    object.height * scale
  );

  targetCtx.setLineDash([]);

  const handleSize =
    12 * scale;

  targetCtx.fillStyle =
    "#ffffff";

  targetCtx.fillRect(
    (object.x + object.width - 6) * scale,
    (object.y + object.height - 6) * scale,
    handleSize,
    handleSize
  );

  targetCtx.restore();
}


/* ============================================================
   REDESENHAR
   ============================================================ */

function redrawCanvas() {

  const size = getCanvasSize();

  ctx.clearRect(
    0,
    0,
    size.width,
    size.height
  );

  for (const stroke of strokes) {

    drawStroke(
      ctx,
      stroke
    );
  }

  for (const object of boardObjects) {

    drawObject(
      ctx,
      object,
      1,
      true
    );
  }
}


/* ============================================================
   HISTÓRICO
   ============================================================ */

function registerAction(action) {

  undoStack.push(action);

  redoStack = [];
}


function undo() {

  if (!undoStack.length) {
    return;
  }

  const action =
    undoStack.pop();

  if (action.type === "stroke") {

    const index =
      strokes.indexOf(action.item);

    if (index !== -1) {
      strokes.splice(index, 1);
    }

  } else if (action.type === "object") {

    const index =
      boardObjects.indexOf(action.item);

    if (index !== -1) {
      boardObjects.splice(index, 1);
    }
  }

  if (selectedObject === action.item) {
    selectedObject = null;
  }

  redoStack.push(action);

  redrawCanvas();
}


function redo() {

  if (!redoStack.length) {
    return;
  }

  const action =
    redoStack.pop();

  if (action.type === "stroke") {

    strokes.push(action.item);

  } else if (action.type === "object") {

    boardObjects.push(action.item);
  }

  undoStack.push(action);

  redrawCanvas();
}


/* ============================================================
   BORRACHA
   ============================================================ */

function setPen() {

  tool = "pen";

  toolName.textContent =
    "Caneta";

  eraserBtn.style.background =
    "rgba(20,20,20,.78)";
}


function setEraser() {

  tool = "eraser";

  toolName.textContent =
    "Borracha";

  eraserBtn.style.background =
    "rgba(255,255,255,.2)";
}


/* ============================================================
   MENU DE FERRAMENTAS
   ============================================================ */

function toggleTools() {

  toolsPanel.classList.toggle("show");
}


/* ============================================================
   MENU DO CANVAS
   ============================================================ */

function positionCanvasMenu(x, y) {

  canvasMenu.classList.add("show");

  const menuWidth =
    canvasMenu.offsetWidth;

  const menuHeight =
    canvasMenu.offsetHeight;

  const margin = 8;

  let left = x;

  let top = y;

  if (
    left + menuWidth >
    window.innerWidth - margin
  ) {

    left =
      window.innerWidth -
      menuWidth -
      margin;
  }

  if (
    top + menuHeight >
    window.innerHeight - margin
  ) {

    top =
      window.innerHeight -
      menuHeight -
      margin;
  }

  left =
    Math.max(margin, left);

  top =
    Math.max(margin, top);

  canvasMenu.style.left =
    `${left}px`;

  canvasMenu.style.top =
    `${top}px`;
}


function openCanvasMenu(x, y) {

  pendingObjectPosition = {
    x,
    y
  };

  positionCanvasMenu(
    x,
    y
  );
}


function closeCanvasMenu() {

  canvasMenu.classList.remove("show");
}


/* ============================================================
   CRIAR TEXTO
   ============================================================ */

function createTextObject(x, y) {

  const text =
    window.prompt(
      "Digite o texto:"
    );

  if (
    text === null ||
    !text.trim()
  ) {
    return;
  }

  const size =
    getCanvasSize();

  const object = {

    id:
      `text-${Date.now()}-${Math.random()}`,

    type:
      "text",

    text:
      text.trim(),

    x:
      clamp(
        x,
        10,
        Math.max(10, size.width - 310)
      ),

    y:
      clamp(
        y,
        10,
        Math.max(10, size.height - 100)
      ),

    width:
      Math.min(
        300,
        Math.max(150, size.width - 20)
      ),

    height:
      100,

    fontSize:
      32,

    color:
      color
  };

  boardObjects.push(
    object
  );

  selectedObject =
    object;

  registerAction({
    type: "object",
    item: object
  });

  redrawCanvas();
}


/* ============================================================
   EDITAR TEXTO
   ============================================================ */

function editTextObject(object) {

  const newText =
    window.prompt(
      "Editar texto:",
      object.text
    );

  if (
    newText === null ||
    !newText.trim()
  ) {
    return;
  }

  object.text =
    newText.trim();

  redrawCanvas();
}


/* ============================================================
   CRIAR IMAGEM A PARTIR DE BLOB
   ============================================================ */

function createImageObjectFromBlob(
  blob,
  x,
  y
) {

  if (!blob) {
    return;
  }

  const url =
    URL.createObjectURL(blob);

  const image =
    new Image();

  image.onload = () => {

    const maxWidth =
      Math.min(
        400,
        getCanvasSize().width - 20
      );

    const ratio =
      image.naturalHeight /
      image.naturalWidth;

    const width =
      Math.min(
        maxWidth,
        image.naturalWidth || maxWidth
      );

    const height =
      width * ratio;

    const object = {

      id:
        `image-${Date.now()}-${Math.random()}`,

      type:
        "image",

      image:
        image,

      src:
        url,

      x:
        clamp(
          x,
          10,
          Math.max(10, getCanvasSize().width - width - 10)
        ),

      y:
        clamp(
          y,
          10,
          Math.max(10, getCanvasSize().height - height - 10)
        ),

      width:
        width,

      height:
        height
    };

    boardObjects.push(
      object
    );

    selectedObject =
      object;

    registerAction({
      type: "object",
      item: object
    });

    redrawCanvas();
  };

  image.onerror = () => {

    URL.revokeObjectURL(url);

    setStatus(
      "Não foi possível carregar a imagem."
    );
  };

  image.src =
    url;
}


/* ============================================================
   SELECIONAR IMAGEM DO DISPOSITIVO
   ============================================================ */

function openImagePicker() {

  imageInput.value = "";

  imageInput.click();
}


imageInput.addEventListener(
  "change",
  event => {

    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) {
      return;
    }

    const position =
      pendingObjectPosition || {
        x: 50,
        y: 50
      };

    createImageObjectFromBlob(
      file,
      position.x,
      position.y
    );
  }
);


/* ============================================================
   CLIPBOARD
   ============================================================ */

async function tryClipboardAPI(
  x,
  y
) {

  if (
    !navigator.clipboard ||
    !navigator.clipboard.read
  ) {

    return false;
  }

  try {

    const items =
      await navigator.clipboard.read();

    for (const item of items) {

      /* IMAGEM */

      const imageType =
        item.types.find(type =>
          type.startsWith("image/")
        );

      if (imageType) {

        const blob =
          await item.getType(imageType);

        createImageObjectFromBlob(
          blob,
          x,
          y
        );

        return true;
      }

      /* TEXTO */

      const textType =
        item.types.find(type =>
          type === "text/plain"
        );

      if (textType) {

        const blob =
          await item.getType(textType);

        const text =
          await blob.text();

        if (text.trim()) {

          createTextFromClipboard(
            text,
            x,
            y
          );

          return true;
        }
      }
    }

  } catch (error) {

    console.log(
      "Clipboard API indisponível:",
      error
    );
  }

  return false;
}


async function tryClipboardTextAPI(
  x,
  y
) {

  if (
    !navigator.clipboard ||
    !navigator.clipboard.readText
  ) {

    return false;
  }

  try {

    const text =
      await navigator.clipboard.readText();

    if (text && text.trim()) {

      createTextFromClipboard(
        text,
        x,
        y
      );

      return true;
    }

  } catch (error) {

    console.log(
      "readText indisponível:",
      error
    );
  }

  return false;
}


function createTextFromClipboard(
  text,
  x,
  y
) {

  const size =
    getCanvasSize();

  const object = {

    id:
      `text-${Date.now()}-${Math.random()}`,

    type:
      "text",

    text:
      text.trim(),

    x:
      clamp(
        x,
        10,
        Math.max(10, size.width - 310)
      ),

    y:
      clamp(
        y,
        10,
        Math.max(10, size.height - 100)
      ),

    width:
      Math.min(
        320,
        Math.max(150, size.width - 20)
      ),

    height:
      100,

    fontSize:
      28,

    color:
      color
  };

  boardObjects.push(
    object
  );

  selectedObject =
    object;

  registerAction({
    type: "object",
    item: object
  });

  redrawCanvas();
}


/* ============================================================
   MODO COLAR - SAFARI
   ============================================================ */

async function openPasteMode() {

  const position =
    pendingObjectPosition || {
      x: 50,
      y: 50
    };

  pendingPastePosition =
    position;

  closeCanvasMenu();

  pasteArea.innerHTML = "";

  pasteOverlay.classList.add(
    "show"
  );

  setTimeout(() => {

    pasteArea.focus();

  }, 100);

  /*
   Primeiro tentamos a API moderna.
   Se o Safari não permitir, mantemos
   a área editável para o comando nativo
   "Colar".
  */

  const pasted =
    await tryClipboardAPI(
      position.x,
      position.y
    );

  if (pasted) {

    closePasteMode();

    return;
  }

  const textPasted =
    await tryClipboardTextAPI(
      position.x,
      position.y
    );

  if (textPasted) {

    closePasteMode();

    return;
  }
}


/* ============================================================
   PASTE EVENT
   ============================================================ */

pasteArea.addEventListener(
  "paste",
  event => {

    event.preventDefault();

    const clipboard =
      event.clipboardData;

    if (!clipboard) {
      return;
    }

    const position =
      pendingPastePosition || {
        x: 50,
        y: 50
      };

    /*
     IMAGEM
    */

    const items =
      clipboard.items || [];

    for (const item of items) {

      if (
        item.kind === "file" &&
        item.type.startsWith("image/")
      ) {

        const file =
          item.getAsFile();

        if (file) {

          createImageObjectFromBlob(
            file,
            position.x,
            position.y
          );

          closePasteMode();

          return;
        }
      }
    }

    /*
     TEXTO
    */

    const text =
      clipboard.getData(
        "text/plain"
      );

    if (
      text &&
      text.trim()
    ) {

      createTextFromClipboard(
        text,
        position.x,
        position.y
      );

      closePasteMode();
    }
  }
);


/* ============================================================
   PASTE EVENT GLOBAL
   ============================================================ */

document.addEventListener(
  "paste",
  event => {

    if (
      !pasteOverlay.classList.contains(
        "show"
      )
    ) {
      return;
    }

    if (
      event.target === pasteArea
    ) {
      return;
    }

    event.preventDefault();

    const clipboard =
      event.clipboardData;

    if (!clipboard) {
      return;
    }

    const position =
      pendingPastePosition || {
        x: 50,
        y: 50
      };

    const items =
      clipboard.items || [];

    for (const item of items) {

      if (
        item.kind === "file" &&
        item.type.startsWith("image/")
      ) {

        const file =
          item.getAsFile();

        if (file) {

          createImageObjectFromBlob(
            file,
            position.x,
            position.y
          );

          closePasteMode();

          return;
        }
      }
    }

    const text =
      clipboard.getData(
        "text/plain"
      );

    if (
      text &&
      text.trim()
    ) {

      createTextFromClipboard(
        text,
        position.x,
        position.y
      );

      closePasteMode();
    }
  }
);


/* ============================================================
   FECHAR MODO COLAR
   ============================================================ */

function closePasteMode() {

  pasteOverlay.classList.remove(
    "show"
  );

  pasteArea.innerHTML = "";

  pendingPastePosition =
    null;
}


pasteCancel.addEventListener(
  "click",
  closePasteMode
);


/* ============================================================
   OBJETO SOB O PONTEIRO
   ============================================================ */

function getObjectAtPoint(
  x,
  y
) {

  for (
    let i = boardObjects.length - 1;
    i >= 0;
    i--
  ) {

    const object =
      boardObjects[i];

    if (
      x >= object.x &&
      x <= object.x + object.width &&
      y >= object.y &&
      y <= object.y + object.height
    ) {

      return object;
    }
  }

  return null;
}


function isResizeHandle(
  object,
  x,
  y
) {

  const handle =
    22;

  return (
    x >= object.x +
      object.width -
      handle &&

    y >= object.y +
      object.height -
      handle
  );
}


/* ============================================================
   INTERAÇÃO COM CANVAS
   ============================================================ */

function initializeCanvasInteraction() {

  canvas.addEventListener(
    "pointerdown",
    event => {

      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      const point =
        getCanvasPoint(event);

      pointerStart =
        point;

      pointerMoved =
        false;

      pointerDownTime =
        Date.now();

      /*
       OBJETO
      */

      const object =
        getObjectAtPoint(
          point.x,
          point.y
        );

      if (object) {

        selectedObject =
          object;

        if (
          isResizeHandle(
            object,
            point.x,
            point.y
          )
        ) {

          resizingObject =
            true;

          objectResizeStart = {

            x:
              point.x,

            y:
              point.y,

            width:
              object.width,

            height:
              object.height
          };

        } else {

          draggingObject =
            true;

          objectDragOffset = {

            x:
              point.x - object.x,

            y:
              point.y - object.y
          };
        }

        canvas.setPointerCapture(
          event.pointerId
        );

        redrawCanvas();

        return;
      }

      /*
       DESENHO
      */

      drawing =
        false;

      currentStroke =
        null;

      canvas.setPointerCapture(
        event.pointerId
      );
    }
  );


  canvas.addEventListener(
    "pointermove",
    event => {

      const point =
        getCanvasPoint(event);

      if (
        pointerStart
      ) {

        const moved =
          distance(
            pointerStart.x,
            pointerStart.y,
            point.x,
            point.y
          );

        if (
          moved >
          TAP_MAX_DISTANCE
        ) {

          pointerMoved =
            true;
        }
      }


      /*
       REDIMENSIONAR
      */

      if (
        resizingObject &&
        selectedObject &&
        objectResizeStart
      ) {

        const start =
          objectResizeStart;

        const dx =
          point.x - start.x;

        const dy =
          point.y - start.y;

        let newWidth =
          start.width + dx;

        let newHeight =
          start.height + dy;

        newWidth =
          Math.max(
            50,
            newWidth
          );

        newHeight =
          Math.max(
            40,
            newHeight
          );

        const size =
          getCanvasSize();

        newWidth =
          Math.min(
            newWidth,
            size.width -
              selectedObject.x -
              5
          );

        newHeight =
          Math.min(
            newHeight,
            size.height -
              selectedObject.y -
              5
          );

        /*
         Mantém proporção da imagem
        */

        if (
          selectedObject.type ===
          "image"
        ) {

          const ratio =
            start.width /
            start.height;

          if (
            Math.abs(dx) >
            Math.abs(dy)
          ) {

            newHeight =
              newWidth / ratio;

          } else {

            newWidth =
              newHeight * ratio;
          }
        }

        selectedObject.width =
          Math.max(
            50,
            newWidth
          );

        selectedObject.height =
          Math.max(
            40,
            newHeight
          );

        redrawCanvas();

        return;
      }


      /*
       MOVER OBJETO
      */

      if (
        draggingObject &&
        selectedObject &&
        objectDragOffset
      ) {

        const size =
          getCanvasSize();

        selectedObject.x =
          clamp(
            point.x -
              objectDragOffset.x,
            0,
            Math.max(
              0,
              size.width -
                selectedObject.width
            )
          );

        selectedObject.y =
          clamp(
            point.y -
              objectDragOffset.y,
            0,
            Math.max(
              0,
              size.height -
                selectedObject.height
            )
          );

        redrawCanvas();

        return;
      }


      /*
       DESENHO
      */

      if (
        pointerStart &&
        !selectedObject
      ) {

        if (
          !drawing &&
          pointerMoved
        ) {

          drawing =
            true;

          currentStroke = {

            points: [
              {
                x:
                  pointerStart.x,

                y:
                  pointerStart.y
              }
            ],

            color:
              color,

            width:
              lineWidth,

            tool:
              tool
          };

          strokes.push(
            currentStroke
          );
        }

        if (
          drawing &&
          currentStroke
        ) {

          currentStroke.points.push({
            x:
              point.x,

            y:
              point.y
          });

          redrawCanvas();
        }
      }
    }
  );


  canvas.addEventListener(
    "pointerup",
    event => {

      const point =
        getCanvasPoint(event);

      const duration =
        Date.now() -
        pointerDownTime;


      /*
       OBJETO
      */

      if (
        draggingObject ||
        resizingObject
      ) {

        draggingObject =
          false;

        resizingObject =
          false;

        objectDragOffset =
          null;

        objectResizeStart =
          null;

        pointerStart =
          null;

        return;
      }


      /*
       DESENHO
      */

      if (
        drawing &&
        currentStroke
      ) {

        /*
         Se houver somente um ponto,
         não registra como ação.
        */

        if (
          currentStroke.points.length >
          1
        ) {

          registerAction({
            type:
              "stroke",

            item:
              currentStroke
          });

        } else {

          const index =
            strokes.indexOf(
              currentStroke
            );

          if (index !== -1) {
            strokes.splice(
              index,
              1
            );
          }
        }

        drawing =
          false;

        currentStroke =
          null;

        selectedObject =
          null;

        redrawCanvas();

        pointerStart =
          null;

        return;
      }


      /*
       TOQUE SIMPLES
       */

      if (
        !pointerMoved &&
        duration <= TAP_MAX_TIME
      ) {

        selectedObject =
          null;

        redrawCanvas();

        openCanvasMenu(
          point.x,
          point.y
        );
      }

      pointerStart =
        null;

      pointerMoved =
        false;
    }
  );


  canvas.addEventListener(
    "pointercancel",
    () => {

      drawing =
        false;

      draggingObject =
        false;

      resizingObject =
        false;

      currentStroke =
        null;

      pointerStart =
        null;

      redrawCanvas();
    }
  );


  /*
   Duplo clique no texto para editar
  */

  canvas.addEventListener(
    "dblclick",
    event => {

      const point =
        getCanvasPoint(event);

      const object =
        getObjectAtPoint(
          point.x,
          point.y
        );

      if (
        object &&
        object.type ===
        "text"
      ) {

        editTextObject(
          object
        );
      }
    }
  );
}


/* ============================================================
   MENU - TEXTO / IMAGEM / COLAR
   ============================================================ */

canvasMenu.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "button"
      );

    if (!button) {
      return;
    }

    const action =
      button.dataset.action;

    const position =
      pendingObjectPosition || {
        x: 50,
        y: 50
      };

    if (
      action ===
      "text"
    ) {

      closeCanvasMenu();

      createTextObject(
        position.x,
        position.y
      );

    } else if (
      action ===
      "image"
    ) {

      closeCanvasMenu();

      openImagePicker();

    } else if (
      action ===
      "paste"
    ) {

      openPasteMode();

    } else if (
      action ===
      "cancel"
    ) {

      closeCanvasMenu();
    }
  }
);


/* ============================================================
   BOTÃO T
   ============================================================ */

textToolButton.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    const size =
      getCanvasSize();

    createTextObject(
      size.width / 2 - 140,
      size.height / 2 - 50
    );
  }
);


/* ============================================================
   MENU SUPERIOR
   ============================================================ */

menuBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    toggleTools();
  }
);


settingsBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    toggleTools();
  }
);


undoBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    undo();
  }
);


redoBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    redo();
  }
);


clearBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    const confirmed =
      window.confirm(
        "Limpar toda a lousa?"
      );

    if (!confirmed) {
      return;
    }

    strokes = [];

    boardObjects = [];

    selectedObject =
      null;

    undoStack = [];

    redoStack = [];

    redrawCanvas();
  }
);


colorInput.addEventListener(
  "input",
  () => {

    color =
      colorInput.value;
  }
);


widthInput.addEventListener(
  "input",
  () => {

    lineWidth =
      Number(
        widthInput.value
      );
  }
);


eraserBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    if (
      tool === "eraser"
    ) {

      setPen();

    } else {

      setEraser();
    }
  }
);


/* ============================================================
   CÂMERA
   ============================================================ */

async function startCamera() {

  try {

    setStatus(
      "Solicitando acesso à câmera e ao microfone..."
    );

    /*
     Para Safari/iPhone é importante
     solicitar os dois em uma única chamada.
    */

    stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode:
            facingMode
        },

        audio: true
      });


    video.srcObject =
      stream;

    /*
     Aguarda o vídeo estar pronto.
    */

    await new Promise(
      resolve => {

        if (
          video.readyState >= 2
        ) {

          resolve();

          return;
        }

        video.onloadedmetadata =
          () => resolve();
      }
    );


    try {

      await video.play();

    } catch (playError) {

      console.log(
        "video.play:",
        playError
      );
    }


    startOverlay.classList.add(
      "hidden"
    );

    setStatus("");

    fitCanvas();

  } catch (error) {

    console.error(
      "Erro da câmera:",
      error
    );

    let message =
      "Não foi possível acessar a câmera e o microfone.";

    if (
      error &&
      error.name ===
      "NotAllowedError"
    ) {

      message =
        "Permissão negada. Autorize câmera e microfone nas configurações do Safari.";
    }

    if (
      error &&
      error.name ===
      "NotFoundError"
    ) {

      message =
        "Câmera ou microfone não encontrados.";
    }

    if (
      error &&
      error.name ===
      "SecurityError"
    ) {

      message =
        "O navegador bloqueou o acesso. Verifique se o site está em HTTPS.";
    }

    setStatus(
      message
    );
  }
}


startBtn.addEventListener(
  "click",
  () => {

    startCamera();
  }
);


/* ============================================================
   INVERTER CÂMERA
   ============================================================ */

flipBtn.addEventListener(
  "click",
  async () => {

    facingMode =
      facingMode === "user"
        ? "environment"
        : "user";

    if (stream) {

      stream
        .getTracks()
        .forEach(track =>
          track.stop()
        );
    }

    await startCamera();
  }
);


/* ============================================================
   GRAVAÇÃO
   ============================================================ */

function getSupportedMimeType() {

  const types = [

    "video/mp4",

    "video/webm;codecs=vp9,opus",

    "video/webm;codecs=vp8,opus",

    "video/webm"
  ];

  for (
    const type of types
  ) {

    if (
      MediaRecorder.isTypeSupported(
        type
      )
    ) {

      return type;
    }
  }

  return "";
}


/* ============================================================
   DESENHAR QUADRO DA GRAVAÇÃO
   ============================================================ */

function drawRecordingFrame() {

  if (
    !renderCtx ||
    !renderCanvas
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
   VÍDEO
  */

  if (
    video.readyState >= 2 &&
    video.videoWidth
  ) {

    const videoRatio =
      video.videoWidth /
      video.videoHeight;

    const canvasRatio =
      width /
      height;

    let drawWidth =
      width;

    let drawHeight =
      height;

    let offsetX = 0;

    let offsetY = 0;

    if (
      videoRatio >
      canvasRatio
    ) {

      drawHeight =
        height;

      drawWidth =
        height *
        videoRatio;

      offsetX =
        (width -
          drawWidth) / 2;

    } else {

      drawWidth =
        width;

      drawHeight =
        width /
        videoRatio;

      offsetY =
        (height -
          drawHeight) / 2;
    }

    renderCtx.save();

    if (
      facingMode ===
      "user"
    ) {

      renderCtx.translate(
        width,
        0
      );

      renderCtx.scale(
        -1,
        1
      );

      renderCtx.drawImage(
        video,
        -offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );

    } else {

      renderCtx.drawImage(
        video,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );
    }

    renderCtx.restore();
  }


  /*
   DESENHO E OBJETOS
  */

  const viewport =
    getCanvasSize();

  const scaleX =
    width /
    viewport.width;

  const scaleY =
    height /
    viewport.height;

  renderCtx.save();

  renderCtx.scale(
    scaleX,
    scaleY
  );

  for (
    const stroke of strokes
  ) {

    drawStroke(
      renderCtx,
      stroke,
      1
    );
  }

  for (
    const object of boardObjects
  ) {

    drawObject(
      renderCtx,
      object,
      1,
      false
    );
  }

  renderCtx.restore();
}


function startRenderLoop() {

  if (
    animationId
  ) {

    cancelAnimationFrame(
      animationId
    );
  }

  function render() {

    drawRecordingFrame();

    if (recording) {

      animationId =
        requestAnimationFrame(
          render
        );
    }
  }

  render();
}


/* ============================================================
   WAKE LOCK
   ============================================================ */

async function requestWakeLock() {

  if (
    !("wakeLock" in navigator)
  ) {

    return;
  }

  try {

    wakeLock =
      await navigator.wakeLock.request(
        "screen"
      );

  } catch (error) {

    console.log(
      "Wake Lock:",
      error
    );
  }
}


async function releaseWakeLock() {

  if (wakeLock) {

    try {

      await wakeLock.release();

    } catch (error) {}

    wakeLock =
      null;
  }
}


/* ============================================================
   INICIAR GRAVAÇÃO
   ============================================================ */

async function startRecording() {

  if (
    !stream
  ) {

    setStatus(
      "Inicie a câmera antes de gravar."
    );

    return;
  }

  if (
    !window.MediaRecorder
  ) {

    setStatus(
      "Este navegador não oferece suporte à gravação."
    );

    return;
  }


  const mimeType =
    getSupportedMimeType();

  const width =
    Math.max(
      720,
      Math.min(
        1920,
        Math.round(
          getCanvasSize().width * 2
        )
      )
    );

  const height =
    Math.round(
      width *
      (
        getCanvasSize().height /
        getCanvasSize().width
      )
    );


  renderCanvas =
    document.createElement(
      "canvas"
    );

  renderCanvas.width =
    width;

  renderCanvas.height =
    height;

  renderCtx =
    renderCanvas.getContext(
      "2d"
    );


  const composedStream =
    renderCanvas.captureStream(
      30
    );


  /*
   Adiciona o áudio da câmera.
  */

  const audioTracks =
    stream.getAudioTracks();

  if (
    audioTracks.length
  ) {

    composedStream.addTrack(
      audioTracks[0]
    );
  }


  try {

    mediaRecorder =
      mimeType
        ? new MediaRecorder(
            composedStream,
            {
              mimeType
            }
          )
        : new MediaRecorder(
            composedStream
          );

  } catch (error) {

    console.error(
      error
    );

    setStatus(
      "Não foi possível iniciar a gravação."
    );

    return;
  }


  chunks = [];


  mediaRecorder.ondataavailable =
    event => {

      if (
        event.data &&
        event.data.size > 0
      ) {

        chunks.push(
          event.data
        );
      }
    };


  mediaRecorder.onstop =
    () => {

      const blob =
        new Blob(
          chunks,
          {
            type:
              mediaRecorder.mimeType ||
              "video/webm"
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const a =
        document.createElement(
          "a"
        );

      a.href =
        url;

      a.download =
        `lousa-cam-${Date.now()}.webm`;

      document.body.appendChild(
        a
      );

      a.click();

      a.remove();

      setTimeout(
        () => {
          URL.revokeObjectURL(
            url
          );
        },
        2000
      );

      chunks = [];
    };


  mediaRecorder.start(
    1000
  );

  recording =
    true;

  recordBtn.classList.add(
    "recording"
  );

  await requestWakeLock();

  startRenderLoop();
}


/* ============================================================
   PARAR GRAVAÇÃO
   ============================================================ */

async function stopRecording() {

  if (
    !mediaRecorder ||
    mediaRecorder.state ===
      "inactive"
  ) {

    return;
  }

  recording =
    false;

  recordBtn.classList.remove(
    "recording"
  );

  mediaRecorder.stop();

  await releaseWakeLock();

  if (
    animationId
  ) {

    cancelAnimationFrame(
      animationId
    );

    animationId =
      null;
  }
}


/* ============================================================
   BOTÃO GRAVAR
   ============================================================ */

recordBtn.addEventListener(
  "click",
  async () => {

    if (recording) {

      await stopRecording();

    } else {

      await startRecording();
    }
  }
);


/* ============================================================
   RESIZE
   ============================================================ */

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
      250
    );
  }
);


/* ============================================================
   QUANDO VOLTA PARA A PÁGINA
   ============================================================ */

document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      if (
        recording &&
        !wakeLock
      ) {

        await requestWakeLock();
      }
    }
  }
);


/* ============================================================
   SERVICE WORKER
   ============================================================ */

function registerServiceWorker() {

  if (
    !("serviceWorker" in navigator)
  ) {

    return;
  }

  window.addEventListener(
    "load",
    async () => {

      try {

        const registration =
          await navigator.serviceWorker.register(
            "./sw.js",
            {
              updateViaCache:
                "none"
            }
          );

        console.log(
          "Service Worker registrado:",
          registration.scope
        );

        /*
         Verifica atualizações imediatamente.
        */

        await registration.update();

      } catch (error) {

        console.error(
          "Erro no Service Worker:",
          error
        );
      }
    }
  );


  /*
   Quando uma nova versão do SW assumir o controle,
   recarrega uma única vez.
  */

  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {

      if (
        sessionStorage.getItem(
          "lousa-sw-reloaded"
        ) === BUILD_VERSION
      ) {

        return;
      }

      sessionStorage.setItem(
        "lousa-sw-reloaded",
        BUILD_VERSION
      );

      window.location.reload();
    }
  );
}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

function initializeApplication() {

  console.log(
    "Inicializando Lousa Cam",
    BUILD_VERSION
  );

  fitCanvas();

  initializeCanvasInteraction();

  setPen();

  registerServiceWorker();
}


/* ============================================================
   INICIAR
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
  );

} else {

  initializeApplication();
}
