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

const pasteButton =
  $("pasteButton");

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

let lastCanvasTapTime = 0;
let lastCanvasTapX = 0;
let lastCanvasTapY = 0;

const DOUBLE_TAP_DELAY = 350;
const DOUBLE_TAP_DISTANCE = 40;

function isDoubleCanvasTap(point) {

  const now = Date.now();

  const timeDifference =
    now - lastCanvasTapTime;

  const dx =
    point.x - lastCanvasTapX;

  const dy =
    point.y - lastCanvasTapY;

  const distance =
    Math.sqrt(
      dx * dx +
      dy * dy
    );

  const doubleTap =
    timeDifference <=
      DOUBLE_TAP_DELAY &&
    distance <=
      DOUBLE_TAP_DISTANCE;

  lastCanvasTapTime =
    now;

  lastCanvasTapX =
    point.x;

  lastCanvasTapY =
    point.y;

  return doubleTap;
}

/* =========================================================
   COLAR
   ========================================================= */

let pastePosition =
  null;


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
  
  positionTextToolButton();

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
   POSIÇÃO DO BOTÃO T
   ========================================================= */

function positionTextToolButton() {

  if (!textToolButton) {
    return;
  }

  const topBar =
    $("top");

  const leftBar =
    $("left");

  const rightBar =
    $("right");

  if (
    !topBar ||
    !leftBar ||
    !rightBar
  ) {
    return;
  }

  const topRect =
    topBar.getBoundingClientRect();

  const leftRect =
    leftBar.getBoundingClientRect();

  const rightRect =
    rightBar.getBoundingClientRect();

  const size =
    38;

  const gap =
    rightRect.left -
    leftRect.right;

  /*
    Se houver espaço real entre os grupos,
    coloca o T exatamente no meio.
  */

  if (
    gap >=
    size + 8
  ) {

    textToolButton.style.left =
      `${leftRect.right + gap / 2 - size / 2}px`;

    textToolButton.style.top =
      `${topRect.top + (topRect.height - size) / 2}px`;

    return;
  }

  /*
    Em iPhones estreitos não existe espaço
    entre os grupos. Nesse caso o T fica
    centralizado abaixo da barra superior,
    sem sobrepor Limpar.
  */

  textToolButton.style.left =
    `${window.innerWidth / 2 - size / 2}px`;

  textToolButton.style.top =
    `${topRect.bottom + 8}px`;
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

  /*
    DESENHOS
  */

  for (
    const stroke
    of strokes
  ) {

    drawStroke(
      ctx,
      stroke
    );

  }

  /*
    OBJETOS
  */

  for (
    const object
    of objects
  ) {

    /*
      IMPORTANTE:
      enquanto o texto está sendo editado,
      ele NÃO é desenhado no canvas.

      O único texto visível será o
      contenteditable.
    */

    if (
      editingObjectId &&
      object.id === editingObjectId
    ) {
      continue;
    }

    drawObject(
      ctx,
      object
    );

  }

  /*
    SELEÇÃO
  */

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

  if (!object) {

    return;

  }


  c.save();


  const fontSize =
    object.fontSize ||
    24;


  const lineHeight =
    fontSize * 1.15;


  const padding =
    7;


  const boxWidth =
    Math.max(
      60,
      object.width || 60
    );


  const boxHeight =
    Math.max(
      35,
      object.height || 35
    );


  c.font =
    `${fontSize}px Arial, sans-serif`;


  c.textBaseline =
    "top";


  c.fillStyle =
    object.color ||
    "#fff";


  /*
    Área real disponível para o texto.
  */

  const maxWidth =
    Math.max(
      20,
      boxWidth -
      padding * 2
    );


  /*
    Transforma o texto em linhas
    respeitando a largura da caixa.
  */

  const sourceLines =
    String(
      object.text ||
      ""
    ).split("\n");


  const lines =
    [];


  for (
    const sourceLine
    of sourceLines
  ) {

    /*
      Linha vazia.
    */

    if (
      sourceLine.length === 0
    ) {

      lines.push("");

      continue;

    }


    const words =
      sourceLine.split(
        /\s+/
      );


    let currentLine =
      "";


    for (
      const word
      of words
    ) {

      const testLine =
        currentLine
          ? `${currentLine} ${word}`
          : word;


      const testWidth =
        c.measureText(
          testLine
        ).width;


      if (
        testWidth <=
        maxWidth
      ) {

        currentLine =
          testLine;

        continue;

      }


      /*
        Palavra ultrapassou a caixa.
        Guarda a linha anterior.
      */

      if (currentLine) {

        lines.push(
          currentLine
        );

      }


      /*
        Palavra isolada maior que
        a largura disponível.
      */

      if (
        c.measureText(
          word
        ).width >
        maxWidth
      ) {

        let partial =
          "";


        for (
          const character
          of word
        ) {

          const testPartial =
            partial +
            character;


          if (
            c.measureText(
              testPartial
            ).width <=
            maxWidth
          ) {

            partial =
              testPartial;

          } else {

            if (partial) {

              lines.push(
                partial
              );

            }


            partial =
              character;

          }

        }


        currentLine =
          partial;

      } else {

        currentLine =
          word;

      }

    }


    if (currentLine) {

      lines.push(
        currentLine
      );

    }

  }


  /*
    Clipping:
    o texto nunca ultrapassa a caixa.
  */

  c.beginPath();

  c.rect(
    object.x,
    object.y,
    boxWidth,
    boxHeight
  );

  c.clip();


  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    const y =
      object.y +
      padding +
      i * lineHeight;


    if (
      y >
      object.y +
      boxHeight
    ) {

      break;

    }


    c.fillText(

      lines[i],

      object.x +
        padding,

      y

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


  const padding =
    14;


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
        ).width +
        padding

      );

  }


  ctx.restore();


  const height =
    Math.max(

      35,

      lines.length *
      fontSize *
      1.15 +
      padding

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

  /*
    textContent evita que qualquer
    estrutura HTML seja criada dentro
    do editor.
  */

  inlineEditor.textContent =
    object.text ||
    "";

  inlineEditor.style.color =
    object.color ||
    "#fff";

  inlineEditor.style.fontSize =
    `${object.fontSize || 24}px`;

  inlineEditor.style.width =
    `${Math.max(
      60,
      object.width
    )}px`;

  inlineEditor.style.height =
    `${Math.max(
      35,
      object.height
    )}px`;

  inlineEditor.style.boxSizing =
    "border-box";

  inlineEditor.classList.add(
    "show"
  );

  updateEditorPosition();

  redraw();

  inlineEditor.focus();

  /*
    Coloca o cursor no final
    apenas quando o texto é aberto.
    Depois disso o usuário pode tocar
    em qualquer letra para reposicionar.
  */

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
  Sincroniza novamente o editor
  com o objeto antes de ocultá-lo.
*/

inlineEditor.style.width =
  `${object.width}px`;

inlineEditor.style.height =
  `${object.height}px`;

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

    if (
      !editingObjectId
    ) {
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
      inlineEditor.textContent
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

    updateEditorPosition();

    /*
      O redraw() agora preserva o texto
      somente no editor enquanto ele está
      sendo digitado.
    */

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


/* =========================================================
   MENU COLAR
   ========================================================= */

function showCanvasPasteMenu(
  x,
  y
) {

  pastePosition = {

    x:
      x,

    y:
      y

  };


  canvasMenu.classList.add(
    "open"
  );


  const rect =
    canvas.getBoundingClientRect();


  canvasMenu.style.left =
    `${x}px`;


  canvasMenu.style.top =
    `${y}px`;


  requestAnimationFrame(
    () => {

      const menuRect =
        canvasMenu.getBoundingClientRect();


      let left =
        x;


      let top =
        y;


      if (
        left +
        menuRect.width >
        rect.width - 10
      ) {

        left =
          rect.width -
          menuRect.width -
          10;

      }


      if (
        top +
        menuRect.height >
        rect.height - 10
      ) {

        top =
          rect.height -
          menuRect.height -
          10;

      }


      canvasMenu.style.left =
        `${Math.max(
          10,
          left
        )}px`;


      canvasMenu.style.top =
        `${Math.max(
          10,
          top
        )}px`;

    }
  );

}


function closeCanvasPasteMenu() {

  canvasMenu.classList.remove(
    "open"
  );

  pastePosition =
    null;

}


/* =========================================================
   COLAR
   ========================================================= */

pasteButton.addEventListener(
  "pointerdown",
  event => {

    event.stopPropagation();

  }
);


pasteButton.addEventListener(
  "click",
  async event => {

    event.preventDefault();

    event.stopPropagation();


    const position =
      pastePosition;


    /*
      Fecha antes de ler.
    */

    closeCanvasPasteMenu();


    if (!position) {

      return;

    }


    const success =
      await pasteFromClipboard(
        position.x,
        position.y
      );


    closeCanvasPasteMenu();


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


/* =========================================================
   LEITURA DO CLIPBOARD
   ========================================================= */

async function pasteFromClipboard(
  x,
  y
) {


  /* =====================================================
     IMAGEM
     ===================================================== */

  if (
    navigator.clipboard &&
    typeof navigator.clipboard.read ===
      "function"
  ) {

    try {

      const items =
        await navigator.clipboard.read();


      for (
        const item
        of items
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


          await createImageFromBlob(
            blob,
            x,
            y
          );


          return true;

        }

      }

    } catch (error) {

      console.log(
        "Erro ao ler imagem:",
        error
      );

    }

  }


  /* =====================================================
     TEXTO
     ===================================================== */

  if (
    navigator.clipboard &&
    typeof navigator.clipboard.readText ===
      "function"
  ) {

    try {

      const text =
        await navigator.clipboard.readText();


      if (
        text &&
        text.length
      ) {

        createTextObject(
          x,
          y,
          text
        );


        return true;

      }

    } catch (error) {

      console.log(
        "Erro ao ler texto:",
        error
      );

    }

  }


  return false;

}


/* =========================================================
   EVENTOS DE POINTER DA LOUSA
   ========================================================= */

canvas.addEventListener(
  "pointerdown",
  event => {

    if (
      activePointerId !== null
    ) {

      return;

    }


    activePointerId =
      event.pointerId;


    canvas.setPointerCapture(
      event.pointerId
    );


    const point =
      getPointerPosition(
        event
      );


    pointerStart = {

      x:
        point.x,

      y:
        point.y

    };


    pointerMoved =
      false;


    pointerDownTime =
      Date.now();


    const object =
      findObjectAt(
        point.x,
        point.y
      );


    /* ===================================================
       OBJETO
       =================================================== */

    if (object) {

      selectedObjectId =
        object.id;


      /*
        CANCELAR IMAGEM
      */

      if (
        object.type ===
        "image"
      ) {

        if (
          secondImageTapId ===
          object.id
        ) {

          showObjectCancel(
            object
          );

        } else {

          secondImageTapId =
            object.id;

          hideObjectCancel();

        }

      }


      /*
        REDIMENSIONAMENTO
      */

      if (
        isResizeHandle(
          object,
          point.x,
          point.y
        )
      ) {

        finishTextEditing();


        pointerMode =
          "resize";


        resizeStart = {

          x:
            point.x,

          y:
            point.y,

          width:
            object.width,

          height:
            object.height

        };


        redraw();

        return;

      }


      /*
        MOVIMENTO
      */

      pointerMode =
        "object";


      dragOffsetX =
        point.x -
        object.x;


      dragOffsetY =
        point.y -
        object.y;


      redraw();

      return;

    }


    /* ===================================================
       FORA DE OBJETO
       =================================================== */

    selectedObjectId =
      null;


    secondImageTapId =
      null;


    hideObjectCancel();


    /*
      Não começa a desenhar imediatamente.
      Primeiro aguardamos o movimento.
      Se for um toque simples, o menu Colar aparece.
    */

    pointerMode =
      "canvas";

  }
);


/* =========================================================
   POINTER MOVE
   ========================================================= */

canvas.addEventListener(
  "pointermove",
  event => {

    if (
      event.pointerId !==
      activePointerId
    ) {

      return;

    }


    const point =
      getPointerPosition(
        event
      );


    if (!pointerStart) {

      return;

    }


    const dx =
      point.x -
      pointerStart.x;


    const dy =
      point.y -
      pointerStart.y;


    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    if (
      distance > 6
    ) {

      pointerMoved =
        true;

    }


    /* ===================================================
       REDIMENSIONAR
       =================================================== */

    if (
      pointerMode ===
      "resize"
    ) {

      const object =
        getObjectById(
          selectedObjectId
        );


      if (!object) {

        return;

      }


      object.width =
        Math.max(
          50,
          resizeStart.width +
          dx
        );


      object.height =
        Math.max(
          35,
          resizeStart.height +
          dy
        );


      if (
        editingObjectId ===
        object.id
      ) {

        updateEditorPosition();

      }


      redraw();

      return;

    }


    /* ===================================================
       MOVER OBJETO
       =================================================== */

    if (
      pointerMode ===
      "object"
    ) {

      const object =
        getObjectById(
          selectedObjectId
        );


      if (!object) {

        return;

      }


      if (
        pointerMoved
      ) {

        object.x =
          point.x -
          dragOffsetX;


        object.y =
          point.y -
          dragOffsetY;


        if (
          editingObjectId ===
          object.id
        ) {

          updateEditorPosition();

        }


        updateCancelPosition();


        redraw();

      }


      return;

    }


    /* ===================================================
       DESENHAR
       =================================================== */

    if (
      pointerMode ===
      "canvas" &&
      pointerMoved
    ) {

      /*
        Se o usuário começou a arrastar
        fora de um objeto, vira desenho.
      */

      if (!drawing) {

        startDrawing(
          pointerStart
        );

      }


      continueDrawing(
        point
      );

    }

  }
);


/* =========================================================
   POINTER UP
   ========================================================= */

canvas.addEventListener(
  "pointerup",
  event => {

    if (
      event.pointerId !==
      activePointerId
    ) {

      return;

    }


    const point =
      getPointerPosition(
        event
      );


    const duration =
      Date.now() -
      pointerDownTime;


    /* ===================================================
       REDIMENSIONAR
       =================================================== */

    if (
      pointerMode ===
      "resize"
    ) {

      pointerMode =
        null;

      resizeStart =
        null;

      releasePointer(
        event
      );

      redraw();

      return;

    }


    /* ===================================================
       OBJETO
       =================================================== */

    if (
      pointerMode ===
      "object"
    ) {

      const object =
        getObjectById(
          selectedObjectId
        );


      pointerMode =
        null;


      if (
        object &&
        !pointerMoved
      ) {

        /*
          Toque rápido em texto:
          EDITAR.
        */

        if (
          object.type ===
          "text"
        ) {

          hideObjectCancel();

          beginTextEditing(
            object
          );

        }

      }


      releasePointer(
        event
      );


      redraw();

      return;

    }


    /* ===================================================
       DESENHO
       =================================================== */

    if (drawing) {

      finishDrawing();

    }


    /* ===================================================
   DOIS TOQUES RÁPIDOS NO CANVAS
   COLAR DA ÁREA DE TRANSFERÊNCIA
   =================================================== */

if (
  pointerMode === "canvas" &&
  !pointerMoved
) {

  const doubleTap = isDoubleCanvasTap(point);

  if (doubleTap) {

    closeCanvasPasteMenu();

    pasteFromClipboard(
      point.x,
      point.y
    )
    .then(success => {

      if (success) {
        toast("Conteúdo colado");
      }

    })
    .catch(error => {

      console.log(
        "Erro ao colar:",
        error
      );

    });
  }
}


/* =========================================================
   POINTER CANCEL
   ========================================================= */

canvas.addEventListener(
  "pointercancel",
  event => {

    if (
      drawing
    ) {

      finishDrawing();

    }


    pointerMode =
      null;


    resizeStart =
      null;


    releasePointer(
      event
    );

  }
);


/* =========================================================
   LIBERAR POINTER
   ========================================================= */

function releasePointer(
  event
) {

  try {

    if (
      canvas.hasPointerCapture(
        event.pointerId
      )
    ) {

      canvas.releasePointerCapture(
        event.pointerId
      );

    }

  } catch (error) {

    console.log(
      error
    );

  }


  activePointerId =
    null;

  pointerStart =
    null;

}


/* =========================================================
   DESENHO
   ========================================================= */

function startDrawing(
  point
) {

  drawing =
    true;


  currentStroke = {

    id:
      makeId("stroke"),

    createdAt:
      Date.now(),

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


  redraw();

}


function continueDrawing(
  point
) {

  if (
    !currentStroke
  ) {

    return;

  }


  currentStroke.points.push({

    x:
      point.x,

    y:
      point.y

  });


  redraw();

}


function finishDrawing() {

  drawing =
    false;

  currentStroke =
    null;

  redraw();

}


/* =========================================================
   BOTÃO T
   ========================================================= */

textToolButton.addEventListener(
  "click",
  event => {

    event.preventDefault();

    event.stopPropagation();


    finishTextEditing();

    closeCanvasPasteMenu();

    hideObjectCancel();


    const x =
      Math.max(
        30,
        window.innerWidth / 2 -
        100
      );


    const y =
      Math.max(
        100,
        window.innerHeight / 2 -
        30
      );


    const object =
      createTextObject(
        x,
        y,
        ""
      );


    /*
      Abre imediatamente o teclado.
    */

    beginTextEditing(
      object
    );

  }
);


/* =========================================================
   DESFAZER
   ========================================================= */

undoBtn.addEventListener(
  "click",
  () => {

    finishTextEditing();

    closeCanvasPasteMenu();

    hideObjectCancel();


    const allItems = [];


    for (
      const stroke
      of strokes
    ) {

      allItems.push({

        kind:
          "stroke",

        item:
          stroke,

        time:
          stroke.createdAt ||
          0

      });

    }


    for (
      const object
      of objects
    ) {

      allItems.push({

        kind:
          "object",

        item:
          object,

        time:
          object.createdAt ||
          0

      });

    }


    if (
      !allItems.length
    ) {

      return;

    }


    allItems.sort(
      (a, b) =>
        a.time - b.time
    );


    const last =
      allItems[
        allItems.length - 1
      ];


    if (
      last.kind ===
      "stroke"
    ) {

      const index =
        strokes.indexOf(
          last.item
        );


      if (index >= 0) {

        strokes.splice(
          index,
          1
        );

        redoStack.push(
          last.item
        );

      }

    } else {

      const index =
        objects.indexOf(
          last.item
        );


      if (index >= 0) {

        objects.splice(
          index,
          1
        );

        redoStack.push(
          last.item
        );

      }

    }


    selectedObjectId =
      null;


    redraw();

  }
);


/* =========================================================
   REFAZER
   ========================================================= */

redoBtn.addEventListener(
  "click",
  () => {

    finishTextEditing();


    if (
      !redoStack.length
    ) {

      return;

    }


    const item =
      redoStack.pop();


    if (
      item.points
    ) {

      strokes.push(
        item
      );

    } else {

      objects.push(
        item
      );

    }


    redraw();

  }
);


/* =========================================================
   LIMPAR TUDO
   ========================================================= */

clearBtn.addEventListener(
  "click",
  () => {

    /*
      NÃO PARA A CÂMERA.
      NÃO REINICIA A CÂMERA.
      NÃO USA confirm().
    */

    finishTextEditing();


    strokes =
      [];

    objects =
      [];

    redoStack =
      [];


    selectedObjectId =
      null;


    editingObjectId =
      null;


    secondImageTapId =
      null;


    closeCanvasPasteMenu();

    hideObjectCancel();


    redraw();


    toast(
      "Lousa limpa"
    );

  }
);


/* =========================================================
   CORES
   ========================================================= */

document
  .querySelectorAll(
    ".color"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

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


          color =
            button.dataset.color;


          tool =
            "pen";


          updateToolName();

        }
      );

    }
  );


/* =========================================================
   ESPESSURA
   ========================================================= */

widthInput.addEventListener(
  "input",
  () => {

    lineWidth =
      Number(
        widthInput.value
      );

  }
);


/* =========================================================
   BORRACHA
   ========================================================= */

eraserBtn.addEventListener(
  "click",
  () => {

    tool =
      tool === "eraser"
        ? "pen"
        : "eraser";


    updateToolName();

  }
);


function updateToolName() {

  toolName.textContent =
    tool === "eraser"
      ? "Borracha"
      : "Caneta";

}


/* =========================================================
   MENU
   ========================================================= */

menuBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();


    toolsPanel.classList.remove(
      "open"
    );


    menuPanel.classList.toggle(
      "open"
    );

  }
);


/* =========================================================
   FERRAMENTAS
   ========================================================= */

settingsBtn.addEventListener(
  "click",
  event => {

    event.stopPropagation();


    menuPanel.classList.remove(
      "open"
    );


    toolsPanel.classList.toggle(
      "open"
    );

  }
);


/* =========================================================
   FECHAR PAINÉIS
   ========================================================= */

function closePanels() {

  menuPanel.classList.remove(
    "open"
  );

  toolsPanel.classList.remove(
    "open"
  );

}


/* =========================================================
   INVERTER CÂMERA
   ========================================================= */

flipBtn.addEventListener(
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
   CÂMERA
   ========================================================= */

async function startCamera() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    toast(
      "Câmera não disponível"
    );

    return false;

  }


  try {

    const newStream =
      await navigator.mediaDevices
        .getUserMedia({

          video: {

            facingMode:
              facingMode

          },

          audio: true

        });


    const oldStream =
      stream;


    stream =
      newStream;


    video.srcObject =
      stream;


    video.muted =
      true;


    await video.play();


    if (oldStream) {

      oldStream
        .getTracks()
        .forEach(
          track =>
            track.stop()
        );

    }


    video.classList.toggle(
      "mirror",
      facingMode ===
        "user"
    );


    toast(
      "Câmera ativa"
    );


    return true;

  } catch (error) {

    console.error(
      error
    );


    /*
      Segunda tentativa sem áudio.
    */

    try {

      const newStream =
        await navigator.mediaDevices
          .getUserMedia({

            video: {

              facingMode:
                facingMode

            },

            audio: false

          });


      const oldStream =
        stream;


      stream =
        newStream;


      video.srcObject =
        stream;


      video.muted =
        true;


      await video.play();


      if (oldStream) {

        oldStream
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );

      }


      video.classList.toggle(
        "mirror",
        facingMode ===
          "user"
      );


      toast(
        "Câmera ativa — microfone indisponível"
      );


      return true;

    } catch (secondError) {

      console.error(
        secondError
      );


      toast(
        "Não foi possível acessar a câmera"
      );


      return false;

    }

  }

}


