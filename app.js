"use strict";


/* =========================================================
   LOUSA CAM 2.0
   Base original + texto + colar + objetos

   CORREÇÕES:
   - layout original preservado
   - T como único botão novo
   - texto diretamente na lousa
   - texto editável
   - texto movimentável
   - texto redimensionável
   - imagens movimentáveis
   - imagens redimensionáveis
   - colar texto
   - colar imagem
   - menu Colar desaparece após uso
   - limpar não interfere na câmera
   ========================================================= */


const $ = id =>
  document.getElementById(id);


/* =========================================================
   ELEMENTOS
   ========================================================= */

const video =
  $("video");

const canvas =
  $("canvas");

const ctx =
  canvas.getContext(
    "2d",
    { alpha: true }
  );


const startOverlay =
  $("startOverlay");

const startBtn =
  $("startBtn");

const statusEl =
  $("status");

const recordBtn =
  $("record");

const menuBtn =
  $("menuBtn");

const menuPanel =
  $("menuPanel");

const settingsBtn =
  $("settings");

const toolsPanel =
  $("tools");

const textToolButton =
  $("textToolButton");

const canvasMenu =
  $("canvasMenu");


const inlineEditor =
  $("inlineEditor");

const objectCancel =
  $("objectCancel");

const undoBtn =
  $("undo");

const redoBtn =
  $("redo");

const clearBtn =
  $("clear");

const flipBtn =
  $("flip");

const widthInput =
  $("width");

const eraserBtn =
  $("eraser");

const toolName =
  $("toolName");


/* =========================================================
   ESTADO DA CÂMERA
   ========================================================= */

let facingMode =
  "user";

let stream =
  null;


/* =========================================================
   ESTADO DA LOUSA
   ========================================================= */

let drawing =
  false;

let tool =
  "pen";

let color =
  "#fff";

let lineWidth =
  5;


/* =========================================================
   DESENHOS
   ========================================================= */

let strokes =
  [];

let redoStack =
  [];

let currentStroke =
  null;


/* =========================================================
   OBJETOS
   ========================================================= */

let objects =
  [];

let selectedObjectId =
  null;

let editingObjectId =
  null;


/* =========================================================
   INTERAÇÃO
   ========================================================= */

let pointerStart =
  null;

let pointerMode =
  null;

let activePointerId =
  null;

let pointerMoved =
  false;

let pointerDownTime =
  0;

let dragOffsetX =
  0;

let dragOffsetY =
  0;

let resizeStart =
  null;


/* =========================================================
   COLAR
   ========================================================= */

let pastePosition =
  null;

/* =========================================================
   DUPLO TOQUE — COLAR
   ========================================================= */

let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;

const DOUBLE_TAP_DELAY = 350;
const DOUBLE_TAP_DISTANCE = 35;

/* =========================================================
   IMAGENS
   ========================================================= */

let secondImageTapId =
  null;


/* =========================================================
   GRAVAÇÃO
   ========================================================= */

let mediaRecorder =
  null;

let chunks =
  [];

let recording =
  false;


/* =========================================================
   CANVAS DE RENDERIZAÇÃO
   ========================================================= */

let renderCanvas =
  null;

let renderCtx =
  null;

let animationId =
  null;


/* =========================================================
   WAKE LOCK
   ========================================================= */

let wakeLock =
  null;


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function toast(
  message,
  duration = 2200
) {

  statusEl.textContent =
    message;

  statusEl.classList.add(
    "show"
  );

  clearTimeout(
    toast.timer
  );

  toast.timer =
    setTimeout(() => {

      statusEl.classList.remove(
        "show"
      );

    }, duration);

}


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );

}


function makeId(
  prefix = "obj"
) {

  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );

}


function getObjectById(
  id
) {

  if (!id) {
    return null;
  }

  return (
    objects.find(
      object =>
        object.id === id
    ) ||
    null
  );

}


function getPointerPosition(
  event
) {

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
      window.innerWidth *
      dpr
    );

  canvas.height =
    Math.round(
      window.innerHeight *
      dpr
    );


  canvas.style.width =
    window.innerWidth +
    "px";

  canvas.style.height =
    window.innerHeight +
    "px";


  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );


  redraw();

  updateEditorPosition();

  updateCancelPosition();

}


window.addEventListener(
  "resize",
  fitCanvas
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
    const stroke
    of strokes
  ) {

    drawStroke(
      ctx,
      stroke
    );

  }


  for (
    const object
    of objects
  ) {

    drawObject(
      ctx,
      object
    );

  }


  if (
    selectedObjectId &&
    !editingObjectId
  ) {

    const selected =
      getObjectById(
        selectedObjectId
      );

    if (selected) {

      drawSelection(
        ctx,
        selected
      );

    }

  }

}


