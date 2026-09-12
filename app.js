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
  
const textFormatToolbar =
  $("textFormatToolbar");

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

/*
  Guarda a seleção de texto para que
  ela não seja perdida ao abrir
  o painel de ferramentas.
*/
let savedTextSelection =
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
   AJUSTAR CANVAS AO VIEWPORT
   ========================================================= */
function fitCanvas() {

  const viewport =
    window.visualViewport ||
    null;


  const width =
    viewport
      ? viewport.width
      : window.innerWidth;


  const height =
    viewport
      ? viewport.height
      : window.innerHeight;


  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );


  canvas.width =
    Math.round(
      width *
      dpr
    );


  canvas.height =
    Math.round(
      height *
      dpr
    );


  canvas.style.width =
    width +
    "px";


  canvas.style.height =
    height +
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

  /*
    Enquanto um texto está sendo editado,
    ele já é mostrado pelo inlineEditor.
    Não desenha o mesmo texto no Canvas,
    evitando que as letras fiquem sobrepostas.
  */
  if (
    object.id ===
    editingObjectId
  ) {

    continue;

  }

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


  const baseFontSize =
    object.fontSize ||
    24;


  const lineHeight =
    baseFontSize * 1.15;


  const maxWidth =
    Math.max(
      40,
      object.width - 10
    );


  let currentX =
    object.x;

  let currentY =
    object.y;


  /*
    Desenha um trecho de texto
    respeitando:

    - cor
    - negrito
    - itálico
    - sublinhado
    - tamanho da fonte
  */
  function drawTextSegment(
    text,
    style
  ) {

    if (!text) {
      return;
    }


    const fontSize =
      style.fontSize ||
      baseFontSize;


    const fontWeight =
      style.fontWeight ||
      "normal";


    const fontStyle =
      style.fontStyle ||
      "normal";


    const textColor =
      style.color ||
      object.color ||
      "#fff";


    const underline =
      style.underline ||
      false;


    c.font =
      `${fontStyle} ${fontWeight} ${fontSize}px Arial, sans-serif`;


    c.textBaseline =
      "top";


    /*
      Divide mantendo os espaços.
    */
    const parts =
      text.split(
        /(\s+)/
      );


    for (
      const part
      of parts
    ) {

      if (
        part === ""
      ) {
        continue;
      }


      /*
        Quebra de linha.
      */
      if (
        part.includes("\n")
      ) {

        const lines =
          part.split("\n");


        for (
          let i = 0;
          i < lines.length;
          i++
        ) {

          if (
            i > 0
          ) {

            currentX =
              object.x;

            currentY +=
              fontSize * 1.15;

          }


          if (
            lines[i]
          ) {

            drawTextSegment(
              lines[i],
              style
            );

          }

        }

        continue;
      }


      const partWidth =
        c.measureText(
          part
        ).width;


      /*
        Se o trecho não couber,
        passa para a próxima linha.
      */
      if (
        currentX >
          object.x &&
        currentX -
          object.x +
          partWidth >
          maxWidth
      ) {

        currentX =
          object.x;

        currentY +=
          fontSize * 1.15;

      }


      c.fillStyle =
        textColor;


      c.fillText(
        part,
        currentX,
        currentY
      );


      /*
        Sublinhado.
      */
      if (
        underline &&
        part.trim() !== ""
      ) {

        const underlineY =
          currentY +
          fontSize +
          2;


        c.strokeStyle =
          textColor;


        c.lineWidth =
          Math.max(
            1,
            fontSize / 16
          );


        c.beginPath();

        c.moveTo(
          currentX,
          underlineY
        );

        c.lineTo(
          currentX +
            partWidth,
          underlineY
        );

        c.stroke();

      }


      currentX +=
        partWidth;

    }

  }


  /*
    Texto simples sem HTML.
  */
  if (
    !object.richText
  ) {

    drawTextSegment(
      String(
        object.text ||
        ""
      ),
      {
        color:
          object.color ||
          "#fff",
        fontSize:
          baseFontSize,
        fontWeight:
          "normal",
        fontStyle:
          "normal",
        underline:
          false
      }
    );


    c.restore();

    return;
  }


  /*
    Converte o HTML salvo pelo
    contenteditable em texto
    desenhável no Canvas.
  */
  const container =
    document.createElement(
      "div"
    );


  container.innerHTML =
    object.richText;


  /*
    Renderiza cada nó preservando
    as características herdadas.
  */
  function drawNode(
    node,
    inheritedStyle
  ) {

    /*
      Nó de texto.
    */
    if (
      node.nodeType ===
      Node.TEXT_NODE
    ) {

      drawTextSegment(
        node.nodeValue ||
          "",
        inheritedStyle
      );

      return;
    }


    /*
      Ignora outros tipos
      de nós.
    */
    if (
      node.nodeType !==
      Node.ELEMENT_NODE
    ) {

      return;
    }


    /*
      Copia o estilo herdado.
    */
    const style = {
      color:
        inheritedStyle.color,

      fontSize:
        inheritedStyle.fontSize,

      fontWeight:
        inheritedStyle.fontWeight,

      fontStyle:
        inheritedStyle.fontStyle,

      underline:
        inheritedStyle.underline
    };


    /*
      COR
    */
    if (
      node.style &&
      node.style.color
    ) {

      style.color =
        node.style.color;

    }


    if (
      node.tagName ===
        "FONT" &&
      node.getAttribute(
        "color"
      )
    ) {

      style.color =
        node.getAttribute(
          "color"
        );

    }


    /*
      TAMANHO
    */
    if (
      node.style &&
      node.style.fontSize
    ) {

      const size =
        parseFloat(
          node.style.fontSize
        );


      if (
        Number.isFinite(
          size
        )
      ) {

        style.fontSize =
          size;

      }

    }


    /*
      Suporte ao <font size="">
      caso o Safari produza esse
      formato.
    */
    if (
      node.tagName ===
        "FONT" &&
      node.getAttribute(
        "size"
      )
    ) {

      const htmlSize =
        Number(
          node.getAttribute(
            "size"
          )
        );


      const htmlSizes = {
        1: 10,
        2: 13,
        3: 16,
        4: 18,
        5: 24,
        6: 32,
        7: 48
      };


      if (
        htmlSizes[
          htmlSize
        ]
      ) {

        style.fontSize =
          htmlSizes[
            htmlSize
          ];

      }

    }


    /*
      NEGRITO
    */
    if (
      node.tagName ===
        "B" ||
      node.tagName ===
        "STRONG"
    ) {

      style.fontWeight =
        "bold";

    }


    if (
      node.style &&
      (
        node.style.fontWeight ===
          "bold" ||
        node.style.fontWeight ===
          "700" ||
        node.style.fontWeight ===
          "600" ||
        node.style.fontWeight ===
          "800" ||
        node.style.fontWeight ===
          "900"
      )
    ) {

      style.fontWeight =
        "bold";

    }


    /*
      ITÁLICO
    */
    if (
      node.tagName ===
        "I" ||
      node.tagName ===
        "EM"
    ) {

      style.fontStyle =
        "italic";

    }


    if (
      node.style &&
      node.style.fontStyle ===
        "italic"
    ) {

      style.fontStyle =
        "italic";

    }


    /*
      SUBLINHADO
    */
    if (
      node.tagName ===
        "U"
    ) {

      style.underline =
        true;

    }


    if (
      node.style &&
      node.style.textDecoration
        .includes(
          "underline"
        )
    ) {

      style.underline =
        true;

    }


    /*
      Quebra de linha HTML.
    */
    if (
      node.tagName ===
      "BR"
    ) {

      currentX =
        object.x;

      currentY +=
        style.fontSize *
        1.15;

      return;

    }


    /*
      Percorre os filhos
      mantendo a formatação.
    */
    for (
      const child
      of node.childNodes
    ) {

      drawNode(
        child,
        style
      );

    }

  }


  /*
    Estilo inicial.
  */
  const initialStyle = {

    color:
      object.color ||
      "#fff",

    fontSize:
      baseFontSize,

    fontWeight:
      "normal",

    fontStyle:
      "normal",

    underline:
      false

  };


  /*
    Renderiza o conteúdo
    formatado inteiro.
  */
  for (
    const child
    of container.childNodes
  ) {

    drawNode(
      child,
      initialStyle
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


function beginTextEditing(
  object,
  tapX = null,
  tapY = null
) {

  if (!object) {
    return;
  }

  finishTextEditing();

  selectedObjectId =
    object.id;

  editingObjectId =
    object.id;

  if (object.richText) {

  inlineEditor.innerHTML =
    object.richText;

} else {

  inlineEditor.innerText =
    object.text ||
    "";

}

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

textFormatToolbar.classList.add(
  "show"
);

updateEditorPosition();

requestAnimationFrame(
  () => {

    updateTextFormatToolbarPosition();

  }
);
  redraw();

  /*
    Foco direto para permitir
    abertura do teclado no Safari.
  */
  inlineEditor.focus();

  /*
    Se o toque veio de um texto existente,
    tenta posicionar o cursor exatamente
    onde o usuário tocou.
  */
  if (
    tapX !== null &&
    tapY !== null
  ) {

    requestAnimationFrame(
      () => {

        placeCaretAtPoint(
          tapX,
          tapY
        );

      }
    );

  }

}


/* =========================================================
   POSICIONAR CURSOR NO PONTO DO TOQUE
   ========================================================= */

function placeCaretAtPoint(
  x,
  y
) {

  try {

    const canvasRect =
      canvas.getBoundingClientRect();

    const clientX =
      canvasRect.left +
      x;

    const clientY =
      canvasRect.top +
      y;

    let range =
      null;

    /*
      Safari / WebKit
    */
    if (
      document.caretRangeFromPoint
    ) {

      range =
        document.caretRangeFromPoint(
          clientX,
          clientY
        );

    }

    /*
      Fallback para outros navegadores
    */
    else if (
      document.caretPositionFromPoint
    ) {

      const position =
        document.caretPositionFromPoint(
          clientX,
          clientY
        );

      if (position) {

        range =
          document.createRange();

        range.setStart(
          position.offsetNode,
          position.offset
        );

        range.collapse(
          true
        );

      }

    }

    /*
      Não encontrou uma posição válida.
    */
    if (!range) {

      return;

    }

    /*
      Garante que o cursor pertence
      ao editor de texto.
    */
    if (
      !inlineEditor.contains(
        range.startContainer
      )
    ) {

      return;

    }

    const selection =
      window.getSelection();

    selection.removeAllRanges();

    selection.addRange(
      range
    );

    inlineEditor.focus();

  } catch (error) {

    console.log(
      "Erro ao posicionar cursor:",
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


  updateTextFormatToolbarPosition();

}


/* =========================================================
   POSIÇÃO DA BARRA DE FORMATAÇÃO
   ========================================================= */

function updateTextFormatToolbarPosition() {

  if (
    !editingObjectId ||
    !textFormatToolbar
  ) {

    return;

  }


  const editorRect =
    inlineEditor.getBoundingClientRect();


  const toolbarRect =
    textFormatToolbar.getBoundingClientRect();


  const gap =
    8;


  let left =
    editorRect.left;


  let top =
    editorRect.top -
    toolbarRect.height -
    gap;


  /*
    Impede que a barra saia
    pelas laterais da tela.
  */

  left =
    Math.max(
      6,
      Math.min(
        left,
        window.innerWidth -
        toolbarRect.width -
        6
      )
    );


  /*
    Se não houver espaço acima
    da caixa, coloca abaixo.
  */

  if (top < 6) {

    top =
      editorRect.bottom +
      gap;

  }


  /*
    Impede que a barra saia
    pela parte inferior.
  */

  if (
    top +
    toolbarRect.height >
    window.innerHeight - 6
  ) {

    top =
      Math.max(
        6,
        editorRect.top -
        toolbarRect.height -
        gap
      );

  }


  textFormatToolbar.style.left =
    `${left}px`;

  textFormatToolbar.style.top =
    `${top}px`;

}

/* =========================================================
   FINALIZAR TEXTO
   ========================================================= */
function finishTextEditing() {

  if (!editingObjectId) {

    inlineEditor.classList.remove(
      "show"
    );

    textFormatToolbar.classList.remove(
      "show"
    );

    savedTextSelection =
      null;

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

    object.richText =
      inlineEditor.innerHTML;

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


  /*
    Esconde o editor e a barra.
  */

  inlineEditor.classList.remove(
    "show"
  );

  textFormatToolbar.classList.remove(
    "show"
  );


  /*
    Encerra a edição.
  */

  editingObjectId =
    null;


  /*
    Remove a seleção da caixa.
    O texto continuará normalmente
    desenhado no Canvas.
  */

  selectedObjectId =
    null;


  /*
    Limpa a seleção de texto salva.
  */

  savedTextSelection =
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

    /*
      Texto simples para manter
      compatibilidade com o objeto.
    */
    object.text =
      inlineEditor.innerText
        .replace(/\u00a0/g, " ");

    /*
      Guarda as cores aplicadas
      aos trechos selecionados.
    */
    object.richText =
      inlineEditor.innerHTML;

    /*
      Mantém o ajuste automático
      da caixa de texto.
    */
    const dimensions =
      getTextDimensions(
        object
      );

    object.width =
      dimensions.width;

    object.height =
      dimensions.height;

    inlineEditor.style.width =
      `${dimensions.width}px`;

    inlineEditor.style.height =
      `${dimensions.height}px`;

    updateEditorPosition();

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
          object,
          point.x,
          point.y
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
       TOQUE SIMPLES NO CANVAS
       =================================================== */

    if (
      pointerMode ===
      "canvas" &&
      !pointerMoved
    ) {

      /*
        Mostra somente Colar.
      */

      showCanvasPasteMenu(
        point.x,
        point.y
      );

    }


    pointerMode =
      null;


    releasePointer(
      event
    );


  }
);


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


/*
  Seleção de texto usada pelo editor.
*/
document.addEventListener(
  "selectionchange",
  () => {

    if (
      !editingObjectId
    ) {

      return;
    }

    const selection =
      window.getSelection();

    if (
      !selection ||
      selection.rangeCount === 0
    ) {

      return;
    }

    const range =
      selection.getRangeAt(0);

    if (
      inlineEditor.contains(
        range.commonAncestorContainer
      )
    ) {

      savedTextSelection =
        range.cloneRange();

    }

  }
);


/*
  Aplica uma cor somente ao
  trecho selecionado.
*/
function applyTextColor(
  selectedColor
) {

  if (
    !editingObjectId
  ) {

    return false;
  }

  if (
    !savedTextSelection
  ) {

    return false;
  }

  const selection =
    window.getSelection();

  selection.removeAllRanges();

  selection.addRange(
    savedTextSelection
  );

  /*
    Garante que existe
    realmente um trecho selecionado.
  */
  if (
    selection.isCollapsed
  ) {

    return false;
  }

  /*
    Usa o mecanismo nativo do
    navegador para colorir a seleção.
    Isso funciona especialmente bem
    no Safari/iPhone.
  */
  document.execCommand(
    "foreColor",
    false,
    selectedColor
  );

  const object =
    getObjectById(
      editingObjectId
    );

  if (object) {

    object.text =
      inlineEditor.innerText
        .replace(/\u00a0/g, " ");

    object.richText =
      inlineEditor.innerHTML;

    const dimensions =
      getTextDimensions(
        object
      );

    object.width =
      dimensions.width;

    object.height =
      dimensions.height;

    inlineEditor.style.width =
      `${dimensions.width}px`;

    inlineEditor.style.height =
      `${dimensions.height}px`;
  }

  /*
    Mantém a seleção depois
    de aplicar a cor.
  */
  savedTextSelection =
    selection
      .getRangeAt(0)
      .cloneRange();

  redraw();

  return true;
}


/*
  Cores da lousa.
*/
document
  .querySelectorAll(
    ".color"
  )
  .forEach(
    button => {

      /*
        Impede que o toque no botão
        destrua a seleção antes de
        aplicarmos a cor.
      */
      button.addEventListener(
        "pointerdown",
        event => {

          if (
            editingObjectId
          ) {

            event.preventDefault();

          }

        }
      );

      button.addEventListener(
        "click",
        () => {

          const selectedColor =
            button.dataset.color;

          /*
            Se houver texto selecionado,
            muda somente a seleção.
          */
          if (
            editingObjectId &&
            savedTextSelection
          ) {

            const changed =
              applyTextColor(
                selectedColor
              );

            if (changed) {

              return;

            }

          }

          /*
            Caso não esteja editando
            texto, mantém exatamente
            o funcionamento anterior
            da cor da caneta.
          */
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
            selectedColor;

          tool =
            "pen";

          updateToolName();

        }
      );

    }
  );

/* =========================================================
   FORMATAÇÃO DE TEXTO
   ========================================================= */

function restoreTextSelection() {

  if (
    !savedTextSelection ||
    !editingObjectId
  ) {

    return false;

  }


  const selection =
    window.getSelection();


  selection.removeAllRanges();

  selection.addRange(
    savedTextSelection
  );


  inlineEditor.focus();


  return true;

}


/* =========================================================
   SALVAR TEXTO FORMATADO
   ========================================================= */

function saveFormattedText() {

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


  object.richText =
    inlineEditor.innerHTML;


  const dimensions =
    getTextDimensions(
      object
    );


  object.width =
    dimensions.width;

  object.height =
    dimensions.height;


  inlineEditor.style.width =
    `${dimensions.width}px`;

  inlineEditor.style.height =
    `${dimensions.height}px`;


  updateEditorPosition();

  redraw();

}


/* =========================================================
   APLICAR FORMATAÇÃO
   ========================================================= */

function applyTextFormat(
  command,
  value = null
) {

  if (
    !editingObjectId ||
    !savedTextSelection
  ) {

    return false;

  }


  if (
    !restoreTextSelection()
  ) {

    return false;

  }


  const selection =
    window.getSelection();


  if (
    !selection ||
    selection.isCollapsed
  ) {

    return false;

  }


  /*
    Usa o mecanismo nativo do
    contenteditable, que é bem
    suportado pelo Safari/iPhone.
  */

  try {

    document.execCommand(
      "styleWithCSS",
      false,
      true
    );

  } catch (error) {

    console.log(
      "styleWithCSS:",
      error
    );

  }


  document.execCommand(
    command,
    false,
    value
  );


  savedTextSelection =
    selection
      .getRangeAt(0)
      .cloneRange();


  saveFormattedText();


  return true;

}


/* =========================================================
   TAMANHO DA FONTE
   ========================================================= */

function changeSelectedFontSize(
  delta
) {

  if (
    !editingObjectId ||
    !savedTextSelection
  ) {

    return false;

  }


  if (
    !restoreTextSelection()
  ) {

    return false;

  }


  const selection =
    window.getSelection();


  if (
    !selection ||
    selection.isCollapsed
  ) {

    return false;

  }


  /*
    Cria um span próprio para
    não depender do <font size>
    do navegador.
  */

  const range =
    selection.getRangeAt(0);


  const span =
    document.createElement(
      "span"
    );


  const currentSize =
    parseFloat(
      window.getComputedStyle(
        inlineEditor
      ).fontSize
    ) || 24;


  /*
    Se já existe uma formatação
    no trecho selecionado,
    tenta obter o tamanho real
    daquele trecho.
  */

  const parentElement =
    range.commonAncestorContainer
      .nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;


  const parentSize =
    parentElement
      ? parseFloat(
          window.getComputedStyle(
            parentElement
          ).fontSize
        )
      : currentSize;


  const newSize =
    Math.max(
      10,
      Math.min(
        96,
        parentSize +
        delta
      )
    );


  span.style.fontSize =
    `${newSize}px`;


  try {

    range.surroundContents(
      span
    );

  } catch (error) {

    /*
      Caso a seleção atravesse
      elementos diferentes, usa
      o comando nativo.
    */

    document.execCommand(
      "fontSize",
      false,
      "4"
    );

  }


  savedTextSelection =
    selection
      .getRangeAt(0)
      .cloneRange();


  saveFormattedText();


  return true;

}


/* =========================================================
   BOTÕES DA BARRA
   ========================================================= */

textFormatToolbar
  .querySelectorAll(
    "[data-format]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "pointerdown",
        event => {

          /*
            Evita que o toque no botão
            destrua a seleção do texto.
          */

          event.preventDefault();

        }
      );


      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          event.stopPropagation();


          const format =
            button.dataset.format;


          if (
            format ===
            "increase"
          ) {

            changeSelectedFontSize(
              2
            );

            return;

          }


          if (
            format ===
            "decrease"
          ) {

            changeSelectedFontSize(
              -2
            );

            return;

          }


          applyTextFormat(
            format
          );

        }
      );

    }
  );


/* =========================================================
   CORES DA BARRA
   ========================================================= */

textFormatToolbar
  .querySelectorAll(
    ".format-color"
  )
  .forEach(
    button => {

      button.addEventListener(
        "pointerdown",
        event => {

          event.preventDefault();

        }
      );


      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          event.stopPropagation();


          const selectedColor =
            button.dataset.color;


          applyTextColor(
            selectedColor
          );

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
