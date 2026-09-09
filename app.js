/* =========================================================
   LOUSA CAM 2.0
   APP.JS
   Versão corrigida
   ========================================================= */

const $ = id => document.getElementById(id);

/* =========================================================
   ELEMENTOS
   ========================================================= */

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

const tools = $("tools");
const menuPanel = $("menuPanel");

const widthInput = $("width");
const eraserBtn = $("eraser");
const toolName = $("toolName");

const textButton = $("textToolButton");

/* =========================================================
   CÂMERA
   ========================================================= */

let facingMode = "user";
let stream = null;

/* =========================================================
   DESENHO
   ========================================================= */

let drawing = false;
let tool = "pen";
let color = "#fff";
let lineWidth = 5;

let strokes = [];
let redoStack = [];

let currentStroke = null;

/* =========================================================
   OBJETOS DA LOUSA
   ========================================================= */

let boardObjects = [];
let selectedObject = null;

let draggingObject = false;
let resizingObject = false;

let objectDragOffset = null;
let objectResizeStart = null;

/* =========================================================
   POINTER
   ========================================================= */

let pointerStart = null;
let pointerMoved = false;

const TAP_MAX_TIME = 350;
const TAP_MAX_DISTANCE = 12;

/* =========================================================
   MENU DE COLAR
   ========================================================= */

let pasteMenu = null;
let pasteFallback = null;
let pastePosition = null;

/* =========================================================
   AÇÃO DA IMAGEM
   ========================================================= */

let imageAction = null;

/* =========================================================
   GRAVAÇÃO
   ========================================================= */

let mediaRecorder = null;
let chunks = [];
let recording = false;

let renderCanvas = null;
let renderCtx = null;
let animationId = null;

let wakeLock = null;

/* =========================================================
   STATUS
   ========================================================= */

function showStatus(message, duration = 2200) {

  if (!statusEl) {
    return;
  }

  statusEl.textContent = message || "";

  if (message) {
    statusEl.classList.add("show");

    clearTimeout(showStatus.timer);

    showStatus.timer = setTimeout(() => {
      statusEl.classList.remove("show");
    }, duration);

  } else {
    statusEl.classList.remove("show");
  }
}

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function clamp(value, min, max) {

  return Math.max(
    min,
    Math.min(max, value)
  );
}

function getCanvasSize() {

  const rect =
    canvas.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height
  };
}

function getCanvasPoint(event) {

  const rect =
    canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

/* =========================================================
   CANVAS
   ========================================================= */

function fitCanvas() {

  const rect =
    canvas.getBoundingClientRect();

  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      3
    );

  canvas.width =
    Math.max(
      1,
      Math.round(rect.width * dpr)
    );

  canvas.height =
    Math.max(
      1,
      Math.round(rect.height * dpr)
    );

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  redraw();
}

/* =========================================================
   DESENHO
   ========================================================= */

function drawStroke(
  target,
  stroke,
  scale = 1
) {

  if (
    !stroke ||
    !stroke.points ||
    !stroke.points.length
  ) {
    return;
  }

  target.save();

  target.lineCap = "round";
  target.lineJoin = "round";

  target.lineWidth =
    stroke.width * scale;

  if (
    stroke.tool === "eraser"
  ) {

    target.globalCompositeOperation =
      "destination-out";

    target.strokeStyle =
      "#000";

  } else {

    target.globalCompositeOperation =
      "source-over";

    target.strokeStyle =
      stroke.color;
  }

  target.beginPath();

  const first =
    stroke.points[0];

  target.moveTo(
    first.x * scale,
    first.y * scale
  );

  for (
    let i = 1;
    i < stroke.points.length;
    i++
  ) {

    const point =
      stroke.points[i];

    target.lineTo(
      point.x * scale,
      point.y * scale
    );
  }

  target.stroke();

  target.restore();
}

/* =========================================================
   TEXTO
   ========================================================= */