/* =========================================================
   DESENHAR TRAÇO
   ========================================================= */

function drawStroke(
  c,
  stroke
) {

  if (
    !stroke.points ||
    !stroke.points.length
  ) {

    return;

  }


  c.save();


  c.lineCap =
    "round";

  c.lineJoin =
    "round";


  if (
    stroke.tool ===
    "eraser"
  ) {

    c.globalCompositeOperation =
      "destination-out";

  } else {

    c.globalCompositeOperation =
      "source-over";

    c.strokeStyle =
      stroke.color;

  }


  c.lineWidth =
    stroke.width;


  c.beginPath();


  c.moveTo(
    stroke.points[0].x,
    stroke.points[0].y
  );


  for (
    let i = 1;
    i < stroke.points.length;
    i++
  ) {

    c.lineTo(
      stroke.points[i].x,
      stroke.points[i].y
    );

  }


  c.stroke();

  c.restore();

}


/* =========================================================
   DESENHAR OBJETO
   ========================================================= */

function drawObject(
  c,
  object
) {

  if (
    object.type ===
    "text"
  ) {

    drawTextObject(
      c,
      object
    );

    return;

  }


  if (
    object.type ===
    "image"
  ) {

    drawImageObject(
      c,
      object
    );

  }

}


/* =========================================================
   TEXTO
   ========================================================= */

function drawTextObject(
  c,
  object
) {

  c.save();


  const fontSize =
    object.fontSize ||
    24;


  c.font =
    `${fontSize}px Arial, sans-serif`;


  c.textBaseline =
    "top";


  c.fillStyle =
    object.color ||
    "#fff";


  const lines =
    String(
      object.text ||
      ""
    ).split("\n");


  const lineHeight =
    fontSize * 1.15;


  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    c.fillText(
      lines[i],
      object.x,
      object.y +
      i * lineHeight
    );

  }


  c.restore();

}


/* =========================================================
   IMAGEM
   ========================================================= */

function drawImageObject(
  c,
  object
) {

  if (
    !object.image
  ) {

    return;

  }


  c.save();


  c.drawImage(

    object.image,

    object.x,

    object.y,

    object.width,

    object.height

  );


  c.restore();

}


/* =========================================================
   SELEÇÃO
   ========================================================= */

function drawSelection(
  c,
  object
) {

  if (!object) {
    return;
  }


  c.save();


  c.strokeStyle =
    "rgba(255,255,255,.95)";


  c.lineWidth =
    2;


  c.setLineDash([
    6,
    5
  ]);


  c.strokeRect(

    object.x - 6,

    object.y - 6,

    object.width + 12,

    object.height + 12

  );


  c.setLineDash([]);


  /*
    Alça de redimensionamento.
  */

  c.fillStyle =
    "#fff";


  c.fillRect(

    object.x +
      object.width -
      5,

    object.y +
      object.height -
      5,

    10,

    10

  );


  c.restore();

}


/* =========================================================
   DIMENSÕES DO TEXTO
   ========================================================= */

function getTextDimensions(
  object
) {

  const fontSize =
    object.fontSize ||
    24;


  const lines =
    String(
      object.text ||
      ""
    ).split("\n");


  ctx.save();


  ctx.font =
    `${fontSize}px Arial, sans-serif`;


  let width =
    60;


  for (
    const line
    of lines
  ) {

    width =
      Math.max(
        width,
        ctx.measureText(
          line
        ).width + 20
      );

  }


  ctx.restore();


  const height =
    Math.max(
      35,
      lines.length *
      fontSize *
      1.15 +
      12
    );


  return {

    width,

    height

  };

}


/* =========================================================
   HIT TEST
   ========================================================= */

function objectContainsPoint(
  object,
  x,
  y
) {

  return (

    x >= object.x - 8 &&

    x <=
      object.x +
      object.width +
      8 &&

    y >= object.y - 8 &&

    y <=
      object.y +
      object.height +
      8

  );

}


function isResizeHandle(
  object,
  x,
  y
) {

  const size =
    24;


  return (

    x >=
      object.x +
      object.width -
      size &&

    x <=
      object.x +
      object.width +
      8 &&

    y >=
      object.y +
      object.height -
      size &&

    y <=
      object.y +
      object.height +
      8

  );

}


function findObjectAt(
  x,
  y
) {

  for (
    let i =
      objects.length - 1;
    i >= 0;
    i--
  ) {

    const object =
      objects[i];


    if (
      objectContainsPoint(
        object,
        x,
        y
      )
    ) {

      return object;

    }

  }


  return null;

}


/* =========================================================
   CRIAR TEXTO
   ========================================================= */