/* =========================================================
   BOTÃO INICIAR
   ========================================================= */

startBtn.addEventListener(
  "click",
  async () => {

    const success =
      await startCamera();


    if (success) {

      startOverlay.classList.add(
        "hidden"
      );

    }

  }
);


/* =========================================================
   GRAVAÇÃO
   ========================================================= */

recordBtn.addEventListener(
  "click",
  async () => {

    if (
      recording
    ) {

      stopRecording();

    } else {

      await startRecording();

    }

  }
);


/* =========================================================
   INICIAR GRAVAÇÃO
   ========================================================= */

async function startRecording() {

  if (!stream) {

    toast(
      "Inicie a câmera primeiro"
    );

    return;

  }


  try {

    /*
      Criamos um canvas de gravação.
    */

    if (!renderCanvas) {

      renderCanvas =
        document.createElement(
          "canvas"
        );

      renderCtx =
        renderCanvas.getContext(
          "2d"
        );

    }


    renderCanvas.width =
      video.videoWidth ||
      window.innerWidth;


    renderCanvas.height =
      video.videoHeight ||
      window.innerHeight;


    const canvasStream =
      renderCanvas.captureStream(
        30
      );


    const combinedStream =
      new MediaStream();


    stream
      .getVideoTracks()
      .forEach(
        track =>
          combinedStream.addTrack(
            track
          )
      );


    canvasStream
      .getVideoTracks()
      .forEach(
        track =>
          combinedStream.addTrack(
            track
          )
      );


    stream
      .getAudioTracks()
      .forEach(
        track =>
          combinedStream.addTrack(
            track
          )
      );


    let options = {};


    if (
      MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus"
      )
    ) {

      options.mimeType =
        "video/webm;codecs=vp9,opus";

    } else if (
      MediaRecorder.isTypeSupported(
        "video/webm"
      )
    ) {

      options.mimeType =
        "video/webm";

    }


    mediaRecorder =
      new MediaRecorder(
        combinedStream,
        options
      );


    chunks =
      [];


    mediaRecorder.ondataavailable =
      event => {

        if (
          event.data.size
        ) {

          chunks.push(
            event.data
          );

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

  /*
    Não grava o texto duplicado enquanto
    ele ainda está sendo editado.
  */

  if (
    editingObjectId &&
    object.id === editingObjectId
  ) {
    continue;
  }

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


objectCancel.addEventListener(
  "click",
  event => {

    event.preventDefault();

    event.stopPropagation();


    if (
      !selectedObjectId
    ) {

      return;

    }


    const index =
      objects.findIndex(
        object =>
          object.id ===
          selectedObjectId
      );


    if (
      index >= 0
    ) {

      const removed =
        objects.splice(
          index,
          1
        )[0];


      redoStack.push(
        removed
      );

    }


    selectedObjectId =
      null;


    secondImageTapId =
      null;


    hideObjectCancel();


    redraw();

  }
);


/* =========================================================
   TOQUE FORA DOS PAINÉIS
   ========================================================= */

document.addEventListener(
  "pointerdown",
  event => {

    /*
      Editor de texto.
    */

    if (
      event.target ===
      inlineEditor
    ) {

      return;

    }


    /*
      Painéis.
    */

    if (
      menuPanel.contains(
        event.target
      ) ||

      toolsPanel.contains(
        event.target
      ) ||

      canvasMenu.contains(
        event.target
      ) ||

      objectCancel.contains(
        event.target
      )
    ) {

      return;

    }


    /*
      Canvas trata seus próprios eventos.
    */

    if (
      event.target ===
      canvas
    ) {

      return;

    }


    closePanels();

    closeCanvasPasteMenu();

  }
);


/* =========================================================
   EDITOR — MOVIMENTO DO TEXTO ENQUANTO EDITA
   ========================================================= */

/*
  O usuário pode tocar no texto para editar.
  Quando terminar, a caixa desaparece e o
  objeto permanece selecionado.

  Para mover:
  tocar novamente e arrastar.
*/


/* =========================================================
   WAKE LOCK
   ========================================================= */

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
   INICIALIZAÇÃO
   ========================================================= */

fitCanvas();

updateToolName();

requestWakeLock();


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
          "./sw.js"
        )
        .then(
          registration => {

            console.log(
              "Service Worker ativo:",
              registration.scope
            );

          }
        )
        .catch(
          error => {

            console.log(
              "Service Worker:",
              error
            );

          }
        );

    }
  );

}