function wrapText(
  target,
  text,
  maxWidth
) {

  const words =
    String(text).split(/\s+/);

  const lines = [];

  let line = "";

  for (const word of words) {

    const test =
      line
        ? `${line} ${word}`
        : word;

    if (
      target.measureText(test).width <=
        maxWidth ||
      !line
    ) {

      line = test;

    } else {

      lines.push(line);

      line = word;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.length
    ? lines
    : [""];
}

function getTextMetrics(object) {

  ctx.save();

  ctx.font =
    `${object.fontSize}px ${object.fontFamily}`;

  const lines =
    wrapText(
      ctx,
      object.text,
      object.width
    );

  const lineHeight =
    object.fontSize * 1.25;

  const height =
    Math.max(
      lineHeight + 10,
      lines.length *
        lineHeight +
        8
    );

  ctx.restore();

  return {
    lines,
    lineHeight,
    height
  };
}

function drawTextObject(
  target,
  object,
  scale = 1
) {

  target.save();

  target.globalCompositeOperation =
    "source-over";

  target.fillStyle =
    object.color || "#fff";

  target.font =
    `${object.fontSize * scale}px ${object.fontFamily}`;

  const lines =
    wrapText(
      target,
      object.text,
      object.width * scale
    );

  const lineHeight =
    object.fontSize *
    1.25 *
    scale;

  lines.forEach(
    (line, index) => {

      target.fillText(
        line,
        object.x * scale,
        object.y * scale +
          index * lineHeight
      );

    }
  );

  target.restore();
}

/* =========================================================
   IMAGEM
   ========================================================= */

function drawImageObject(
  target,
  object,
  scale = 1
) {

  if (
    !object.image ||
    !object.image.complete
  ) {
    return;
  }

  target.save();

  target.globalCompositeOperation =
    "source-over";

  target.drawImage(
    object.image,
    object.x * scale,
    object.y * scale,
    object.width * scale,
    object.height * scale
  );

  target.restore();
}

/* =========================================================
   LIMITES DO OBJETO
   ========================================================= */

function getObjectBounds(object) {

  if (
    object.type === "text"
  ) {

    const metrics =
      getTextMetrics(object);

    return {
      x: object.x,
      y:
        object.y -
        object.fontSize,

      width:
        object.width,

      height:
        metrics.height
    };
  }

  return {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height
  };
}

/* =========================================================
   SELEÇÃO
   ========================================================= */

function drawSelection(
  target,
  object,
  scale = 1
) {

  const bounds =
    getObjectBounds(object);

  target.save();

  target.strokeStyle =
    "#ffffff";

  target.lineWidth =
    2 * scale;

  target.setLineDash([
    7 * scale,
    5 * scale
  ]);

  target.strokeRect(
    bounds.x * scale,
    bounds.y * scale,
    bounds.width * scale,
    bounds.height * scale
  );

  target.setLineDash([]);

  target.fillStyle =
    "#ffffff";

  const handleSize =
    12 * scale;

  target.fillRect(
    (
      bounds.x +
      bounds.width -
      6
    ) * scale,

    (
      bounds.y +
      bounds.height -
      6
    ) * scale,

    handleSize,
    handleSize
  );

  target.restore();
}

/* =========================================================
   REDESENHAR
   ========================================================= */

function redraw() {

  const size =
    getCanvasSize();

  ctx.clearRect(
    0,
    0,
    size.width,
    size.height
  );

  for (
    const stroke of strokes
  ) {

    drawStroke(
      ctx,
      stroke
    );
  }

  for (
    const object of boardObjects
  ) {

    if (
      object.type === "text"
    ) {

      drawTextObject(
        ctx,
        object
      );

    } else if (
      object.type === "image"
    ) {

      drawImageObject(
        ctx,
        object
      );
    }

    if (
      selectedObject === object
    ) {

      drawSelection(
        ctx,
        object
      );
    }
  }
}

/* =========================================================
   OBJETOS
   ========================================================= */

function getObjectAtPoint(
  x,
  y
) {

  for (
    let i =
      boardObjects.length - 1;
    i >= 0;
    i--
  ) {

    const object =
      boardObjects[i];

    const bounds =
      getObjectBounds(object);

    if (
      x >= bounds.x &&
      x <=
        bounds.x +
        bounds.width &&
      y >= bounds.y &&
      y <=
        bounds.y +
        bounds.height
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

  const bounds =
    getObjectBounds(object);

  const handle =
    24;

  return (
    x >=
      bounds.x +
      bounds.width -
      handle &&

    y >=
      bounds.y +
      bounds.height -
      handle
  );
}

/* =========================================================
   CRIAR TEXTO
   ========================================================= */

function createTextObject(
  text,
  x,
  y
) {

  const object = {

    id:
      `text-${Date.now()}-${Math.random()}`,

    type:
      "text",

    text:
      text,

    x:
      x,

    y:
      y,

    width:
      260,

    height:
      50,

    color:
      color,

    fontSize:
      30,

    fontFamily:
      "Arial"
  };

  const metrics =
    getTextMetrics(object);

  object.height =
    metrics.height;

  const size =
    getCanvasSize();

  object.x =
    clamp(
      object.x,
      10,
      Math.max(
        10,
        size.width -
          object.width -
          10
      )
    );

  object.y =
    clamp(
      object.y,
      object.fontSize + 10,
      Math.max(
        object.fontSize + 10,
        size.height - 10
      )
    );

  return object;
}

function addBoardObject(
  object
) {

  boardObjects.push(
    object
  );

  selectedObject =
    object;

  redraw();
}

/* =========================================================
   EDITAR TEXTO
   ========================================================= */

function editTextObject(
  object
) {

  if (
    !object ||
    object.type !== "text"
  ) {
    return;
  }

  const newText =
    window.prompt(
      "Editar texto:",
      object.text
    );

  if (
    newText === null
  ) {
    return;
  }

  if (
    !newText.trim()
  ) {
    return;
  }

  object.text =
    newText.trim();

  const metrics =
    getTextMetrics(object);

  object.height =
    metrics.height;

  selectedObject =
    object;

  redraw();
}

/* =========================================================
   BOTÃO T
   ========================================================= */

function initializeTextButton() {

  if (!textButton) {
    return;
  }

  textButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      closePasteMenu();

      closeToolsPanel();

      const value =
        window.prompt(
          "Digite o texto:"
        );

      if (
        value === null
      ) {
        return;
      }

      if (
        !value.trim()
      ) {
        return;
      }

      const size =
        getCanvasSize();

      const object =
        createTextObject(
          value.trim(),
          size.width / 2 - 130,
          size.height / 2
        );

      addBoardObject(
        object
      );
    }
  );
}

/* =========================================================
   MENU DE COLAR
   ========================================================= */

function createPasteMenu() {

  if (pasteMenu) {
    return;
  }

  pasteMenu =
    document.createElement(
      "div"
    );

  pasteMenu.id =
    "pasteMenu";

  pasteMenu.innerHTML = `
    <button
      id="pasteClipboardButton"
      type="button"
    >
      Colar da área de transferência
    </button>
  `;

  Object.assign(
    pasteMenu.style,
    {
      position:
        "fixed",

      zIndex:
        "99999",

      display:
        "none",

      padding:
        "8px",

      borderRadius:
        "14px",

      background:
        "rgba(25,25,25,.97)",

      border:
        "1px solid rgba(255,255,255,.15)",

      boxShadow:
        "0 8px 30px rgba(0,0,0,.45)",

      backdropFilter:
        "blur(10px)"
    }
  );

  const button =
    pasteMenu.querySelector(
      "#pasteClipboardButton"
    );

  Object.assign(
    button.style,
    {
      width:
        "100%",

      minWidth:
        "230px",

      border:
        "0",

      background:
        "transparent",

      color:
        "#fff",

      padding:
        "12px 14px",

      borderRadius:
        "9px",

      fontSize:
        "14px",

      textAlign:
        "left",

      cursor:
        "pointer"
    }
  );

  button.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      pasteClipboard();
    }
  );

  pasteMenu.addEventListener(
    "pointerdown",
    event => {

      event.stopPropagation();
    }
  );

  document
    .getElementById("app")
    .appendChild(
      pasteMenu
    );
}

