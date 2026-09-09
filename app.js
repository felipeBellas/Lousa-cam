/* =========================================================
   LOUSA CAM
   app.js
   ========================================================= */

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


/* =========================================================
   ESTADO PRINCIPAL
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

let mediaRecorder = null;
let chunks = [];
let recording = false;

let renderCanvas = null;
let renderCtx = null;
let animationId = null;

let wakeLock = null;


/* =========================================================
   OBJETOS DA LOUSA
   ========================================================= */

let boardObjects = [];

let selectedObject = null;

let objectAction = null;

let objectStartState = null;

let objectStartPoint = null;

let objectChanged = false;


/* =========================================================
   HISTÓRICO DOS OBJETOS
   ========================================================= */

let objectUndoStack = [];
let objectRedoStack = [];


/* =========================================================
   TOQUE / CLIQUE
   ========================================================= */

let pointerStart = null;

let pointerMoved = false;

let pointerActive = false;

const TAP_MAX_TIME = 280;
const TAP_MAX_DISTANCE = 10;


/* =========================================================
   MENU DE COLAR
   ========================================================= */

let pasteMenu = null;
let imageInput = null;
let textButton = null;


/* =========================================================
   MENSAGENS
   ========================================================= */

function toast(message, duration = 2200) {

  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;

  statusEl.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
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

  canvas.width =
    Math.round(
      window.innerWidth * dpr
    );

  canvas.height =
    Math.round(
      window.innerHeight * dpr
    );

  canvas.style.width =
    window.innerWidth + "px";

  canvas.style.height =
    window.innerHeight + "px";

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
   POSIÇÃO DO POINTER
   ========================================================= */

function getPointerPosition(event) {

  const rect =
    canvas.getBoundingClientRect();

  return {
    x:
      event.clientX -
      rect.left,

    y:
      event.clientY -
      rect.top
  };
}


/* =========================================================
   DESENHO
   ========================================================= */

function redraw(
  targetCtx = ctx,
  includeSelection = true
) {

  const width =
    window.innerWidth;

  const height =
    window.innerHeight;

  targetCtx.clearRect(
    0,
    0,
    width,
    height
  );

  for (const stroke of strokes) {

    drawStroke(
      targetCtx,
      stroke
    );
  }

  for (const object of boardObjects) {

    drawBoardObject(
      targetCtx,
      object
    );
  }

  if (
    includeSelection &&
    selectedObject &&
    boardObjects.includes(
      selectedObject
    )
  ) {

    drawObjectBox(
      targetCtx,
      selectedObject
    );
  }
}


/* =========================================================
   DESENHAR TRAÇO
   ========================================================= */

function drawStroke(c, stroke) {

  if (
    !stroke ||
    !stroke.points ||
    !stroke.points.length
  ) {
    return;
  }

  c.save();

  c.lineCap = "round";

  c.lineJoin = "round";

  c.lineWidth =
    stroke.width;

  c.globalCompositeOperation =
    stroke.tool === "eraser"
      ? "destination-out"
      : "source-over";

  c.strokeStyle =
    stroke.color;

  c.beginPath();

  const first =
    stroke.points[0];

  c.moveTo(
    first.x,
    first.y
  );

  for (
    let i = 1;
    i < stroke.points.length;
    i++
  ) {

    const point =
      stroke.points[i];

    c.lineTo(
      point.x,
      point.y
    );
  }

  if (
    stroke.points.length === 1
  ) {

    c.lineTo(
      first.x + 0.01,
      first.y + 0.01
    );
  }

  c.stroke();

  c.restore();
}


/* =========================================================
   OBJETOS
   ========================================================= */

function drawBoardObject(
  targetCtx,
  object
) {

  if (
    !object ||
    !object.type
  ) {
    return;
  }

  if (
    object.type === "text"
  ) {

    drawTextObject(
      targetCtx,
      object
    );

    return;
  }

  if (
    object.type === "image"
  ) {

    drawImageObject(
      targetCtx,
      object
    );
  }
}


/* =========================================================
   TEXTO
   ========================================================= */

function drawTextObject(
  targetCtx,
  object
) {

  targetCtx.save();

  targetCtx.font =
    `${object.fontSize}px ${object.fontFamily}`;

  targetCtx.fillStyle =
    object.color;

  targetCtx.textBaseline =
    "top";

  targetCtx.textAlign =
    "left";

  const lineHeight =
    object.fontSize * 1.25;

  const words =
    object.text.split(/\s+/);

  let line = "";

  let lines = [];

  for (
    const word of words
  ) {

    const testLine =
      line
        ? line + " " + word
        : word;

    const metrics =
      targetCtx.measureText(
        testLine
      );

    if (
      metrics.width >
        object.width &&
      line
    ) {

      lines.push(line);

      line = word;

    } else {

      line = testLine;
    }
  }

  if (line) {
    lines.push(line);
  }

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    targetCtx.fillText(
      lines[i],
      object.x,
      object.y +
        i * lineHeight
    );
  }

  targetCtx.restore();
}


