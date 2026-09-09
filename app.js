/* =========================================================
   LOUSA CAM 2.0
   Versão com Texto / Imagem / Área de transferência
   Build: 2026-09-09-02
   ========================================================= */

const BUILD_VERSION = "2026-09-09-02";

const $ = id => document.getElementById(id);

const video = $("video");
const canvas = $("canvas");
const ctx = canvas.getContext("2d", { alpha: true });

const startOverlay = $("startOverlay");
const startBtn = $("startBtn");
const statusEl = $("status");
const recordBtn = $("record");

let facingMode = "user";
let stream = null;

let drawing = false;
let tool = "pen";
let color = "#fff";
let lineWidth = 5;

let strokes = [];
let redoStack = [];
let currentStroke = null;

let boardObjects = [];
let objectRedoStack = [];
let selectedObject = null;

let draggingObject = false;
let resizingObject = false;

let objectDragOffset = null;
let objectResizeStart = null;

let tapStart = null;
let tapMoved = false;

const TAP_MAX_TIME = 280;
const TAP_MAX_DISTANCE = 10;

let pasteMenu = null;
let pastePoint = null;

let pasteHelper = null;
let pasteArea = null;

let imageInput = null;

let mediaRecorder = null;
let chunks = [];
let recording = false;

let renderCanvas = null;
let renderCtx = null;
let animationId = null;

let wakeLock = null;

let toastTimer = null;


/* =========================================================
   STATUS
   ========================================================= */

function toast(message, duration = 2200) {

  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    statusEl.classList.remove("show");
  }, duration);
}


/* =========================================================
   CANVAS
   ========================================================= */