/* =========================================================
   ABRIR MENU DE COLAR
   ========================================================= */

function openPasteMenu(
  clientX,
  clientY,
  canvasX,
  canvasY
) {

  createPasteMenu();

  pastePosition = {
    x: canvasX,
    y: canvasY
  };

  pasteMenu.style.display =
    "block";

  const width = 260;
  const height = 58;

  pasteMenu.style.left =
    `${clamp(
      clientX,
      8,
      window.innerWidth -
        width -
        8
    )}px`;

  pasteMenu.style.top =
    `${clamp(
      clientY,
      8,
      window.innerHeight -
        height -
        8
    )}px`;
}

/* =========================================================
   FECHAR MENU DE COLAR
   ========================================================= */

function closePasteMenu() {

  if (pasteMenu) {

    pasteMenu.style.display =
      "none";
  }

  if (pasteFallback) {

    pasteFallback.remove();

    pasteFallback =
      null;
  }
}

/* =========================================================
   FALLBACK PARA SAFARI
   ========================================================= */

function createPasteFallback() {

  if (pasteFallback) {
    return pasteFallback;
  }

  const element =
    document.createElement(
      "div"
    );

  element.contentEditable =
    "true";

  element.setAttribute(
    "aria-label",
    "Área temporária para colar"
  );

  Object.assign(
    element.style,
    {
      position:
        "fixed",

      left:
        "50%",

      top:
        "50%",

      transform:
        "translate(-50%,-50%)",

      zIndex:
        "100000",

      width:
        "260px",

      minHeight:
        "48px",

      padding:
        "12px",

      borderRadius:
        "12px",

      background:
        "rgba(20,20,20,.96)",

      color:
        "#fff",

      border:
        "1px solid rgba(255,255,255,.25)",

      outline:
        "none",

      fontSize:
        "16px",

      userSelect:
        "text",

      WebkitUserSelect:
        "text"
    }
  );

  element.addEventListener(
    "pointerdown",
    event => {

      event.stopPropagation();
    }
  );

  element.addEventListener(
    "paste",
    event => {

      event.preventDefault();

      const position =
        pastePosition || {
          x: 50,
          y: 50
        };

      const clipboard =
        event.clipboardData;

      if (!clipboard) {
        return;
      }

      const items =
        clipboard.items || [];

      for (
        const item of items
      ) {

        if (
          item.kind ===
            "file" &&
          item.type.startsWith(
            "image/"
          )
        ) {

          const file =
            item.getAsFile();

          if (file) {

            createImageObject(
              file,
              position.x,
              position.y
            );

            closePasteMenu();

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

        addBoardObject(
          createTextObject(
            text.trim(),
            position.x,
            position.y
          )
        );

        closePasteMenu();
      }
    }
  );

  document
    .getElementById("app")
    .appendChild(
      element
    );

  pasteFallback =
    element;

  return element;
}

/* =========================================================
   COLAR
   ========================================================= */

async function pasteClipboard() {

  const position =
    pastePosition || {
      x: 50,
      y: 50
    };

  /*
   * O menu desaparece imediatamente
   * depois do comando Colar.
   */
  if (pasteMenu) {

    pasteMenu.style.display =
      "none";
  }

  try {

    /*
     * Primeiro tenta imagem/texto
     * pela Clipboard API.
     */

    if (
      navigator.clipboard &&
      navigator.clipboard.read
    ) {

      const items =
        await navigator.clipboard.read();

      for (
        const item of items
      ) {

        const imageType =
          item.types.find(
            type =>
              type.startsWith(
                "image/"
              )
          );

        if (imageType) {

          const blob =
            await item.getType(
              imageType
            );

          createImageObject(
            blob,
            position.x,
            position.y
          );

          pastePosition =
            null;

          return;
        }

        if (
          item.types.includes(
            "text/plain"
          )
        ) {

          const blob =
            await item.getType(
              "text/plain"
            );

          const text =
            await blob.text();

          if (
            text &&
            text.trim()
          ) {

            addBoardObject(
              createTextObject(
                text.trim(),
                position.x,
                position.y
              )
            );

            pastePosition =
              null;

            return;
          }
        }
      }
    }

    /*
     * Depois tenta somente texto.
     */

    if (
      navigator.clipboard &&
      navigator.clipboard.readText
    ) {

      const text =
        await navigator.clipboard.readText();

      if (
        text &&
        text.trim()
      ) {

        addBoardObject(
          createTextObject(
            text.trim(),
            position.x,
            position.y
          )
        );

        pastePosition =
          null;

        return;
      }
    }

  } catch (error) {

    console.log(
      "Clipboard API bloqueada:",
      error
    );
  }

  /*
   * Fallback especialmente útil
   * para Safari/iPhone.
   */

  pastePosition =
    position;

  const fallback =
    createPasteFallback();

  fallback.focus();

  showStatus(
    "Toque no campo e use Colar."
  );
}

/* =========================================================
   IMAGEM
   ========================================================= */

function createImageObject(
  blob,
  x,
  y
) {

  const url =
    URL.createObjectURL(
      blob
    );

  const image =
    new Image();

  image.onload =
    () => {

      const size =
        getCanvasSize();

      const maxWidth =
        Math.min(
          400,
          Math.max(
            140,
            size.width - 20
          )
        );

      const naturalWidth =
        image.naturalWidth ||
        maxWidth;

      const naturalHeight =
        image.naturalHeight ||
        1;

      const width =
        Math.min(
          maxWidth,
          naturalWidth
        );

      const height =
        width *
        (
          naturalHeight /
          naturalWidth
        );

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
            Math.max(
              10,
              size.width -
                width -
                10
            )
          ),

        y:
          clamp(
            y,
            10,
            Math.max(
              10,
              size.height -
                height -
                10
            )
          ),

        width:
          width,

        height:
          height
      };

      addBoardObject(
        object
      );
    };

  image.onerror =
    () => {

      URL.revokeObjectURL(
        url
      );

      showStatus(
        "Não foi possível carregar a imagem."
      );
    };

  image.src =
    url;
}