/* =========================================================
   IMAGEM
   ========================================================= */

function drawImageObject(
  targetCtx,
  object
) {

  if (
    !object.image ||
    !object.image.complete
  ) {
    return;
  }

  targetCtx.save();

  targetCtx.drawImage(
    object.image,
    object.x,
    object.y,
    object.width,
    object.height
  );

  targetCtx.restore();
}


/* =========================================================
   LIMITES DO OBJETO
   ========================================================= */

function getObjectBounds(object) {

  return {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height
  };
}


/* =========================================================
   CAIXA DO OBJETO SELECIONADO
   ========================================================= */

function drawObjectBox(
  targetCtx,
  object
) {

  const bounds =
    getObjectBounds(object);

  targetCtx.save();

  targetCtx.strokeStyle =
    "rgba(255,255,255,0.9)";

  targetCtx.lineWidth = 2;

  targetCtx.setLineDash([
    6,
    5
  ]);

  targetCtx.strokeRect(
    bounds.x - 4,
    bounds.y - 4,
    bounds.width + 8,
    bounds.height + 8
  );

  targetCtx.setLineDash([]);

  const handleSize = 12;

  targetCtx.fillStyle =
    "#ffffff";

  targetCtx.fillRect(
    bounds.x +
      bounds.width -
      handleSize / 2,

    bounds.y +
      bounds.height -
      handleSize / 2,

    handleSize,
    handleSize
  );

  targetCtx.restore();
}


/* =========================================================
   HIT TEST
   ========================================================= */

function pointInsideObject(
  point,
  object
) {

  return (
    point.x >= object.x &&
    point.x <=
      object.x +
      object.width &&
    point.y >= object.y &&
    point.y <=
      object.y +
      object.height
  );
}


/* =========================================================
   RESIZE HANDLE
   ========================================================= */

function pointOnResizeHandle(
  point,
  object
) {

  const handleSize = 24;

  const hx =
    object.x +
    object.width;

  const hy =
    object.y +
    object.height;

  return (
    Math.abs(
      point.x - hx
    ) <= handleSize &&
    Math.abs(
      point.y - hy
    ) <= handleSize
  );
}


/* =========================================================
   ENCONTRAR OBJETO
   ========================================================= */

function getObjectAtPoint(point) {

  for (
    let i =
      boardObjects.length - 1;
    i >= 0;
    i--
  ) {

    const object =
      boardObjects[i];

    if (
      pointInsideObject(
        point,
        object
      )
    ) {

      return object;
    }
  }

  return null;
}


/* =========================================================
   ADICIONAR OBJETO
   ========================================================= */

function addBoardObject(
  object
) {

  boardObjects.push(
    object
  );

  selectedObject =
    object;

  objectUndoStack.push({
    type: "add",
    object
  });

  objectRedoStack = [];

  redraw();
}


/* =========================================================
   CRIAR TEXTO
   ========================================================= */

function createTextObject(
  text,
  position
) {

  if (
    !text ||
    !text.trim()
  ) {
    return;
  }

  const object = {

    type: "text",

    id:
      "text-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2),

    text:
      text.trim(),

    x:
      position.x,

    y:
      position.y,

    width: 300,

    height: 80,

    fontSize: 32,

    fontFamily:
      "Arial, sans-serif",

    color:
      color === "transparent"
        ? "#ffffff"
        : color
  };

  addBoardObject(
    object
  );

  toast(
    "Texto adicionado"
  );
}


/* =========================================================
   CRIAR IMAGEM
   ========================================================= */