function fitCanvas() {

  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  const width =
    Math.max(
      1,
      window.innerWidth
    );

  const height =
    Math.max(
      1,
      window.innerHeight
    );

  canvas.width =
    Math.round(width * dpr);

  canvas.height =
    Math.round(height * dpr);

  canvas.style.width =
    width + "px";

  canvas.style.height =
    height + "px";

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
   PONTO DO CANVAS
   ========================================================= */

function getCanvasPoint(event) {

  const rect =
    canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}


/* =========================================================
   DESENHO
   ========================================================= */

function drawStroke(context, stroke) {

  if (
    !stroke ||
    !stroke.points ||
    !stroke.points.length
  ) {
    return;
  }

  context.save();

  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.width;

  context.globalCompositeOperation =
    stroke.tool === "eraser"
      ? "destination-out"
      : "source-over";

  context.strokeStyle =
    stroke.color;

  context.beginPath();

  context.moveTo(
    stroke.points[0].x,
    stroke.points[0].y
  );

  for (
    let i = 1;
    i < stroke.points.length;
    i++
  ) {

    context.lineTo(
      stroke.points[i].x,
      stroke.points[i].y
    );
  }

  if (
    stroke.points.length === 1
  ) {

    context.lineTo(
      stroke.points[0].x + 0.01,
      stroke.points[0].y + 0.01
    );
  }

  context.stroke();

  context.restore();
}


/* =========================================================
   TEXTO
   ========================================================= */

function drawWrappedText(
  context,
  text,
  x,
  y,
  maxWidth,
  fontSize,
  lineHeight
) {

  const paragraphs =
    String(text || "").split("\n");

  let currentY = y;

  context.textBaseline = "top";

  for (
    const paragraph of paragraphs
  ) {

    const words =
      paragraph.split(" ");

    let line = "";

    for (
      let i = 0;
      i < words.length;
      i++
    ) {

      const testLine =
        line
          ? line + " " + words[i]
          : words[i];

      const width =
        context.measureText(testLine).width;

      if (
        width > maxWidth &&
        line
      ) {

        context.fillText(
          line,
          x,
          currentY
        );

        line = words[i];

        currentY +=
          lineHeight;

      } else {

        line = testLine;
      }
    }

    context.fillText(
      line,
      x,
      currentY
    );

    currentY +=
      lineHeight;
  }

  return currentY - y;
}


/* =========================================================
   DESENHAR OBJETOS
   ========================================================= */

function drawObject(
  context,
  object,
  showSelection = false
) {

  if (!object) return;

  context.save();

  if (object.type === "text") {

    const fontSize =
      object.fontSize || 32;

    const padding =
      object.padding || 10;

    const width =
      object.width || 320;

    const lineHeight =
      fontSize * 1.25;

    context.font =
      `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

    context.fillStyle =
      object.color || "#fff";

    const textHeight =
      drawWrappedText(
        context,
        object.text,
        object.x + padding,
        object.y + padding,
        width - padding * 2,
        fontSize,
        lineHeight
      );

    object.height =
      Math.max(
        object.height || 0,
        textHeight + padding * 2
      );
  }

  if (object.type === "image") {

    if (object.image) {

      context.drawImage(
        object.image,
        object.x,
        object.y,
        object.width,
        object.height
      );
    }
  }

  context.restore();

  if (
    showSelection &&
    selectedObject === object
  ) {

    context.save();

    context.strokeStyle =
      "#0a84ff";

    context.lineWidth = 2;

    context.setLineDash([
      6,
      5
    ]);

    context.strokeRect(
      object.x,
      object.y,
      object.width,
      object.height
    );

    context.setLineDash([]);

    context.fillStyle =
      "#0a84ff";

    context.beginPath();

    context.arc(
      object.x + object.width,
      object.y + object.height,
      8,
      0,
      Math.PI * 2
    );

    context.fill();

    context.restore();
  }
}


/* =========================================================
   REDESENHAR
   ========================================================= */

function redraw() {

  ctx.clearRect(
    0,
    0,
    window.innerWidth,
    window.innerHeight
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

    drawObject(
      ctx,
      object,
      true
    );
  }
}


/* =========================================================
   OBJETO SOB O PONTEIRO
   ========================================================= */

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


/* =========================================================
   VERIFICAR ALÇA DE REDIMENSIONAMENTO
   ========================================================= */

function isResizeHandle(
  object,
  x,
  y
) {

  if (!object) {
    return false;
  }

  const handleX =
    object.x + object.width;

  const handleY =
    object.y + object.height;

  return (
    Math.hypot(
      x - handleX,
      y - handleY
    ) <= 18
  );
}


/* =========================================================
   CRIAR OBJETO TEXTO
   ========================================================= */

function createTextObject(
  text,
  x,
  y
) {

  const value =
    String(text || "").trim();

  if (!value) {
    return null;
  }

  const object = {

    type: "text",

    text: value,

    x: Math.max(
      10,
      Math.min(
        x,
        window.innerWidth - 340
      )
    ),

    y: Math.max(
      10,
      Math.min(
        y,
        window.innerHeight - 100
      )
    ),

    width:
      Math.min(
        340,
        Math.max(
          180,
          window.innerWidth - 30
        )
      ),

    height: 60,

    fontSize: 32,

    color: color || "#fff",

    padding: 10
  };

  boardObjects.push(
    object
  );

  objectRedoStack = [];

  selectedObject =
    object;

  redraw();

  return object;
}


/* =========================================================
   CRIAR OBJETO IMAGEM
   ========================================================= */

function createImageObject(
  file,
  x,
  y
) {

  if (!file) {
    return;
  }

  if (
    !file.type ||
    !file.type.startsWith("image/")
  ) {

    toast(
      "O conteúdo selecionado não é uma imagem.",
      3000
    );

    return;
  }

  const reader =
    new FileReader();

  reader.onload = event => {

    const image =
      new Image();

    image.onload = () => {

      const maxWidth =
        Math.min(
          500,
          window.innerWidth - 40
        );

      const scale =
        Math.min(
          1,
          maxWidth / image.width
        );

      const width =
        Math.max(
          80,
          image.width * scale
        );

      const height =
        Math.max(
          80,
          image.height * scale
        );

      const object = {

        type: "image",

        image,

        x: Math.max(
          10,
          Math.min(
            x,
            window.innerWidth - width - 10
          )
        ),

        y: Math.max(
          10,
          Math.min(
            y,
            window.innerHeight - height - 10
          )
        ),

        width,

        height,

        sourceName:
          file.name || "imagem"
      };

      boardObjects.push(
        object
      );

      objectRedoStack = [];

      selectedObject =
        object;

      redraw();

      toast(
        "Imagem adicionada."
      );
    };

    image.onerror = () => {

      toast(
        "Não foi possível carregar a imagem.",
        3000
      );
    };

    image.src =
      event.target.result;
  };

  reader.readAsDataURL(file);
}


/* =========================================================
   EDITAR TEXTO
   ========================================================= */

function editSelectedText() {

  if (
    !selectedObject ||
    selectedObject.type !== "text"
  ) {

    return;
  }

  const oldText =
    selectedObject.text;

  const newText =
    window.prompt(
      "Editar texto:",
      oldText
    );

  if (
    newText === null
  ) {

    return;
  }

  if (
    !newText.trim()
  ) {

    deleteSelectedObject();

    return;
  }

  selectedObject.text =
    newText;

  redraw();
}


/* =========================================================
   MENU DE COLAGEM
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
    <button type="button" data-paste-action="text">
      <span class="paste-icon">T</span>
      <span>Texto</span>
    </button>

    <button type="button" data-paste-action="image">
      <span class="paste-icon">▧</span>
      <span>Imagem</span>
    </button>

    <button type="button" data-paste-action="clipboard">
      <span class="paste-icon">⧉</span>
      <span>Conteúdo da área de transferência</span>
    </button>

    <button type="button" data-paste-action="cancel">
      <span class="paste-icon">×</span>
      <span>Cancelar</span>
    </button>
  `;

  document.body.appendChild(
    pasteMenu
  );

  pasteMenu.addEventListener(
    "pointerdown",
    event => {

      event.stopPropagation();
    }
  );

  pasteMenu.addEventListener(
    "click",
    handlePasteMenuAction
  );
}


/* =========================================================
   ABRIR MENU
   ========================================================= */

function openPasteMenu(
  clientX,
  clientY,
  canvasX,
  canvasY
) {

  createPasteMenu();

  pastePoint = {
    x: canvasX,
    y: canvasY
  };

  pasteMenu.style.display =
    "flex";

  const menuWidth =
    290;

  const menuHeight =
    220;

  let left =
    clientX;

  let top =
    clientY;

  if (
    left + menuWidth >
    window.innerWidth - 10
  ) {

    left =
      window.innerWidth -
      menuWidth -
      10;
  }

  if (
    top + menuHeight >
    window.innerHeight - 10
  ) {

    top =
      window.innerHeight -
      menuHeight -
      10;
  }

  left =
    Math.max(
      10,
      left
    );

  top =
    Math.max(
      10,
      top
    );

  pasteMenu.style.left =
    `${left}px`;

  pasteMenu.style.top =
    `${top}px`;
}


/* =========================================================
   FECHAR MENU
   ========================================================= */

function closePasteMenu() {

  if (!pasteMenu) {
    return;
  }

  pasteMenu.style.display =
    "none";
}


/* =========================================================
   AÇÕES DO MENU
   ========================================================= */

function handlePasteMenuAction(
  event
) {

  const button =
    event.target.closest(
      "[data-paste-action]"
    );

  if (!button) {
    return;
  }

  const action =
    button.dataset.pasteAction;

  const point =
    pastePoint || {
      x: 40,
      y: 100
    };

  closePasteMenu();

  if (
    action === "text"
  ) {

    const text =
      window.prompt(
        "Digite o texto:"
      );

    if (
      text &&
      text.trim()
    ) {

      createTextObject(
        text,
        point.x,
        point.y
      );
    }

    return;
  }

  if (
    action === "image"
  ) {

    openImagePicker();

    return;
  }

  if (
    action === "clipboard"
  ) {

    pasteFromClipboard(
      point.x,
      point.y
    );

    return;
  }

  if (
    action === "cancel"
  ) {

    return;
  }
}


/* =========================================================
   BOTÃO T
   ========================================================= */

function initializeTextButton() {

  const button =
    $("textToolButton");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    event => {

      event.preventDefault();
      event.stopPropagation();

      const point = {

        x:
          Math.max(
            20,
            window.innerWidth / 2 - 150
          ),

        y:
          Math.max(
            100,
            window.innerHeight / 2 - 80
          )
      };

      const text =
        window.prompt(
          "Digite o texto:"
        );

      if (
        text &&
        text.trim()
      ) {

        createTextObject(
          text,
          point.x,
          point.y
        );
      }
    }
  );
}


/* =========================================================
   SELECIONAR ARQUIVO DE IMAGEM
   ========================================================= */

function createImageInput() {

  if (imageInput) {
    return;
  }

  imageInput =
    document.createElement(
      "input"
    );

  imageInput.type =
    "file";

  imageInput.accept =
    "image/*";

  imageInput.style.display =
    "none";

  document.body.appendChild(
    imageInput
  );

  imageInput.addEventListener(
    "change",
    () => {

      const file =
        imageInput.files &&
        imageInput.files[0];

      if (file) {

        const point =
          pastePoint || {
            x: 40,
            y: 100
          };

        createImageObject(
          file,
          point.x,
          point.y
        );
      }

      imageInput.value =
        "";
    }
  );
}


function openImagePicker() {

  createImageInput();

  imageInput.click();
}


/* =========================================================
   ÁREA DE TRANSFERÊNCIA
   ========================================================= */

function createPasteHelper() {

  if (pasteHelper) {
    return;
  }

  pasteHelper =
    document.createElement(
      "div"
    );

  pasteHelper.id =
    "pasteHelper";

  pasteHelper.innerHTML = `

    <div class="paste-helper-card">

      <div class="paste-helper-title">
        Colar conteúdo
      </div>

      <div class="paste-helper-text">
        Toque no campo e escolha
        <strong>Colar</strong>.
        Também funciona para imagens copiadas.
      </div>

      <div
        id="pasteArea"
        class="paste-area"
        contenteditable="true"
        spellcheck="false"
        role="textbox"
        aria-label="Área para colar"
      ></div>

      <div class="paste-helper-actions">

        <button
          type="button"
          id="pasteCancel"
        >
          Cancelar
        </button>

        <button
          type="button"
          id="pasteDone"
        >
          Concluir
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(
    pasteHelper
  );

  pasteArea =
    $("pasteArea");

  pasteHelper
    .querySelector("#pasteCancel")
    .addEventListener(
      "click",
      closePasteHelper
    );

  pasteHelper
    .querySelector("#pasteDone")
    .addEventListener(
      "click",
      finishManualPaste
    );

  pasteArea.addEventListener(
    "paste",
    handleNativePaste
  );

  pasteHelper.addEventListener(
    "pointerdown",
    event => {

      event.stopPropagation();
    }
  );
}


/* =========================================================
   ABRIR AUXILIAR DE COLAGEM
   ========================================================= */

function openPasteHelper(
  x,
  y
) {

  createPasteHelper();

  pastePoint = {
    x,
    y
  };

  pasteHelper.style.display =
    "flex";

  pasteArea.innerHTML =
    "";

  setTimeout(
    () => {

      pasteArea.focus();

      toast(
        "Toque no campo e escolha Colar.",
        3500
      );

    },
    100
  );
}


/* =========================================================
   FECHAR AUXILIAR
   ========================================================= */

function closePasteHelper() {

  if (!pasteHelper) {
    return;
  }

  pasteHelper.style.display =
    "none";

  if (pasteArea) {
    pasteArea.innerHTML =
      "";
  }
}


/* =========================================================
   PROCESSAR PASTE NATIVO
   ========================================================= */

function handleNativePaste(
  event
) {

  event.preventDefault();

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
    items.find(
      item =>
        item.kind === "file" &&
        item.type.startsWith("image/")
    );

  if (imageItem) {

    const file =
      imageItem.getAsFile();

    if (file) {

      const point =
        pastePoint || {
          x: 40,
          y: 100
        };

      closePasteHelper();

      createImageObject(
        file,
        point.x,
        point.y
      );

      return;
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

    const point =
      pastePoint || {
        x: 40,
        y: 100
      };

    closePasteHelper();

    createTextObject(
      text,
      point.x,
      point.y
    );

    return;
  }

  const html =
    clipboard.getData(
      "text/html"
    );

  if (
    html &&
    html.trim()
  ) {

    const temporary =
      document.createElement(
        "div"
      );

    temporary.innerHTML =
      html;

    const cleanText =
      temporary.innerText ||
      temporary.textContent ||
      "";

    if (
      cleanText.trim()
    ) {

      const point =
        pastePoint || {
          x: 40,
          y: 100
        };

      closePasteHelper();

      createTextObject(
        cleanText,
        point.x,
        point.y
      );
    }
  }
}


/* =========================================================
   TENTAR CLIPBOARD API
   ========================================================= */

async function pasteFromClipboard(
  x,
  y
) {

  pastePoint = {
    x,
    y
  };

  /*
   * PRIMEIRA TENTATIVA:
   * Clipboard API moderna.
   */

  if (
    navigator.clipboard &&
    navigator.clipboard.read
  ) {

    try {

      const items =
        await navigator.clipboard.read();

      for (
        const clipboardItem of items
      ) {

        /*
         * IMAGEM
         */

        const imageType =
          clipboardItem.types.find(
            type =>
              type.startsWith(
                "image/"
              )
          );

        if (imageType) {

          const blob =
            await clipboardItem.getType(
              imageType
            );

          const file =
            new File(
              [blob],
              "imagem-colada.png",
              {
                type: blob.type
              }
            );

          createImageObject(
            file,
            x,
            y
          );

          toast(
            "Imagem colada."
          );

          return;
        }

        /*
         * TEXTO
         */

        if (
          clipboardItem.types.includes(
            "text/plain"
          )
        ) {

          const blob =
            await clipboardItem.getType(
              "text/plain"
            );

          const text =
            await blob.text();

          if (
            text.trim()
          ) {

            createTextObject(
              text,
              x,
              y
            );

            toast(
              "Texto colado."
            );

            return;
          }
        }
      }

    } catch (error) {

      console.log(
        "Clipboard.read indisponível:",
        error
      );
    }
  }


  /*
   * SEGUNDA TENTATIVA:
   * readText().
   */

  if (
    navigator.clipboard &&
    navigator.clipboard.readText
  ) {

    try {

      const text =
        await navigator.clipboard.readText();

      if (
        text &&
        text.trim()
      ) {

        createTextObject(
          text,
          x,
          y
        );

        toast(
          "Texto colado."
        );

        return;
      }

    } catch (error) {

      console.log(
        "Clipboard.readText indisponível:",
        error
      );
    }
  }


  /*
   * TERCEIRA TENTATIVA:
   * mecanismo nativo do Safari/iOS.
   */

  openPasteHelper(
    x,
    y
  );
}


/* =========================================================
   FINALIZAR COLAGEM MANUAL
   ========================================================= */

function finishManualPaste() {

  if (!pasteArea) {
    return;
  }

  const text =
    pasteArea.innerText ||
    pasteArea.textContent ||
    "";

  if (
    text.trim()
  ) {

    const point =
      pastePoint || {
        x: 40,
        y: 100
      };

    closePasteHelper();

    createTextObject(
      text,
      point.x,
      point.y
    );

    toast(
      "Texto colado."
    );

    return;
  }

  /*
   * Se não houver texto,
   * avisamos para usar o paste
   * nativo.
   */

  toast(
    "Cole o conteúdo no campo primeiro.",
    3000
  );
}


/* =========================================================
   EVENTOS DO CANVAS
   ========================================================= */

function startPointerInteraction(
  event
) {

  if (
    event.target !== canvas
  ) {

    return;
  }

  event.preventDefault();

  const point =
    getCanvasPoint(event);

  tapStart = {

    time: Date.now(),

    x: point.x,

    y: point.y
  };

  tapMoved =
    false;


  /*
   * Verifica objeto.
   */

  const object =
    getObjectAtPoint(
      point.x,
      point.y
    );

  if (
    object
  ) {

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

        x: point.x,

        y: point.y,

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

    if (
      canvas.setPointerCapture
    ) {

      try {

        canvas.setPointerCapture(
          event.pointerId
        );

      } catch (_) {}
    }

    redraw();

    return;
  }


  /*
   * Se borracha, desenha normalmente.
   */

  if (
    tool === "eraser" ||
    tool === "pen"
  ) {

    drawing =
      true;

    currentStroke = {

      tool,

      color,

      width:
        lineWidth,

      points: [
        point
      ]
    };

    redoStack =
      [];

    if (
      canvas.setPointerCapture
    ) {

      try {

        canvas.setPointerCapture(
          event.pointerId
        );

      } catch (_) {}
    }

    drawStroke(
      ctx,
      currentStroke
    );
  }
}


/* =========================================================
   MOVIMENTO
   ========================================================= */

function movePointerInteraction(
  event
) {

  const point =
    getCanvasPoint(event);

  if (
    tapStart
  ) {

    const distance =
      Math.hypot(
        point.x - tapStart.x,
        point.y - tapStart.y
      );

    if (
      distance >
      TAP_MAX_DISTANCE
    ) {

      tapMoved =
        true;
    }
  }


  /*
   * REDIMENSIONANDO
   */

  if (
    resizingObject &&
    selectedObject &&
    objectResizeStart
  ) {

    event.preventDefault();

    const deltaX =
      point.x -
      objectResizeStart.x;

    const deltaY =
      point.y -
      objectResizeStart.y;

    selectedObject.width =
      Math.max(
        60,
        objectResizeStart.width +
        deltaX
      );

    selectedObject.height =
      Math.max(
        40,
        objectResizeStart.height +
        deltaY
      );

    redraw();

    return;
  }


  /*
   * MOVENDO OBJETO
   */

  if (
    draggingObject &&
    selectedObject &&
    objectDragOffset
  ) {

    event.preventDefault();

    selectedObject.x =
      point.x -
      objectDragOffset.x;

    selectedObject.y =
      point.y -
      objectDragOffset.y;

    selectedObject.x =
      Math.max(
        0,
        Math.min(
          selectedObject.x,
          window.innerWidth -
          selectedObject.width
        )
      );

    selectedObject.y =
      Math.max(
        0,
        Math.min(
          selectedObject.y,
          window.innerHeight -
          selectedObject.height
        )
      );

    redraw();

    return;
  }


  /*
   * DESENHO
   */

  if (
    drawing &&
    currentStroke
  ) {

    event.preventDefault();

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

    if (
      distance <
      0.8
    ) {

      return;
    }

    points.push(
      point
    );

    drawStroke(
      ctx,
      currentStroke
    );
  }
}


/* =========================================================
   FINALIZAR INTERAÇÃO
   ========================================================= */

function endPointerInteraction(
  event
) {

  const point =
    getCanvasPoint(event);

  const elapsed =
    tapStart
      ? Date.now() -
        tapStart.time
      : 9999;

  const distance =
    tapStart
      ? Math.hypot(
          point.x -
          tapStart.x,
          point.y -
          tapStart.y
        )
      : 9999;

  const isQuickTap =
    elapsed <= TAP_MAX_TIME &&
    distance <= TAP_MAX_DISTANCE &&
    !tapMoved;


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

    tapStart =
      null;

    tapMoved =
      false;

    try {

      canvas.releasePointerCapture(
        event.pointerId
      );

    } catch (_) {}

    redraw();

    return;
  }


  /*
   * DESENHO
   */

  if (
    drawing
  ) {

    drawing =
      false;

    if (
      currentStroke &&
      currentStroke.points.length
    ) {

      /*
       * Se foi um toque rápido,
       * não transforma o toque
       * em um risco.
       */

      if (
        isQuickTap
      ) {

        /*
         * Remove o pequeno ponto.
         */

        currentStroke =
          null;

      } else {

        strokes.push(
          currentStroke
        );

        redoStack =
          [];
      }
    }

    currentStroke =
      null;
  }


  /*
   * TOQUE RÁPIDO:
   * abre menu.
   */

  if (
    isQuickTap &&
    tool !== "eraser"
  ) {

    openPasteMenu(
      event.clientX,
      event.clientY,
      point.x,
      point.y
    );
  }


  tapStart =
    null;

  tapMoved =
    false;

  try {

    canvas.releasePointerCapture(
      event.pointerId
    );

  } catch (_) {}

  redraw();
}


/* =========================================================
   CANCELAR POINTER
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

  tapStart =
    null;

  tapMoved =
    false;

  objectDragOffset =
    null;

  objectResizeStart =
    null;

  try {

    canvas.releasePointerCapture(
      event.pointerId
    );

  } catch (_) {}

  redraw();
}


/* =========================================================
   DUPLO CLIQUE
   ========================================================= */

function handleCanvasDoubleClick(
  event
) {

  event.preventDefault();

  const point =
    getCanvasPoint(event);

  const object =
    getObjectAtPoint(
      point.x,
      point.y
    );

  if (
    object &&
    object.type === "text"
  ) {

    selectedObject =
      object;

    editSelectedText();
  }
}


/* =========================================================
   EVENTOS CANVAS
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
    "dblclick",
    handleCanvasDoubleClick
  );
}


/* =========================================================
   CANETA / CORES
   ========================================================= */

function initializeTools() {

  document
    .querySelectorAll(".color")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            color =
              button.dataset.color;

            tool =
              "pen";

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

            if (
              $("toolName")
            ) {

              $("toolName")
                .textContent =
                "Caneta";
            }

            if (
              $("eraser")
            ) {

              $("eraser")
                .style
                .outline =
                "";
            }
          }
        );
      }
    );


  const widthInput =
    $("width");

  if (
    widthInput
  ) {

    lineWidth =
      Number(
        widthInput.value
      ) || 5;

    widthInput.addEventListener(
      "input",
      event => {

        lineWidth =
          Number(
            event.target.value
          ) || 5;
      }
    );
  }


  const eraser =
    $("eraser");

  if (
    eraser
  ) {

    eraser.addEventListener(
      "click",
      () => {

        if (
          tool === "eraser"
        ) {

          tool =
            "pen";

          if (
            $("toolName")
          ) {

            $("toolName")
              .textContent =
              "Caneta";
          }

          eraser.style.outline =
            "";

        } else {

          tool =
            "eraser";

          selectedObject =
            null;

          if (
            $("toolName")
          ) {

            $("toolName")
              .textContent =
              "Borracha";
          }

          eraser.style.outline =
            "2px solid #fff";

          redraw();
        }
      }
    );
  }
}


/* =========================================================
   UNDO
   ========================================================= */

function undo() {

  /*
   * Primeiro tenta desfazer
   * o último objeto.
   */

  if (
    boardObjects.length
  ) {

    const object =
      boardObjects[
        boardObjects.length - 1
      ];

    boardObjects.pop();

    objectRedoStack.push(
      object
    );

    selectedObject =
      null;

    redraw();

    return;
  }


  /*
   * Depois tenta desfazer
   * o último traço.
   */

  if (
    strokes.length
  ) {

    redoStack.push(
      strokes.pop()
    );

    redraw();
  }
}


/* =========================================================
   REDO
   ========================================================= */

function redo() {

  if (
    objectRedoStack.length
  ) {

    const object =
      objectRedoStack.pop();

    boardObjects.push(
      object
    );

    selectedObject =
      object;

    redraw();

    return;
  }

  if (
    redoStack.length
  ) {

    strokes.push(
      redoStack.pop()
    );

    redraw();
  }
}


/* =========================================================
   CLEAR
   ========================================================= */

function clearBoard() {

  if (
    !strokes.length &&
    !boardObjects.length
  ) {

    return;
  }

  strokes =
    [];

  redoStack =
    [];

  boardObjects =
    [];

  objectRedoStack =
    [];

  selectedObject =
    null;

  redraw();

  toast(
    "Lousa limpa."
  );
}


/* =========================================================
   BOTÕES UNDO / REDO / CLEAR
   ========================================================= */

function initializeUndoRedoButtons() {

  const undoButton =
    $("undo");

  const redoButton =
    $("redo");

  const clearButton =
    $("clear");


  if (
    undoButton
  ) {

    undoButton.addEventListener(
      "click",
      event => {

        event.preventDefault();

        undo();
      }
    );
  }


  if (
    redoButton
  ) {

    redoButton.addEventListener(
      "click",
      event => {

        event.preventDefault();

        redo();
      }
    );
  }


  if (
    clearButton
  ) {

    clearButton.addEventListener(
      "click",
      event => {

        event.preventDefault();

        clearBoard();
      }
    );
  }
}


/* =========================================================
   MENU PRINCIPAL
   ========================================================= */

function initializeMainMenus() {

  const menuButton =
    $("menuBtn");

  const menuPanel =
    $("menuPanel");

  const settings =
    $("settings");

  const tools =
    $("tools");


  function closePanels() {

    if (
      menuPanel
    ) {

      menuPanel.classList.remove(
        "open"
      );

      menuPanel.setAttribute(
        "aria-hidden",
        "true"
      );
    }

    if (
      tools
    ) {

      tools.classList.remove(
        "open"
      );

      tools.setAttribute(
        "aria-hidden",
        "true"
      );
    }
  }


  if (
    menuButton &&
    menuPanel
  ) {

    menuButton.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopPropagation();

        const opening =
          !menuPanel.classList.contains(
            "open"
          );

        closePanels();

        if (
          opening
        ) {

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
  }


  if (
    settings &&
    tools
  ) {

    settings.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopPropagation();

        const opening =
          !tools.classList.contains(
            "open"
          );

        closePanels();

        if (
          opening
        ) {

          tools.classList.add(
            "open"
          );

          tools.setAttribute(
            "aria-hidden",
            "false"
          );
        }
      }
    );
  }


  document.addEventListener(
    "pointerdown",
    event => {

      if (
        event.target.closest(
          "#menuPanel"
        ) ||
        event.target.closest(
          "#menuBtn"
        ) ||
        event.target.closest(
          "#tools"
        ) ||
        event.target.closest(
          "#settings"
        ) ||
        event.target.closest(
          "#pasteMenu"
        ) ||
        event.target.closest(
          "#pasteHelper"
        ) ||
        event.target.closest(
          "#textToolButton"
        )
      ) {

        return;
      }

      closePanels();

      closePasteMenu();
    },
    true
  );
}


/* =========================================================
   DELETE / BACKSPACE
   ========================================================= */

function deleteSelectedObject() {

  if (
    !selectedObject
  ) {

    return false;
  }

  const index =
    boardObjects.indexOf(
      selectedObject
    );

  if (
    index === -1
  ) {

    selectedObject =
      null;

    return false;
  }

  const removed =
    boardObjects.splice(
      index,
      1
    )[0];

  objectRedoStack.push(
    removed
  );

  selectedObject =
    null;

  redraw();

  return true;
}


function initializeObjectKeyboardControls() {

  document.addEventListener(
    "keydown",
    event => {

      const tag =
        event.target &&
        event.target.tagName
          ? event.target.tagName.toLowerCase()
          : "";

      if (
        tag === "input" ||
        tag === "textarea" ||
        event.target.isContentEditable
      ) {

        return;
      }

      if (
        event.key === "Delete" ||
        event.key === "Backspace"
      ) {

        if (
          selectedObject
        ) {

          event.preventDefault();

          deleteSelectedObject();
        }
      }
    }
  );
}


/* =========================================================
   CÂMERA
   ========================================================= */

async function startCamera() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    toast(
      "Este navegador não oferece acesso à câmera.",
      4000
    );

    return false;
  }


  if (
    stream
  ) {

    stream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

    stream =
      null;
  }


  try {

    stream =
      await navigator.mediaDevices
        .getUserMedia({

          video: {

            facingMode: {
              ideal:
                facingMode
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

            echoCancellation:
              true,

            noiseSuppression:
              true,

            autoGainControl:
              true
          }
        });


    video.srcObject =
      stream;

    video.classList.toggle(
      "mirror",
      facingMode === "user"
    );

    await video.play();

    startOverlay
      .classList
      .add("hidden");

    await requestWakeLock();

    toast(
      "Câmera ativada."
    );

    return true;

  } catch (error) {

    console.error(
      error
    );

    let message =
      "Não foi possível iniciar a câmera.";

    if (
      error.name ===
      "NotAllowedError"
    ) {

      message =
        "Permita câmera e microfone nas configurações do Safari.";

    } else if (
      error.name ===
      "NotFoundError"
    ) {

      message =
        "Câmera ou microfone não encontrados.";

    } else if (
      error.name ===
      "NotReadableError"
    ) {

      message =
        "A câmera está sendo usada por outro aplicativo.";

    } else if (
      error.name ===
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


/* =========================================================
   TROCAR CÂMERA
   ========================================================= */

function initializeFlipButton() {

  const flip =
    $("flip");

  if (
    !flip
  ) {

    return;
  }

  flip.addEventListener(
    "click",
    async () => {

      facingMode =
        facingMode === "user"
          ? "environment"
          : "user";

      await startCamera();
    }
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

      if (
        wakeLock &&
        wakeLock.addEventListener
      ) {

        wakeLock.addEventListener(
          "release",
          () => {

            wakeLock =
              null;
          }
        );
      }
    }

  } catch (error) {

    console.log(
      "Wake Lock indisponível."
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
   FORMATOS DE VÍDEO
   ========================================================= */

function getSupportedMimeType() {

  const formats = [

    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',

    "video/mp4;codecs=avc1",

    "video/mp4",

    "video/webm;codecs=vp8,opus",

    "video/webm"
  ];

  if (
    !window.MediaRecorder
  ) {

    return "";
  }

  return (
    formats.find(
      type =>
        MediaRecorder.isTypeSupported(
          type
        )
    ) || ""
  );
}


/* =========================================================
   VIDEO COVER
   ========================================================= */

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


/* =========================================================
   RENDERIZAÇÃO DA GRAVAÇÃO
   ========================================================= */

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
   * Câmera
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
   * Lousa
   */

  renderCtx.save();

  const scaleX =
    width /
    Math.max(
      1,
      window.innerWidth
    );

  const scaleY =
    height /
    Math.max(
      1,
      window.innerHeight
    );

  renderCtx.scale(
    scaleX,
    scaleY
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
    const object of boardObjects
  ) {

    drawObject(
      renderCtx,
      object,
      false
    );
  }

  renderCtx.restore();


  animationId =
    requestAnimationFrame(
      renderFrame
    );
}


/* =========================================================
   INICIAR GRAVAÇÃO
   ========================================================= */

async function startRecording() {

  if (
    !stream
  ) {

    toast(
      "Ative a câmera primeiro."
    );

    return;
  }

  if (
    !window.MediaRecorder ||
    !HTMLCanvasElement.prototype.captureStream
  ) {

    toast(
      "Seu navegador não suporta gravação integrada.",
      4000
    );

    return;
  }

  const mime =
    getSupportedMimeType();

  if (
    !mime
  ) {

    toast(
      "Formato de vídeo não suportado neste navegador.",
      4000
    );

    return;
  }

  chunks =
    [];

  renderCanvas =
    document.createElement(
      "canvas"
    );

  const width =
    1920;

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

  if (
    !renderCtx
  ) {

    toast(
      "Não foi possível preparar a gravação.",
      4000
    );

    return;
  }

  recording =
    true;

  renderFrame();

  const outputStream =
    renderCanvas.captureStream(
      30
    );

  const audioTrack =
    stream.getAudioTracks()[0];

  if (
    audioTrack
  ) {

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

    console.error(
      error
    );

    recording =
      false;

    if (
      animationId
    ) {

      cancelAnimationFrame(
        animationId
      );
    }

    toast(
      "Não foi possível iniciar a gravação.",
      4000
    );

    return;
  }


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


  mediaRecorder.onerror =
    event => {

      console.error(
        event
      );

      toast(
        "Erro durante a gravação.",
        4000
      );
    };


  mediaRecorder.onstop =
    exportRecording;


  mediaRecorder.start(
    1000
  );


  recordBtn.classList.add(
    "recording"
  );

  toast(
    "Gravando…"
  );
}


/* =========================================================
   PARAR GRAVAÇÃO
   ========================================================= */

function stopRecording() {

  if (
    !mediaRecorder
  ) {

    return;
  }

  recording =
    false;

  if (
    animationId
  ) {

    cancelAnimationFrame(
      animationId
    );

    animationId =
      null;
  }

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


/* =========================================================
   EXPORTAR GRAVAÇÃO
   ========================================================= */

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
      {
        type
      }
    );

  if (
    !blob.size
  ) {

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
      {
        type
      }
    );


  /*
   * Compartilhamento iOS.
   */

  if (
    navigator.canShare &&
    navigator.canShare({
      files: [file]
    })
  ) {

    try {

      await navigator.share({

        files: [
          file
        ],

        title:
          "Lousa Cam",

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


  /*
   * Download.
   */

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
    filename;

  link.rel =
    "noopener";

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  setTimeout(
    () => {

      URL.revokeObjectURL(
        url
      );

    },
    15000
  );

  toast(
    `Vídeo salvo como ${extension.toUpperCase()}.`,
    3500
  );

  cleanupRecording();
}


/* =========================================================
   LIMPAR GRAVAÇÃO
   ========================================================= */

function cleanupRecording() {

  if (
    renderCanvas
  ) {

    renderCanvas.width =
      1;

    renderCanvas.height =
      1;
  }

  renderCanvas =
    null;

  renderCtx =
    null;

  mediaRecorder =
    null;

  chunks =
    [];
}


/* =========================================================
   BOTÃO GRAVAR
   ========================================================= */

function initializeRecordButton() {

  if (
    !recordBtn
  ) {

    return;
  }

  recordBtn.addEventListener(
    "click",
    () => {

      if (
        recording
      ) {

        stopRecording();

      } else {

        startRecording();
      }
    }
  );
}


/* =========================================================
   BOTÃO START
   ========================================================= */

function initializeStartButton() {

  if (
    !startBtn
  ) {

    return;
  }

  startBtn.addEventListener(
    "click",
    async () => {

      await startCamera();
    }
  );
}


/* =========================================================
   MENU DE COLAGEM
   ========================================================= */

function initializePasteMenuOutsideClick() {

  document.addEventListener(
    "pointerdown",
    event => {

      if (
        !pasteMenu
      ) {

        return;
      }

      if (
        pasteMenu.style.display !==
        "flex"
      ) {

        return;
      }

      if (
        pasteMenu.contains(
          event.target
        )
      ) {

        return;
      }

      closePasteMenu();
    },
    true
  );
}


/* =========================================================
   RESIZE / ORIENTAÇÃO
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
        .register(
          `./sw.js?v=${BUILD_VERSION}`,
          {
            updateViaCache:
              "none"
          }
        )
        .then(
          registration => {

            registration.update()
              .catch(
                () => {}
              );
          }
        )
        .catch(
          console.error
        );
    }
  );
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function initializeApplication() {

  console.log(
    `Lousa Cam build ${BUILD_VERSION}`
  );

  initializeUndoRedoButtons();

  initializeTools();

  initializeMainMenus();

  initializeFlipButton();

  initializeRecordButton();

  initializeStartButton();

  initializeTextButton();

  initializeCanvasInteraction();

  initializeObjectKeyboardControls();

  initializePasteMenuOutsideClick();

  createImageInput();

  fitCanvas();

  setTimeout(
    () => {

      fitCanvas();

    },
    150
  );
}


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