/* =========================================================
   AÇÃO DA IMAGEM
   ========================================================= */

function createImageAction() {

  if (imageAction) {
    return;
  }

  imageAction =
    document.createElement(
      "button"
    );

  imageAction.id =
    "imageCancelButton";

  imageAction.type =
    "button";

  imageAction.textContent =
    "Cancelar";

  Object.assign(
    imageAction.style,
    {
      position:
        "fixed",

      display:
        "none",

      zIndex:
        "100001",

      padding:
        "9px 14px",

      borderRadius:
        "10px",

      border:
        "1px solid rgba(255,255,255,.18)",

      background:
        "rgba(25,25,25,.96)",

      color:
        "#fff",

      fontSize:
        "14px",

      cursor:
        "pointer"
    }
  );

  imageAction.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      selectedObject =
        null;

      hideImageAction();

      redraw();
    }
  );

  document
    .getElementById("app")
    .appendChild(
      imageAction
    );
}

function showImageAction(
  object
) {

  createImageAction();

  const bounds =
    getObjectBounds(object);

  imageAction.style.left =
    `${clamp(
      bounds.x +
        bounds.width -
        10,
      8,
      window.innerWidth -
        100
    )}px`;

  imageAction.style.top =
    `${clamp(
      bounds.y - 48,
      8,
      window.innerHeight -
        48
    )}px`;

  imageAction.style.display =
    "block";
}