function createImageObject(
  image,
  position
) {

  if (!image) {
    return;
  }

  const maxWidth = 500;

  const maxHeight = 400;

  let width =
    image.naturalWidth ||
    image.width ||
    300;

  let height =
    image.naturalHeight ||
    image.height ||
    200;

  const scale =
    Math.min(
      1,
      maxWidth / width,
      maxHeight / height
    );

  width *= scale;

  height *= scale;

  const object = {

    type: "image",

    id:
      "image-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2),

    image,

    x:
      position.x,

    y:
      position.y,

    width,

    height
  };

  addBoardObject(
    object
  );

  toast(
    "Imagem adicionada"
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
    "lousaPasteMenu";

  pasteMenu.style.position =
    "fixed";

  pasteMenu.style.zIndex =
    "99999";

  pasteMenu.style.display =
    "none";

  pasteMenu.style.minWidth =
    "230px";

  pasteMenu.style.background =
    "rgba(20,20,20,.97)";

  pasteMenu.style.border =
    "1px solid rgba(255,255,255,.25)";

  pasteMenu.style.borderRadius =
    "14px";

  pasteMenu.style.padding =
    "8px";

  pasteMenu.style.boxShadow =
    "0 10px 30px rgba(0,0,0,.45)";

  document.body.appendChild(
    pasteMenu
  );

  const items = [

    {
      label: "Texto",
      action: requestText
    },

    {
      label: "Imagem",
      action: requestImage
    },

    {
      label:
        "Conteúdo da área de transferência",
      action:
        pasteClipboard
    },

    {
      label: "Cancelar",
      action:
        closePasteMenu
    }
  ];

  for (
    const item of items
  ) {

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.textContent =
      item.label;

    button.style.display =
      "block";

    button.style.width =
      "100%";

    button.style.padding =
      "12px 14px";

    button.style.margin =
      "2px 0";

    button.style.border =
      "0";

    button.style.borderRadius =
      "10px";

    button.style.background =
      "transparent";

    button.style.color =
      "#fff";

    button.style.fontSize =
      "15px";

    button.style.textAlign =
      "left";

    button.style.cursor =
      "pointer";

    button.addEventListener(
      "pointerdown",
      event => {
        event.stopPropagation();
      }
    );

    button.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        item.action();
      }
    );

    button.addEventListener(
      "mouseenter",
      () => {
        button.style.background =
          "rgba(255,255,255,.12)";
      }
    );

    button.addEventListener(
      "mouseleave",
      () => {
        button.style.background =
          "transparent";
      }
    );

    pasteMenu.appendChild(
      button
    );
  }
}


/* =========================================================
   ABRIR MENU
   ========================================================= */

let pastePosition = {
  x: 100,
  y: 100
};

function openPasteMenu(
  point
) {

  createPasteMenu();

  pastePosition = {
    x: clamp(
      point.x,
      20,
      window.innerWidth - 320
    ),

    y: clamp(
      point.y,
      20,
      window.innerHeight - 230
    )
  };

  pasteMenu.style.left =
    pastePosition.x + "px";

  pasteMenu.style.top =
    pastePosition.y + "px";

  pasteMenu.style.display =
    "block";
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
   BOTÃO T TEXTO
   ========================================================= */

function createTextToolbarButton() {

  if (
    textButton ||
    !$("settings")
  ) {
    return;
  }

  textButton =
    document.createElement(
      "button"
    );

  textButton.id =
    "textToolButton";

  textButton.type =
    "button";

  textButton.textContent =
    "T";

  textButton.title =
    "Texto";

  /*
     Usa a mesma classe visual
     do botão de configurações.
  */

  textButton.className =
    $("settings").className;

  textButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      openPasteMenu({
        x:
          window.innerWidth / 2 - 110,

        y:
          window.innerHeight / 2 - 100
      });
    }
  );

  $("settings")
    .parentElement
    .insertBefore(
      textButton,
      $("settings")
    );
}


/* =========================================================
   INPUT DE IMAGEM
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

  imageInput.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      const url =
        URL.createObjectURL(
          file
        );

      const image =
        new Image();

      image.onload =
        () => {

          createImageObject(
            image,
            pastePosition
          );

          URL.revokeObjectURL(
            url
          );

          imageInput.value =
            "";
        };

      image.src = url;
    }
  );

  document.body.appendChild(
    imageInput
  );
}


/* =========================================================
   TEXTO DIGITADO
   ========================================================= */

function requestText() {

  closePasteMenu();

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

  createTextObject(
    text,
    pastePosition
  );
}


/* =========================================================
   IMAGEM
   ========================================================= */