function createTextObject(
  x,
  y,
  text = ""
) {

  const object = {

    id:
      makeId("text"),

    type:
      "text",

    x:
      x,

    y:
      y,

    width:
      220,

    height:
      50,

    text:
      text,

    color:
      color,

    fontSize:
      24,

    createdAt:
      Date.now()

  };


  if (!text) {

    const dimensions =
      getTextDimensions(
        object
      );

    object.width =
      dimensions.width;

    object.height =
      dimensions.height;

  }


  objects.push(
    object
  );


  redoStack =
    [];


  selectedObjectId =
    object.id;


  redraw();


  return object;

}


/* =========================================================
   EDITOR DE TEXTO
   ========================================================= */

function beginTextEditing(
  object
) {

  if (!object) {
    return;
  }


  finishTextEditing();


  selectedObjectId =
    object.id;

  editingObjectId =
    object.id;


  inlineEditor.innerText =
    object.text ||
    "";


  inlineEditor.style.color =
    object.color ||
    "#fff";


  inlineEditor.style.fontSize =
    `${object.fontSize || 24}px`;


  inlineEditor.style.width =
    `${Math.max(
      80,
      object.width
    )}px`;


  inlineEditor.style.height =
    `${Math.max(
      40,
      object.height
    )}px`;


  inlineEditor.classList.add(
    "show"
  );


  updateEditorPosition();


  redraw();


  /*
    IMPORTANTE:
    focus direto para permitir
    abertura do teclado no Safari.
  */

  inlineEditor.focus();


  try {

    const selection =
      window.getSelection();

    const range =
      document.createRange();

    range.selectNodeContents(
      inlineEditor
    );

    range.collapse(
      false
    );

    selection.removeAllRanges();

    selection.addRange(
      range
    );

  } catch (error) {

    console.log(
      error
    );

  }

}


/* =========================================================
   POSIÇÃO DO EDITOR
   ========================================================= */

function updateEditorPosition() {

  if (!editingObjectId) {

    return;

  }


  const object =
    getObjectById(
      editingObjectId
    );


  if (!object) {

    return;

  }


  inlineEditor.style.left =
    `${object.x}px`;

  inlineEditor.style.top =
    `${object.y}px`;


}


/* =========================================================
   FINALIZAR TEXTO
   ========================================================= */

function finishTextEditing() {

  if (!editingObjectId) {

    inlineEditor.classList.remove(
      "show"
    );

    return;

  }


  const object =
    getObjectById(
      editingObjectId
    );


  if (object) {

    object.text =
      inlineEditor.innerText
        .replace(/\u00a0/g, " ");


    /*
      Mantém dimensões redimensionadas.
    */

    const width =
      inlineEditor.offsetWidth;


    const height =
      inlineEditor.offsetHeight;


    object.width =
      Math.max(
        60,
        width
      );


    object.height =
      Math.max(
        35,
        height
      );


    /*
      Se o texto foi criado vazio,
      calcula um tamanho inicial.
    */

    if (
      object.text.length === 0
    ) {

      object.width =
        Math.max(
          80,
          object.width
        );

    }

  }


  inlineEditor.classList.remove(
    "show"
  );


  editingObjectId =
    null;


  redraw();

}


/* =========================================================
   INPUT DO EDITOR
   ========================================================= */

inlineEditor.addEventListener(
  "input",
  () => {

    if (!editingObjectId) {

      return;

    }


    const object =
      getObjectById(
        editingObjectId
      );


    if (!object) {

      return;

    }


    object.text =
      inlineEditor.innerText
        .replace(/\u00a0/g, " ");


    object.width =
      Math.max(
        60,
        inlineEditor.offsetWidth
      );


    object.height =
      Math.max(
        35,
        inlineEditor.offsetHeight
      );


    redraw();

  }
);


/* =========================================================
   BLUR DO EDITOR
   ========================================================= */

inlineEditor.addEventListener(
  "blur",
  () => {

    setTimeout(() => {

      if (
        document.activeElement !==
        inlineEditor
      ) {

        finishTextEditing();

      }

    }, 80);

  }
);


/* =========================================================
   CRIAR IMAGEM
   ========================================================= */