function hideImageAction() {

  if (imageAction) {

    imageAction.style.display =
      "none";
  }
}

/* =========================================================
   FERRAMENTAS
   ========================================================= */

function closeToolsPanel() {

  if (!tools) {
    return;
  }

  tools.classList.remove(
    "open"
  );

  tools.setAttribute(
    "aria-hidden",
    "true"
  );
}

function toggleTools() {

  const open =
    !tools.classList.contains(
      "open"
    );

  tools.classList.toggle(
    "open",
    open
  );

  tools.setAttribute(
    "aria-hidden",
    String(!open)
  );

  if (open) {

    menuPanel.classList.remove(
      "open"
    );

    menuPanel.setAttribute(
      "aria-hidden",
      "true"
    );
  }
}

/* =========================================================
   MENU ☰
   ========================================================= */

function toggleMenu() {

  const open =
    !menuPanel.classList.contains(
      "open"
    );

  menuPanel.classList.toggle(
    "open",
    open
  );

  menuPanel.setAttribute(
    "aria-hidden",
    String(!open)
  );

  if (open) {

    tools.classList.remove(
      "open"
    );

    tools.setAttribute(
      "aria-hidden",
      "true"
    );
  }
}

/* =========================================================
   CANETA
   ========================================================= */

function setPen() {

  tool =
    "pen";

  if (toolName) {

    toolName.textContent =
      "Caneta";
  }
}

function setEraser() {

  tool =
    "eraser";

  if (toolName) {

    toolName.textContent =
      "Borracha";
  }
}

/* =========================================================
   POINTER DOWN
   ========================================================= */

function startPointerInteraction(
  event
) {

  if (
    event.pointerType ===
      "mouse" &&
    event.button !== 0
  ) {

    return;
  }

  event.preventDefault();

  const point =
    getCanvasPoint(event);

  /*
   * CORREÇÃO IMPORTANTE:
   *
   * qualquer toque na lousa fecha
   * imediatamente a caixa da caneta.
   */

  closeToolsPanel();

  pointerStart = {

    x:
      point.x,

    y:
      point.y,

    clientX:
      event.clientX,

    clientY:
      event.clientY,

    time:
      Date.now()
  };

  pointerMoved =
    false;

  const object =
    getObjectAtPoint(
      point.x,
      point.y
    );

  /*
   * OBJETO
   */

  if (object) {

    selectedObject =
      object;

    hideImageAction();

    /*
     * Redimensionar
     */

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

      /*
       * Mover
       */

      draggingObject =
        true;

      const bounds =
        getObjectBounds(
          object
        );

      objectDragOffset = {

        x:
          point.x -
          bounds.x,

        y:
          point.y -
          bounds.y
      };
    }

    canvas.setPointerCapture?.(
      event.pointerId
    );

    redraw();

    return;
  }

  /*
   * Clique em área vazia.
   */

  selectedObject =
    null;

  hideImageAction();

  /*
   * DESENHO
   */

  if (
    tool === "pen" ||
    tool === "eraser"
  ) {

    drawing =
      true;

    currentStroke = {

      tool:
        tool,

      color:
        color,

      width:
        lineWidth,

      points: [
        {
          x:
            point.x,

          y:
            point.y
        }
      ]
    };

    strokes.push(
      currentStroke
    );

    redoStack =
      [];

    canvas.setPointerCapture?.(
      event.pointerId
    );

    redraw();

    return;
  }
}

/* =========================================================
   POINTER MOVE
   ========================================================= */

function movePointerInteraction(
  event
) {

  if (!pointerStart) {
    return;
  }

  event.preventDefault();

  const point =
    getCanvasPoint(event);

  const distance =
    Math.hypot(
      point.x -
        pointerStart.x,

      point.y -
        pointerStart.y
    );

  if (
    distance >
    TAP_MAX_DISTANCE
  ) {

    pointerMoved =
      true;
  }

  /*
   * REDIMENSIONAR
   */

  if (
    resizingObject &&
    selectedObject
  ) {

    const dx =
      point.x -
      pointerStart.x;

    const newWidth =
      Math.max(
        80,
        objectResizeStart.width +
          dx
      );

    selectedObject.width =
      newWidth;

    if (
      selectedObject.type ===
      "image"
    ) {

      const ratio =
        objectResizeStart.height /
        objectResizeStart.width;

      selectedObject.height =
        Math.max(
          60,
          newWidth * ratio
        );

    } else {

      selectedObject.height =
        getTextMetrics(
          selectedObject
        ).height;
    }

    redraw();

    return;
  }

  /*
   * MOVER
   */

  if (
    draggingObject &&
    selectedObject
  ) {

    const size =
      getCanvasSize();

    const bounds =
      getObjectBounds(
        selectedObject
      );

    const newX =
      point.x -
      objectDragOffset.x;

    const newY =
      point.y -
      objectDragOffset.y;

    selectedObject.x =
      clamp(
        newX,
        5,
        Math.max(
          5,
          size.width -
            bounds.width -
            5
        )
      );

    if (
      selectedObject.type ===
      "text"
    ) {

      selectedObject.y =
        clamp(
          newY +
            selectedObject.fontSize,

          selectedObject.fontSize +
            5,

          size.height -
            5
        );

    } else {

      selectedObject.y =
        clamp(
          newY,
          5,
          Math.max(
            5,
            size.height -
              selectedObject.height -
              5
          )
        );
    }

    redraw();

    return;
  }

  /*
   * DESENHAR
   */

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

    redraw();
  }
}