function requestImage() {

  closePasteMenu();

  createImageInput();

  imageInput.click();
}


/* =========================================================
   ÁREA DE TRANSFERÊNCIA
   ========================================================= */

async function pasteClipboard() {

  closePasteMenu();

  try {

    if (
      navigator.clipboard &&
      navigator.clipboard.read
    ) {

      const items =
        await navigator.clipboard.read();

      for (
        const item of items
      ) {

        /*
           Primeiro tenta imagem.
        */

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

          const url =
            URL.createObjectURL(
              blob
            );

          const image =
            new Image();

          image.onload =
            () => {

              createImageObject(
                image,
                pastePosition
              );

              URL.revokeObjectURL(
                url
              );
            };

          image.src = url;

          return;
        }

        /*
           Depois tenta texto.
        */

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
            text.trim()
          ) {

            createTextObject(
              text,
              pastePosition
            );

            return;
          }
        }
      }
    }

    /*
       Fallback para texto.
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

        createTextObject(
          text,
          pastePosition
        );

        return;
      }
    }

    toast(
      "Não foi possível acessar a área de transferência.",
      3500
    );

  } catch (error) {

    console.error(
      "Clipboard:",
      error
    );

    toast(
      "Permita o acesso à área de transferência.",
      3500
    );
  }
}


/* =========================================================
   EDITAR TEXTO
   ========================================================= */

function editSelectedText() {

  if (
    !selectedObject ||
    selectedObject.type !==
      "text"
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
    return;
  }

  const oldState = {
    text: oldText,
    width:
      selectedObject.width,
    height:
      selectedObject.height
  };

  selectedObject.text =
    newText.trim();

  const newState = {
    text:
      selectedObject.text,
    width:
      selectedObject.width,
    height:
      selectedObject.height
  };

  objectUndoStack.push({
    type: "modify",
    object:
      selectedObject,
    before:
      oldState,
    after:
      newState
  });

  objectRedoStack = [];

  redraw();
}


/* =========================================================
   MOVIMENTO / REDIMENSIONAMENTO
   ========================================================= */

function startObjectInteraction(
  event,
  object,
  point
) {

  selectedObject =
    object;

  pointerActive = true;

  pointerMoved = false;

  objectStartPoint = {
    x: point.x,
    y: point.y
  };

  objectStartState = {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height
  };

  objectChanged = false;

  if (
    pointOnResizeHandle(
      point,
      object
    )
  ) {

    objectAction =
      "resize";

  } else {

    objectAction =
      "move";
  }

  canvas.setPointerCapture?.(
    event.pointerId
  );

  redraw();
}


function moveObjectInteraction(
  event
) {

  if (
    !pointerActive ||
    !selectedObject ||
    !objectAction
  ) {
    return;
  }

  const point =
    getPointerPosition(event);

  const dx =
    point.x -
    objectStartPoint.x;

  const dy =
    point.y -
    objectStartPoint.y;

  if (
    Math.abs(dx) >
      TAP_MAX_DISTANCE ||
    Math.abs(dy) >
      TAP_MAX_DISTANCE
  ) {

    pointerMoved = true;
  }

  if (
    objectAction ===
    "move"
  ) {

    selectedObject.x =
      clamp(
        objectStartState.x + dx,
        0,
        Math.max(
          0,
          window.innerWidth -
            selectedObject.width
        )
      );

    selectedObject.y =
      clamp(
        objectStartState.y + dy,
        0,
        Math.max(
          0,
          window.innerHeight -
            selectedObject.height
        )
      );

  } else if (
    objectAction ===
    "resize"
  ) {

    const minWidth =
      selectedObject.type ===
        "text"
        ? 80
        : 60;

    const minHeight =
      selectedObject.type ===
        "text"
        ? 40
        : 60;

    selectedObject.width =
      Math.max(
        minWidth,
        objectStartState.width +
          dx
      );

    selectedObject.height =
      Math.max(
        minHeight,
        objectStartState.height +
          dy
      );
  }

  objectChanged = true;

  redraw();
}


function finishObjectInteraction() {

  if (
    !pointerActive
  ) {
    return;
  }

  if (
    selectedObject &&
    objectChanged
  ) {

    objectUndoStack.push({
      type: "modify",
      object:
        selectedObject,

      before:
        objectStartState,

      after: {
        x:
          selectedObject.x,

        y:
          selectedObject.y,

        width:
          selectedObject.width,

        height:
          selectedObject.height
      }
    });

    objectRedoStack = [];
  }

  pointerActive = false;

  objectAction = null;

  objectStartState = null;

  objectStartPoint = null;

  objectChanged = false;

  redraw();
}