function createImageFromBlob(
  blob,
  x,
  y
) {

  return new Promise(
    (resolve, reject) => {

      const url =
        URL.createObjectURL(
          blob
        );


      const image =
        new Image();


      image.onload =
        () => {

          URL.revokeObjectURL(
            url
          );


          const maxWidth =
            Math.min(
              360,
              window.innerWidth *
              0.65
            );


          const maxHeight =
            Math.min(
              300,
              window.innerHeight *
              0.45
            );


          let width =
            image.naturalWidth;


          let height =
            image.naturalHeight;


          if (
            width >
            maxWidth
          ) {

            const scale =
              maxWidth /
              width;

            width *=
              scale;

            height *=
              scale;

          }


          if (
            height >
            maxHeight
          ) {

            const scale =
              maxHeight /
              height;

            width *=
              scale;

            height *=
              scale;

          }


          const object = {

            id:
              makeId("image"),

            type:
              "image",

            x:
              x,

            y:
              y,

            width:
              width,

            height:
              height,

            image:
              image,

            createdAt:
              Date.now()

          };


          objects.push(
            object
          );


          redoStack =
            [];


          selectedObjectId =
            object.id;


          secondImageTapId =
            object.id;


          redraw();


          resolve(
            object
          );

        };


      image.onerror =
        error => {

          URL.revokeObjectURL(
            url
          );

          reject(
            error
          );

        };


      image.src =
        url;

    }
  );

}



/* ===================================================
   DUPLO TOQUE — COLAR
   =================================================== */

if (
  pointerMode ===
  "canvas" &&
  !pointerMoved &&
  duration <= 300
) {

  const now =
    Date.now();

  const distance =
    Math.sqrt(
      Math.pow(
        point.x -
        lastTapX,
        2
      ) +
      Math.pow(
        point.y -
        lastTapY,
        2
      )
    );

  const isDoubleTap =
    lastTapTime > 0 &&
    now -
      lastTapTime <=
      DOUBLE_TAP_DELAY &&
    distance <=
      DOUBLE_TAP_DISTANCE;

  if (isDoubleTap) {

    lastTapTime = 0;

    closeCanvasPasteMenu();

    pasteFromClipboard(
      point.x,
      point.y
    ).then(
      success => {

        if (success) {

          toast(
            "Conteúdo colado"
          );

        } else {

          toast(
            "Não foi possível colar"
          );

        }

      }
    );

  } else {

    lastTapTime =
      now;

    lastTapX =
      point.x;

    lastTapY =
      point.y;

  }

}

----------------------
        }

      };


    mediaRecorder.onstop =
      saveRecording;


    mediaRecorder.start();


    recording =
      true;


    recordBtn.classList.add(
      "recording"
    );


    toast(
      "Gravando",
      1500
    );


    renderRecordingFrame();

  } catch (error) {

    console.error(
      error
    );


    toast(
      "Não foi possível gravar"
    );

  }

}


/* =========================================================
   RENDER DA GRAVAÇÃO
   ========================================================= */

function renderRecordingFrame() {

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
    Câmera.
  */

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


    renderCtx.drawImage(
      video,
      0,
      0,
      width,
      height
    );


    renderCtx.restore();

  }


  /*
    Lousa.
  */

  renderCtx.save();


  const scaleX =
    width /
    window.innerWidth;


  const scaleY =
    height /
    window.innerHeight;


  renderCtx.scale(
    scaleX,
    scaleY
  );


  for (
    const stroke
    of strokes
  ) {

    drawStroke(
      renderCtx,
      stroke
    );

  }


  for (
    const object
    of objects
  ) {

    drawObject(
      renderCtx,
      object
    );

  }


  renderCtx.restore();


  animationId =
    requestAnimationFrame(
      renderRecordingFrame
    );

}


/* =========================================================
   PARAR GRAVAÇÃO
   ========================================================= */

function stopRecording() {

  recording =
    false;


  recordBtn.classList.remove(
    "recording"
  );


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
    mediaRecorder &&
    mediaRecorder.state !==
      "inactive"
  ) {

    mediaRecorder.stop();

  }


  toast(
    "Processando gravação"
  );

}


/* =========================================================
   SALVAR GRAVAÇÃO
   ========================================================= */

function saveRecording() {

  if (
    !chunks.length
  ) {

    toast(
      "Gravação vazia"
    );

    return;

  }


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
    `lousa-cam-${Date.now()}.webm`;


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
    1000
  );


  toast(
    "Gravação salva"
  );

}


/* =========================================================
   CANCELAR IMAGEM
   ========================================================= */

function showObjectCancel(
  object
) {

  if (!object) {

    return;

  }


  objectCancel.classList.add(
    "show"
  );


  updateCancelPosition();

}


function updateCancelPosition() {

  if (
    !selectedObjectId
  ) {

    return;

  }


  const object =
    getObjectById(
      selectedObjectId
    );


  if (
    !object ||
    object.type !==
      "image"
  ) {

    return;

  }


  objectCancel.style.left =
    `${clamp(
      object.x,
      10,
      window.innerWidth - 100
    )}px`;


  objectCancel.style.top =
    `${Math.max(
      10,
      object.y - 48
    )}px`;

}


function hideObjectCancel() {

  objectCancel.classList.remove(
    "show"
  );

}