/* =========================================================
   POINTER UP
   ========================================================= */

function endPointerInteraction(
  event
) {

  if (!pointerStart) {
    return;
  }

  event.preventDefault();

  const point =
    getCanvasPoint(event);

  const wasTap =
    !pointerMoved &&
    (
      Date.now() -
      pointerStart.time
    ) <=
      TAP_MAX_TIME;

  const tappedObject =
    getObjectAtPoint(
      point.x,
      point.y
    );

  /*
   * ENCERRA DESENHO
   */

  if (drawing) {

    drawing =
      false;

    currentStroke =
      null;
  }

  /*
   * OBJETO
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

    /*
     * Um segundo clique no objeto:
     */

    if (
      wasTap &&
      tappedObject ===
        selectedObject
    ) {

      if (
        selectedObject.type ===
        "text"
      ) {

        /*
         * TEXTO:
         * abre edição.
         */

        editTextObject(
          selectedObject
        );

      } else if (
        selectedObject.type ===
        "image"
      ) {

        /*
         * IMAGEM:
         * mostra somente Cancelar.
         */

        showImageAction(
          selectedObject
        );
      }
    }

  } else if (
    wasTap &&
    !tappedObject &&
    !drawing
  ) {

    /*
     * ÁREA VAZIA:
     * somente Colar.
     */

    openPasteMenu(
      event.clientX,
      event.clientY,
      point.x,
      point.y
    );
  }

  pointerStart =
    null;

  pointerMoved =
    false;

  try {

    canvas.releasePointerCapture?.(
      event.pointerId
    );

  } catch (error) {}

  redraw();
}

/* =========================================================
   POINTER CANCEL
   ========================================================= */

function cancelPointerInteraction(
  event
) {

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

  pointerMoved =
    false;

  objectDragOffset =
    null;

  objectResizeStart =
    null;

  redraw();

  try {

    canvas.releasePointerCapture?.(
      event.pointerId
    );

  } catch (error) {}
}

/* =========================================================
   INTERAÇÃO COM CANVAS
   ========================================================= */

function initializeCanvasInteraction() {

  canvas.addEventListener(
    "pointerdown",
    startPointerInteraction,
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "pointermove",
    movePointerInteraction,
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "pointerup",
    endPointerInteraction,
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "pointercancel",
    cancelPointerInteraction,
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "contextmenu",
    event => {

      event.preventDefault();
    }
  );
}

/* =========================================================
   BOTÕES DA INTERFACE
   ========================================================= */