/* =========================================================
   DESENHO COM POINTER
   ========================================================= */

function beginDraw(event) {

  if (
    event.target !== canvas
  ) {
    return;
  }

  event.preventDefault();

  const point =
    getPointerPosition(event);

  /*
     Primeiro verifica se tocou
     em algum objeto.
  */

  const object =
    getObjectAtPoint(point);

  if (object) {

    startObjectInteraction(
      event,
      object,
      point
    );

    return;
  }

  /*
     Se for um toque simples,
     abriremos o menu no final.
  */

  pointerActive = true;

  pointerMoved = false;

  pointerStart = {
    point,
    time: Date.now()
  };

  /*
     Borracha e caneta
     continuam funcionando normalmente.
  */

  drawing = true;

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
    !drawing ||
    !currentStroke
  ) {
    return;
  }

  event.preventDefault();

  const point =
    getPointerPosition(event);

  if (
    pointerStart &&
    Math.hypot(
      point.x -
        pointerStart.point.x,

      point.y -
        pointerStart.point.y
    ) >
      TAP_MAX_DISTANCE
  ) {

    pointerMoved = true;
  }

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
    distance < 0.8
  ) {
    return;
  }

  points.push(point);

  drawStroke(
    ctx,
    currentStroke
  );
}


function endDraw(event) {

  if (
    pointerActive &&
    selectedObject &&
    objectAction
  ) {

    finishObjectInteraction();

    return;
  }

  if (!drawing) {
    return;
  }

  drawing = false;

  const elapsed =
    pointerStart
      ? Date.now() -
        pointerStart.time
      : 9999;

  /*
     Toque rápido sem movimento:
     não cria traço e abre menu.
  */

  if (
    elapsed <= TAP_MAX_TIME &&
    !pointerMoved
  ) {

    currentStroke = null;

    redraw();

    openPasteMenu(
      pointerStart.point
    );

    pointerStart = null;

    pointerActive = false;

    return;
  }

  /*
     Desenho normal.
  */

  if (
    currentStroke &&
    currentStroke.points.length
  ) {

    strokes.push(
      currentStroke
    );
  }

  currentStroke = null;

  pointerStart = null;

  pointerActive = false;

  redraw();
}


/* =========================================================
   CANCELAR POINTER
   ========================================================= */

function cancelPointer() {

  drawing = false;

  currentStroke = null;

  pointerStart = null;

  pointerActive = false;

  objectAction = null;

  objectStartState = null;

  objectStartPoint = null;

  redraw();
}


/* =========================================================
   POINTER EVENTS DO CANVAS
   ========================================================= */

canvas.addEventListener(
  "pointerdown",
  beginDraw,
  {
    passive: false
  }
);

canvas.addEventListener(
  "pointermove",
  event => {

    if (
      selectedObject &&
      objectAction
    ) {

      event.preventDefault();

      moveObjectInteraction(
        event
      );

      return;
    }

    moveDraw(event);
  },
  {
    passive: false
  }
);

canvas.addEventListener(
  "pointerup",
  endDraw
);

canvas.addEventListener(
  "pointercancel",
  cancelPointer
);


/* =========================================================
   DUPLO CLIQUE NO TEXTO
   ========================================================= */

canvas.addEventListener(
  "dblclick",
  event => {

    const point =
      getPointerPosition(event);

    const object =
      getObjectAtPoint(point);

    if (
      object &&
      object.type ===
        "text"
    ) {

      selectedObject =
        object;

      editSelectedText();
    }
  }
);


/* =========================================================
   DESSELECIONAR
   ========================================================= */

canvas.addEventListener(
  "contextmenu",
  event => {
    event.preventDefault();
  }
);


/* =========================================================
   CLIQUE FORA DO MENU
   ========================================================= */

document.addEventListener(
  "pointerdown",
  event => {

    if (
      pasteMenu &&
      pasteMenu.style.display !==
        "none" &&
      !pasteMenu.contains(
        event.target
      ) &&
      event.target !==
        canvas
    ) {

      closePasteMenu();
    }
  }
);


/* =========================================================
   TECLADO
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
        "Escape"
    ) {

      closePasteMenu();

      selectedObject =
        null;

      redraw();

      return;
    }

    if (
      event.key ===
        "Delete" ||
      event.key ===
        "Backspace"
    ) {

      if (
        selectedObject &&
        !(
          event.target instanceof
          HTMLInputElement
        ) &&
        !(
          event.target instanceof
          HTMLTextAreaElement
        )
      ) {

        deleteSelectedObject();

        event.preventDefault();
      }
    }
  }
);


/* =========================================================
   APAGAR OBJETO
   ========================================================= */

function deleteSelectedObject() {

  if (
    !selectedObject
  ) {
    return;
  }

  const index =
    boardObjects.indexOf(
      selectedObject
    );

  if (
    index === -1
  ) {
    return;
  }

  const object =
    selectedObject;

  boardObjects.splice(
    index,
    1
  );

  objectUndoStack.push({
    type: "delete",
    object,
    index
  });

  objectRedoStack = [];

  selectedObject = null;

  redraw();
}


/* =========================================================
   DESFAZER
   ========================================================= */

function undo() {

  /*
     Se houver uma ação de objeto
     posterior ao último desenho,
     desfazemos o objeto.
  */

  if (
    objectUndoStack.length
  ) {

    const action =
      objectUndoStack.pop();

    if (
      action.type ===
      "add"
    ) {

      const index =
        boardObjects.indexOf(
          action.object
        );

      if (
        index !== -1
      ) {

        boardObjects.splice(
          index,
          1
        );
      }

      if (
        selectedObject ===
        action.object
      ) {

        selectedObject =
          null;
      }

    } else if (
      action.type ===
      "delete"
    ) {

      boardObjects.splice(
        action.index,
        0,
        action.object
      );

    } else if (
      action.type ===
      "modify"
    ) {

      Object.assign(
        action.object,
        action.before
      );
    }

    objectRedoStack.push(
      action
    );

    redraw();

    return;
  }

  /*
     Caso não existam objetos
     para desfazer, desfaz o
     último traço.
  */

  if (
    !strokes.length
  ) {
    return;
  }

  redoStack.push(
    strokes.pop()
  );

  redraw();
}


/* =========================================================
   REFAZER
   ========================================================= */

function redo() {

  if (
    objectRedoStack.length
  ) {

    const action =
      objectRedoStack.pop();

    if (
      action.type ===
      "add"
    ) {

      if (
        !boardObjects.includes(
          action.object
        )
      ) {

        boardObjects.push(
          action.object
        );
      }

    } else if (
      action.type ===
      "delete"
    ) {

      const index =
        boardObjects.indexOf(
          action.object
        );

      if (
        index !== -1
      ) {

        boardObjects.splice(
          index,
          1
        );
      }

    } else if (
      action.type ===
      "modify"
    ) {

      Object.assign(
        action.object,
        action.after
      );
    }

    selectedObject =
      action.object;

    objectUndoStack.push(
      action
    );

    redraw();

    return;
  }

  if (
    !redoStack.length
  ) {
    return;
  }

  strokes.push(
    redoStack.pop()
  );

  redraw();
}


/* =========================================================
   BOTÃO DESFAZER
   ========================================================= */

$("undo").addEventListener(
  "click",
  undo
);


/* =========================================================
   BOTÃO REFAZER
   ========================================================= */

$("redo").addEventListener(
  "click",
  redo
);


/* =========================================================
   LIMPAR
   ========================================================= */

$("clear").addEventListener(
  "click",
  () => {

    if (
      !strokes.length &&
      !boardObjects.length
    ) {
      return;
    }

    strokes = [];

    redoStack = [];

    boardObjects = [];

    objectUndoStack = [];

    objectRedoStack = [];

    selectedObject = null;

    redraw();
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
      () => {

        color =
          button.dataset.color;

        tool = "pen";

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

        $("toolName").textContent =
          "Caneta";

        $("eraser").style.outline =
          "";
      }
    );
  });


/* =========================================================
   ESPESSURA
   ========================================================= */

$("width").addEventListener(
  "input",
  event => {

    lineWidth =
      Number(
        event.target.value
      );
  }
);


/* =========================================================
   BORRACHA
   ========================================================= */