function initializeInterface() {

  /*
   * ☰
   *
   * IMPORTANTE:
   * não chama caneta.
   */

  menuBtn?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      toggleMenu();
    }
  );

  /*
   * FERRAMENTAS / CANETA
   */

  settingsBtn?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      toggleTools();
    }
  );

  /*
   * DESFAZER
   */

  undoBtn?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      if (!strokes.length) {
        return;
      }

      const stroke =
        strokes.pop();

      redoStack.push(
        stroke
      );

      redraw();
    }
  );

  /*
   * REFAZER
   */

  redoBtn?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      if (!redoStack.length) {
        return;
      }

      const stroke =
        redoStack.pop();

      strokes.push(
        stroke
      );

      redraw();
    }
  );

  /*
   * LIMPAR
   */

  clearBtn?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      if (
        !strokes.length &&
        !boardObjects.length
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Limpar toda a lousa?"
        );

      if (!confirmed) {
        return;
      }

      strokes =
        [];

      redoStack =
        [];

      boardObjects =
        [];

      selectedObject =
        null;

      hideImageAction();

      closePasteMenu();

      redraw();
    }
  );

  /*
   * CORES
   */

  document
    .querySelectorAll(
      ".color"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            color =
              button.dataset.color ||
              "#fff";

            document
              .querySelectorAll(
                ".color"
              )
              .forEach(
                item =>
                  item.classList.remove(
                    "active"
                  )
              );

            button.classList.add(
              "active"
            );

            setPen();
          }
        );
      }
    );

  /*
   * ESPESSURA
   */

  widthInput?.addEventListener(
    "input",
    () => {

      lineWidth =
        Number(
          widthInput.value
        );
    }
  );

  /*
   * BORRACHA
   */

  eraserBtn?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      if (
        tool ===
        "eraser"
      ) {

        setPen();

      } else {

        setEraser();
      }
    }
  );

  /*
   * T
   */

  initializeTextButton();

  /*
   * CLIQUE FORA DOS PAINÉIS
   */

  document.addEventListener(
    "pointerdown",
    event => {

      /*
       * Menu de colar
       */

      if (
        pasteMenu &&
        pasteMenu.style.display ===
          "block" &&
        !pasteMenu.contains(
          event.target
        )
      ) {

        closePasteMenu();
      }

      /*
       * Menu ☰
       */

      if (
        menuPanel &&
        menuPanel.classList.contains(
          "open"
        ) &&
        !menuPanel.contains(
          event.target
        ) &&
        event.target !==
          menuBtn
      ) {

        menuPanel.classList.remove(
          "open"
        );

        menuPanel.setAttribute(
          "aria-hidden",
          "true"
        );
      }

      /*
       * Ferramentas
       */

      if (
        tools &&
        tools.classList.contains(
          "open"
        ) &&
        !tools.contains(
          event.target
        ) &&
        event.target !==
          settingsBtn
      ) {

        /*
         * Não fecha quando o toque
         * aconteceu na lousa.
         *
         * A própria interação da
         * lousa fecha o painel.
         */

        if (
          event.target !==
            canvas
        ) {

          closeToolsPanel();
        }
      }
    },
    true
  );
}

/* =========================================================
   TROCAR CÂMERA
   ========================================================= */

function initializeFlipButton() {

  flipBtn?.addEventListener(
    "click",
    async event => {

      event.stopPropagation();

      facingMode =
        facingMode ===
          "user"
          ? "environment"
          : "user";

      if (!stream) {
        return;
      }

      try {

        const oldStream =
          stream;

        const newStream =
          await navigator
            .mediaDevices
            .getUserMedia({
              video: {
                facingMode:
                  facingMode
              },
              audio: false
            });

        const newVideoTrack =
          newStream
            .getVideoTracks()[0];

        const audioTracks =
          oldStream
            .getAudioTracks();

        const tracks = [];

        if (
          newVideoTrack
        ) {

          tracks.push(
            newVideoTrack
          );
        }

        tracks.push(
          ...audioTracks
        );

        const combined =
          new MediaStream(
            tracks
          );

        const oldVideoTrack =
          oldStream
            .getVideoTracks()[0];

        if (
          oldVideoTrack
        ) {

          oldVideoTrack.stop();
        }

        video.srcObject =
          combined;

        stream =
          combined;

        if (
          facingMode ===
          "user"
        ) {

          video.classList.add(
            "mirror"
          );

        } else {

          video.classList.remove(
            "mirror"
          );
        }

        await video.play()
          .catch(() => {});

      } catch (error) {

        console.error(
          error
        );

        showStatus(
          "Não foi possível trocar a câmera."
        );
      }
    }
  );
}

/* =========================================================
   CÂMERA
   ========================================================= */

async function startCamera() {

  try {

    showStatus(
      "Solicitando acesso à câmera e ao microfone...",
      3000
    );

    stream =
      await navigator
        .mediaDevices
        .getUserMedia({
          video: {
            facingMode:
              facingMode
          },

          audio: true
        });

    video.srcObject =
      stream;

    await video
      .play()
      .catch(() => {});

    if (
      facingMode ===
      "user"
    ) {

      video.classList.add(
        "mirror"
      );

    } else {

      video.classList.remove(
        "mirror"
      );
    }

    startOverlay.classList.add(
      "hidden"
    );

    showStatus(
      ""
    );

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
        "O acesso foi bloqueado. Verifique se o site está em HTTPS.";
    }

    showStatus(
      message,
      4500
    );
  }
}

/* =========================================================
   GRAVAÇÃO
   ========================================================= */

function createRenderCanvas() {

  renderCanvas =
    document.createElement(
      "canvas"
    );

  renderCanvas.width =
    canvas.width;

  renderCanvas.height =
    canvas.height;

  renderCtx =
    renderCanvas.getContext(
      "2d"
    );
}