$("eraser").addEventListener(
  "click",
  () => {

    if (
      tool === "eraser"
    ) {

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
   MENU DE FERRAMENTAS
   ========================================================= */

$("settings").addEventListener(
  "click",
  event => {

    event.stopPropagation();

    $("tools")
      .classList
      .toggle("open");
  }
);


/* =========================================================
   CÂMERA
   ========================================================= */

async function startCamera() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices
      .getUserMedia
  ) {

    toast(
      "Este navegador não oferece acesso à câmera.",
      4000
    );

    return false;
  }

  if (stream) {

    stream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );
  }

  try {

    stream =
      await navigator
        .mediaDevices
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
      facingMode ===
        "user"
    );

    await video.play();

    startOverlay
      .classList
      .add("hidden");

    await requestWakeLock();

    toast(
      "Câmera ativada"
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
        "Permita câmera e microfone nas configurações do navegador.";
    }

    if (
      error.name ===
      "NotFoundError"
    ) {

      message =
        "Câmera ou microfone não encontrados.";
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

$("flip").addEventListener(
  "click",
  async () => {

    facingMode =
      facingMode ===
        "user"
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
      "wakeLock" in
      navigator
    ) {

      wakeLock =
        await navigator
          .wakeLock
          .request(
            "screen"
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

  return formats.find(
    type =>
      MediaRecorder
        .isTypeSupported(
          type
        )
  ) || "";
}


/* =========================================================
   VÍDEO COVER
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
    (width -
      drawWidth) /
    2;

  const y =
    (height -
      drawHeight) /
    2;

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
     Câmera
  */

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

  drawVideoCover(
    renderCtx,
    video,
    width,
    height
  );

  renderCtx.restore();

  /*
     Lousa
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
    const object of boardObjects
  ) {

    drawBoardObject(
      renderCtx,
      object
    );
  }

  /*
     Não grava a caixa de
     seleção dos objetos.
  */

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
    Math.round(
      width / aspect
    );

  renderCtx =
    renderCanvas.getContext(
      "2d"
    );

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

  recordBtn
    .classList
    .add(
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

  if (!mediaRecorder) {
    return;
  }

  recording = false;

  cancelAnimationFrame(
    animationId
  );

  if (
    mediaRecorder.state !==
    "inactive"
  ) {

    mediaRecorder.stop();
  }

  recordBtn
    .classList
    .remove(
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
    type.includes(
      "webm"
    )
      ? "webm"
      : "mp4";

  const blob =
    new Blob(
      chunks,
      {
        type
      }
    );

  if (!blob.size) {

    toast(
      "A gravação ficou vazia.",
      4000
    );

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
     Compartilhamento no celular.
  */

  if (
    navigator.canShare &&
    navigator.canShare({
      files: [file]
    })
  ) {

    try {

      await navigator.share({

        files: [file],

        title:
          "Lousa Cam",

        text:
          "Vídeo gravado no Lousa Cam"
      });

      toast(
        "Vídeo compartilhado."
      );

      return;

    } catch (error) {

      if (
        error.name ===
        "AbortError"
      ) {

        toast(
          "Compartilhamento cancelado."
        );

        return;
      }
    }
  }

  /*
     Download normal.
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
   BOTÃO INICIAR CÂMERA
   ========================================================= */

startBtn.addEventListener(
  "click",
  startCamera
);


/* =========================================================
   INICIALIZAÇÃO DA FUNÇÃO TEXTO / COLAR
   ========================================================= */

function initializePasteFeature() {

  createPasteMenu();

  createImageInput();

  createTextToolbarButton();

  /*
     Impede arrastar imagens
     acidentalmente para a página.
  */

  document.addEventListener(
    "dragstart",
    event => {

      if (
        event.target instanceof
        HTMLImageElement
      ) {

        event.preventDefault();
      }
    }
  );
}


/* =========================================================
   REDIMENSIONAMENTO
   ========================================================= */

window.addEventListener(
  "resize",
  fitCanvas
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
  "serviceWorker" in
  navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "./sw.js"
        )
        .catch(
          console.error
        );
    }
  );
}


/* =========================================================
   INICIALIZAÇÃO FINAL
   ========================================================= */

function initializeApplication() {

  fitCanvas();

  initializePasteFeature();

  /*
     Garante que o estado
     inicial seja Caneta.
  */

  tool = "pen";

  if ($("toolName")) {

    $("toolName").textContent =
      "Caneta";
  }
}


/* =========================================================
   DOM READY
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApplication,
    {
      once: true
    }
  );

} else {

  initializeApplication();
}