function drawRecordingFrame() {

  if (
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

  if (
    video.readyState >= 2
  ) {

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
    }

    const videoWidth =
      video.videoWidth ||
      width;

    const videoHeight =
      video.videoHeight ||
      height;

    const scale =
      Math.max(
        width /
          videoWidth,

        height /
          videoHeight
      );

    const drawWidth =
      videoWidth *
      scale;

    const drawHeight =
      videoHeight *
      scale;

    renderCtx.drawImage(
      video,

      (
        width -
        drawWidth
      ) / 2,

      (
        height -
        drawHeight
      ) / 2,

      drawWidth,
      drawHeight
    );

    renderCtx.restore();
  }

  const scale =
    width /
    Math.max(
      1,
      canvas.clientWidth
    );

  for (
    const stroke of strokes
  ) {

    drawStroke(
      renderCtx,
      stroke,
      scale
    );
  }

  for (
    const object of boardObjects
  ) {

    if (
      object.type ===
      "text"
    ) {

      drawTextObject(
        renderCtx,
        object,
        scale
      );

    } else {

      drawImageObject(
        renderCtx,
        object,
        scale
      );
    }
  }
}

function chooseRecordingMime() {

  const types = [

    "video/mp4;codecs=avc1",

    "video/webm;codecs=vp9,opus",

    "video/webm;codecs=vp8,opus",

    "video/webm"
  ];

  return types.find(
    type =>
      window.MediaRecorder &&
      MediaRecorder.isTypeSupported &&
      MediaRecorder.isTypeSupported(
        type
      )
  ) || "";
}

async function startRecording() {

  if (recording) {
    return;
  }

  if (
    !canvas.captureStream ||
    !window.MediaRecorder
  ) {

    showStatus(
      "A gravação não é suportada neste navegador."
    );

    return;
  }

  createRenderCanvas();

  const capture =
    renderCanvas.captureStream(
      30
    );

  const audioTrack =
    stream &&
    stream.getAudioTracks &&
    stream.getAudioTracks()[0];

  if (audioTrack) {

    capture.addTrack(
      audioTrack
    );
  }

  const mime =
    chooseRecordingMime();

  try {

    mediaRecorder =
      new MediaRecorder(
        capture,
        mime
          ? {
              mimeType:
                mime
            }
          : undefined
      );

  } catch (error) {

    mediaRecorder =
      new MediaRecorder(
        capture
      );
  }

  chunks = [];

  mediaRecorder.ondataavailable =
    event => {

      if (
        event.data &&
        event.data.size
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

      const link =
        document.createElement(
          "a"
        );

      link.href =
        url;

      link.download =
        `lousa-cam-${Date.now()}.${
          blob.type.includes(
            "mp4"
          )
            ? "mp4"
            : "webm"
        }`;

      link.click();

      setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        1000
      );
    };

  mediaRecorder.start(
    200
  );

  recording =
    true;

  recordBtn.classList.add(
    "recording"
  );

  const renderLoop =
    () => {

      if (!recording) {
        return;
      }

      drawRecordingFrame();

      animationId =
        requestAnimationFrame(
          renderLoop
        );
    };

  renderLoop();

  requestWakeLock();

  showStatus(
    "Gravação iniciada."
  );
}

function stopRecording() {

  if (
    !mediaRecorder ||
    !recording
  ) {
    return;
  }

  recording =
    false;

  cancelAnimationFrame(
    animationId
  );

  mediaRecorder.stop();

  recordBtn.classList.remove(
    "recording"
  );

  releaseWakeLock();

  showStatus(
    "Gravação finalizada."
  );
}

/* =========================================================
   WAKE LOCK
   ========================================================= */

async function requestWakeLock() {

  try {

    if (
      "wakeLock" in navigator
    ) {

      wakeLock =
        await navigator.wakeLock.request(
          "screen"
        );
    }

  } catch (error) {}
}

function releaseWakeLock() {

  try {

    if (wakeLock) {

      wakeLock.release();
    }

  } catch (error) {}

  wakeLock =
    null;
}

/* =========================================================
   BOTÃO GRAVAR
   ========================================================= */

function initializeRecordButton() {

  recordBtn?.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      if (recording) {

        stopRecording();

      } else {

        startRecording();
      }
    }
  );
}

/* =========================================================
   START
   ========================================================= */

function initializeStartButton() {

  startBtn?.addEventListener(
    "click",
    async event => {

      event.preventDefault();

      await startCamera();
    }
  );
}

/* =========================================================
   SERVICE WORKER
   ========================================================= */

function registerServiceWorker() {

  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  navigator.serviceWorker
    .register(
      "./sw.js"
    )
    .then(
      registration =>
        registration.update()
    )
    .catch(
      error =>
        console.log(
          "Service Worker:",
          error
        )
    );
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function initializeApplication() {

  initializeInterface();

  initializeFlipButton();

  initializeRecordButton();

  initializeStartButton();

  initializeCanvasInteraction();

  createPasteMenu();

  createImageAction();

  fitCanvas();

  window.addEventListener(
    "resize",
    fitCanvas
  );

  registerServiceWorker();
}

/* =========================================================
   VISIBILIDADE
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      document.visibilityState ===
        "visible" &&
      recording
    ) {

      await requestWakeLock();
    }
  }
);

/* =========================================================
   INICIAR
   ========================================================= */

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
