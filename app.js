/* =========================================================
   LOUSA CAM 2.0
   Versão corrigida
   ========================================================= */

const camera = document.getElementById("camera");
const board = document.getElementById("board");
const ctx = board.getContext("2d");

const menuBtn = document.getElementById("menuBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const flipBtn = document.getElementById("flipBtn");
const settingsBtn = document.getElementById("settingsBtn");
const recordButton = document.getElementById("recordButton");

const textToolButton = document.getElementById("textToolButton");

const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");

const statusEl = document.getElementById("status");

const toolsPanel = document.getElementById("toolsPanel");
const menuPanel = document.getElementById("menuPanel");

const menuCloseTools = document.getElementById("menuCloseTools");

const colorInput = document.getElementById("colorInput");
const widthInput = document.getElementById("widthInput");
const eraserBtn = document.getElementById("eraserBtn");
const toolName = document.getElementById("toolName");

const canvasMenu = document.getElementById("canvasMenu");
const pasteButton = document.getElementById("pasteButton");

const inlineEditor = document.getElementById("inlineEditor");

const imageCancelButton =
  document.getElementById("imageCancelButton");


/* =========================================================
   ESTADO
   ========================================================= */

let stream = null;

let facingMode = "user";

let color = "#ffffff";
let lineWidth = 5;

let tool = "pen";

let strokes = [];
let redoStrokes = [];

let boardObjects = [];
let redoObjects = [];

let drawing = false;
let currentStroke = null;

let selectedObject = null;

let draggingObject = false;
let resizingObject = false;

let dragOffsetX = 0;
let dragOffsetY = 0;

let resizeStart = null;

let secondTapImage = null;

let pendingPastePosition = null;

let editingObject = null;

let recording = false;
let mediaRecorder = null;
let recordedChunks = [];

let animationFrame = null;


/* =========================================================
   CANVAS
   ========================================================= */

function resizeCanvas() {

  const rect = board.getBoundingClientRect();

  const dpr = window.devicePixelRatio || 1;

  board.width = Math.round(rect.width * dpr);
  board.height = Math.round(rect.height * dpr);

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


window.addEventListener("resize", resizeCanvas);

window.addEventListener("orientationchange", () => {

  setTimeout(resizeCanvas, 200);

});


/* =========================================================
   COORDENADAS
   ========================================================= */

function getCanvasPoint(event) {

  const rect = board.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(text) {

  if (!statusEl) return;

  statusEl.textContent = text;

}


/* =========================================================
   REDESENHAR
   ========================================================= */

function redraw() {

  const rect = board.getBoundingClientRect();

  ctx.clearRect(
    0,
    0,
    rect.width,
    rect.height
  );

  drawStrokes();

  drawObjects();

}


/* =========================================================
   DESENHAR TRAÇOS
   ========================================================= */

function drawStrokes() {

  for (const stroke of strokes) {

    if (!stroke.points || stroke.points.length < 2) {
      continue;
    }

    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "eraser") {

      ctx.globalCompositeOperation =
        "destination-out";

    } else {

      ctx.globalCompositeOperation =
        "source-over";

      ctx.strokeStyle = stroke.color;

    }

    ctx.lineWidth = stroke.width;

    ctx.beginPath();

    ctx.moveTo(
      stroke.points[0].x,
      stroke.points[0].y
    );

    for (let i = 1; i < stroke.points.length; i++) {

      ctx.lineTo(
        stroke.points[i].x,
        stroke.points[i].y
      );

    }

    ctx.stroke();

    ctx.restore();

  }

}


/* =========================================================
   OBJETOS
   ========================================================= */

function drawObjects() {

  for (const obj of boardObjects) {

    if (obj.type === "text") {

      drawTextObject(obj);

    }

    if (obj.type === "image") {

      drawImageObject(obj);

    }

  }

}


/* =========================================================
   TEXTO
   ========================================================= */

function drawTextObject(obj) {

  ctx.save();

  ctx.font =
    `${obj.fontSize || 24}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;

  ctx.textBaseline = "top";

  ctx.fillStyle =
    obj.color || "#ffffff";

  const lines =
    String(obj.text || "").split("\n");

  const lineHeight =
    (obj.fontSize || 24) * 1.25;

  for (let i = 0; i < lines.length; i++) {

    ctx.fillText(
      lines[i],
      obj.x,
      obj.y + i * lineHeight
    );

  }

  ctx.restore();

}


/* =========================================================
   IMAGEM
   ========================================================= */

function drawImageObject(obj) {

  if (!obj.image) return;

  ctx.save();

  ctx.drawImage(
    obj.image,
    obj.x,
    obj.y,
    obj.width,
    obj.height
  );

  if (selectedObject === obj) {

    ctx.strokeStyle =
      "rgba(255,255,255,.9)";

    ctx.lineWidth = 2;

    ctx.setLineDash([6, 5]);

    ctx.strokeRect(
      obj.x,
      obj.y,
      obj.width,
      obj.height
    );

    ctx.setLineDash([]);

    drawResizeHandle(obj);

  }

  ctx.restore();

}


/* =========================================================
   SELEÇÃO
   ========================================================= */

function drawSelection(obj) {

  if (!obj) return;

  ctx.save();

  ctx.strokeStyle =
    "rgba(255,255,255,.9)";

  ctx.lineWidth = 2;

  ctx.setLineDash([6, 5]);

  ctx.strokeRect(
    obj.x - 5,
    obj.y - 5,
    obj.width + 10,
    obj.height + 10
  );

  ctx.setLineDash([]);

  drawResizeHandle(obj);

  ctx.restore();

}


/* =========================================================
   HANDLE DE REDIMENSIONAMENTO
   ========================================================= */

function drawResizeHandle(obj) {

  const size = 10;

  ctx.save();

  ctx.fillStyle =
    "rgba(255,255,255,.95)";

  ctx.fillRect(
    obj.x + obj.width - size / 2,
    obj.y + obj.height - size / 2,
    size,
    size
  );

  ctx.restore();

}


/* =========================================================
   HIT TEST
   ========================================================= */

function objectContainsPoint(obj, x, y) {

  return (
    x >= obj.x &&
    x <= obj.x + obj.width &&
    y >= obj.y &&
    y <= obj.y + obj.height
  );

}


function isResizeHandle(obj, x, y) {

  const size = 20;

  return (
    x >= obj.x + obj.width - size &&
    x <= obj.x + obj.width + 5 &&
    y >= obj.y + obj.height - size &&
    y <= obj.y + obj.height + 5
  );

}


function findObjectAt(x, y) {

  for (let i = boardObjects.length - 1; i >= 0; i--) {

    const obj = boardObjects[i];

    if (objectContainsPoint(obj, x, y)) {
      return obj;
    }

  }

  return null;

}


/* =========================================================
   PAINÉIS
   ========================================================= */

function closePanels() {

  toolsPanel.classList.remove("open");
  menuPanel.classList.remove("open");

  closeCanvasPasteMenu();

}


/* =========================================================
   MENU
   ========================================================= */

menuBtn.addEventListener("click", (event) => {

  event.stopPropagation();

  toolsPanel.classList.remove("open");

  menuPanel.classList.toggle("open");

});


menuCloseTools.addEventListener("click", () => {

  menuPanel.classList.remove("open");

});


/* =========================================================
   FERRAMENTAS
   ========================================================= */

settingsBtn.addEventListener("click", (event) => {

  event.stopPropagation();

  menuPanel.classList.remove("open");

  toolsPanel.classList.toggle("open");

});


colorInput.addEventListener("input", () => {

  color = colorInput.value;

  tool = "pen";

  updateToolName();

});


widthInput.addEventListener("input", () => {

  lineWidth =
    Number(widthInput.value);

});


eraserBtn.addEventListener("click", () => {

  tool =
    tool === "eraser"
      ? "pen"
      : "eraser";

  updateToolName();

});


function updateToolName() {

  toolName.textContent =
    tool === "eraser"
      ? "Borra"
      : "Caneta";

}


/* =========================================================
   BOTÃO T
   ========================================================= */

textToolButton.addEventListener("click", (event) => {

  event.stopPropagation();

  closeCanvasPasteMenu();

  finishTextEditing();

  /*
    Cria o texto no centro da tela.
    Depois o usuário pode mover e redimensionar.
  */

  const rect =
    board.getBoundingClientRect();

  const x =
    Math.max(
      20,
      rect.width / 2 - 80
    );

  const y =
    Math.max(
      90,
      rect.height / 2 - 30
    );

  const obj = createTextObject(
    x,
    y,
    ""
  );

  selectedObject = obj;

  beginTextEditing(obj);

});


/* =========================================================
   CRIAR TEXTO
   ========================================================= */

function createTextObject(x, y, text) {

  const obj = {

    type: "text",

    x,
    y,

    width: 180,
    height: 45,

    text: text || "",

    color,

    fontSize: 24

  };

  boardObjects.push(obj);

  redoObjects = [];

  redraw();

  return obj;

}


/* =========================================================
   EDITAR TEXTO
   ========================================================= */

function beginTextEditing(obj) {

  if (!obj) return;

  finishTextEditing();

  editingObject = obj;

  selectedObject = obj;

  positionInlineEditor(obj);

  inlineEditor.value =
    obj.text || "";

  inlineEditor.classList.add("editing");

  /*
    Foco IMEDIATO.
    Isso é importante principalmente no Safari/iPhone.
  */

  inlineEditor.focus();

  /*
    Coloca o cursor no final.
  */

  try {

    const length =
      inlineEditor.value.length;

    inlineEditor.setSelectionRange(
      length,
      length
    );

  } catch (error) {
    // ignora
  }

  redraw();

}


function positionInlineEditor(obj) {

  inlineEditor.style.left =
    `${obj.x}px`;

  inlineEditor.style.top =
    `${obj.y}px`;

  inlineEditor.style.width =
    `${Math.max(80, obj.width)}px`;

  inlineEditor.style.height =
    `${Math.max(40, obj.height)}px`;

  inlineEditor.style.fontSize =
    `${obj.fontSize}px`;

}


function finishTextEditing() {

  if (!editingObject) {

    inlineEditor.classList.remove("editing");

    return;

  }

  editingObject.text =
    inlineEditor.value;

  editingObject.width =
    Math.max(
      80,
      inlineEditor.offsetWidth
    );

  editingObject.height =
    Math.max(
      40,
      inlineEditor.offsetHeight
    );

  inlineEditor.classList.remove("editing");

  editingObject = null;

  redraw();

}


/* =========================================================
   DIGITAÇÃO
   ========================================================= */

inlineEditor.addEventListener("input", () => {

  if (!editingObject) return;

  editingObject.text =
    inlineEditor.value;

  editingObject.width =
    Math.max(
      80,
      inlineEditor.offsetWidth
    );

  editingObject.height =
    Math.max(
      40,
      inlineEditor.offsetHeight
    );

  redraw();

});


inlineEditor.addEventListener("blur", () => {

  /*
    Pequeno atraso para permitir que o
    Safari processe corretamente a troca
    de foco.
  */

  setTimeout(() => {

    if (
      document.activeElement !==
      inlineEditor
    ) {

      finishTextEditing();

    }

  }, 100);

});


/* =========================================================
   CANVAS — POINTER DOWN
   ========================================================= */

board.addEventListener("pointerdown", async (event) => {

  event.preventDefault();

  closePanels();

  const point =
    getCanvasPoint(event);

  /*
    1. Verifica objeto existente.
  */

  const obj =
    findObjectAt(
      point.x,
      point.y
    );

  if (obj) {

    selectedObject = obj;

    /*
      Se for texto, abre edição.
    */

    if (obj.type === "text") {

      beginTextEditing(obj);

      return;

    }

    /*
      Se for imagem:
      segundo toque mostra Cancelar.
    */

    if (obj.type === "image") {

      if (secondTapImage === obj) {

        showImageCancelButton(obj);

      } else {

        secondTapImage = obj;

        hideImageCancelButton();

      }

    }

    /*
      Redimensionamento.
    */

    if (
      isResizeHandle(
        obj,
        point.x,
        point.y
      )
    ) {

      resizingObject = obj;

      resizeStart = {

        x: point.x,
        y: point.y,

        width: obj.width,
        height: obj.height

      };

      return;

    }

    /*
      Movimento.
    */

    draggingObject = obj;

    dragOffsetX =
      point.x - obj.x;

    dragOffsetY =
      point.y - obj.y;

    redraw();

    return;

  }

  /*
    Se não clicou em objeto:
    fechar seleção.
  */

  selectedObject = null;
  secondTapImage = null;
  hideImageCancelButton();

  /*
    Antes de começar a desenhar,
    verificamos se há algo na área de
    transferência.

    Se houver, aparece somente "Colar".
  */

  const hasClipboard =
    await clipboardHasContent();

  /*
    O usuário pediu que tocar no canvas
    não abra uma caixa de texto.

    Só mostramos o menu se realmente
    houver conteúdo disponível.
  */

  if (hasClipboard) {

    pendingPastePosition = point;

    showCanvasPasteMenu(
      point.x,
      point.y
    );

    return;

  }

  /*
    Não há conteúdo para colar:
    começa desenho normal.
  */

  startDrawing(point);

});


/* =========================================================
   POINTER MOVE
   ========================================================= */

board.addEventListener("pointermove", (event) => {

  event.preventDefault();

  const point =
    getCanvasPoint(event);

  if (resizingObject) {

    const dx =
      point.x - resizeStart.x;

    const dy =
      point.y - resizeStart.y;

    resizingObject.width =
      Math.max(
        40,
        resizeStart.width + dx
      );

    resizingObject.height =
      Math.max(
        30,
        resizeStart.height + dy
      );

    if (resizingObject.type === "text") {

      positionInlineEditor(
        resizingObject
      );

    }

    redraw();

    return;

  }

  if (draggingObject) {

    draggingObject.x =
      point.x - dragOffsetX;

    draggingObject.y =
      point.y - dragOffsetY;

    if (
      draggingObject ===
      editingObject
    ) {

      positionInlineEditor(
        draggingObject
      );

    }

    redraw();

    return;

  }

  if (drawing) {

    continueDrawing(point);

  }

});


/* =========================================================
   POINTER UP
   ========================================================= */

board.addEventListener("pointerup", () => {

  if (drawing) {

    finishDrawing();

  }

  draggingObject = false;

  resizingObject = false;

  resizeStart = null;

});


board.addEventListener("pointercancel", () => {

  if (drawing) {

    finishDrawing();

  }

  draggingObject = false;

  resizingObject = false;

});


/* =========================================================
   DESENHO
   ========================================================= */

function startDrawing(point) {

  drawing = true;

  currentStroke = {

    tool,

    color,

    width: lineWidth,

    points: [
      {
        x: point.x,
        y: point.y
      }
    ]

  };

  strokes.push(currentStroke);

  redoStrokes = [];

}


function continueDrawing(point) {

  if (!currentStroke) return;

  currentStroke.points.push({

    x: point.x,
    y: point.y

  });

  redraw();

}


function finishDrawing() {

  drawing = false;

  currentStroke = null;

  redraw();

}


/* =========================================================
   DESFAZER
   ========================================================= */

undoBtn.addEventListener("click", () => {

  finishTextEditing();

  closePanels();

  if (
    strokes.length === 0 &&
    boardObjects.length === 0
  ) {

    return;

  }

  /*
    Desfaz o último elemento considerando
    traços e objetos.
  */

  const lastStroke =
    strokes.length
      ? strokes[strokes.length - 1]
      : null;

  const lastObject =
    boardObjects.length
      ? boardObjects[boardObjects.length - 1]
      : null;

  if (
    lastStroke &&
    !lastObject
  ) {

    redoStrokes.push(
      strokes.pop()
    );

  } else if (
    lastObject &&
    !lastStroke
  ) {

    redoObjects.push(
      boardObjects.pop()
    );

  } else {

    /*
      Quando ambos existem, usa a ordem
      registrada pelo timestamp.
    */

    if (
      (lastObject.createdAt || 0) >
      (lastStroke.createdAt || 0)
    ) {

      redoObjects.push(
        boardObjects.pop()
      );

    } else {

      redoStrokes.push(
        strokes.pop()
      );

    }

  }

  redraw();

});


/* =========================================================
   REFAZER
   ========================================================= */

redoBtn.addEventListener("click", () => {

  finishTextEditing();

  closePanels();

  if (redoObjects.length) {

    boardObjects.push(
      redoObjects.pop()
    );

    redraw();

    return;

  }

  if (redoStrokes.length) {

    strokes.push(
      redoStrokes.pop()
    );

    redraw();

  }

});


/* =========================================================
   LIMPAR TUDO
   ========================================================= */

clearBtn.addEventListener("click", () => {

  /*
    IMPORTANTE:
    não toca na câmera.
    não chama stopCamera().
    não chama startCamera().
    não pede confirmação.
  */

  finishTextEditing();

  strokes = [];

  redoStrokes = [];

  boardObjects = [];

  redoObjects = [];

  selectedObject = null;

  secondTapImage = null;

  pendingPastePosition = null;

  hideImageCancelButton();

  closeCanvasPasteMenu();

  redraw();

  setStatus("Lousa limpa");

});


/* =========================================================
   INVERTER CÂMERA
   ========================================================= */

flipBtn.addEventListener("click", async () => {

  facingMode =
    facingMode === "user"
      ? "environment"
      : "user";

  await restartCamera();

});


/* =========================================================
   CÂMERA
   ========================================================= */

async function startCamera() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    setStatus(
      "Câmera não disponível neste navegador"
    );

    return false;

  }

  try {

    const newStream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          facingMode
        },

        audio: true

      });

    /*
      Só substitui o stream anterior
      depois que o novo funcionar.
    */

    const oldStream = stream;

    stream = newStream;

    camera.srcObject = stream;

    camera.muted = true;

    await camera.play();

    if (oldStream) {

      oldStream
        .getTracks()
        .forEach(track => track.stop());

    }

    camera.classList.toggle(
      "mirror",
      facingMode === "user"
    );

    setStatus("Câmera ativa");

    return true;

  } catch (error) {

    console.error(
      "Erro ao iniciar câmera:",
      error
    );

    /*
      Algumas combinações de navegador
      podem rejeitar áudio junto com vídeo.
      Tentamos somente vídeo.
    */

    try {

      const newStream =
        await navigator.mediaDevices.getUserMedia({

          video: {
            facingMode
          },

          audio: false

        });

      const oldStream = stream;

      stream = newStream;

      camera.srcObject = stream;

      camera.muted = true;

      await camera.play();

      if (oldStream) {

        oldStream
          .getTracks()
          .forEach(track => track.stop());

      }

      camera.classList.toggle(
        "mirror",
        facingMode === "user"
      );

      setStatus(
        "Câmera ativa — microfone indisponível"
      );

      return true;

    } catch (secondError) {

      console.error(
        "Erro câmera:",
        secondError
      );

      setStatus(
        "Não foi possível acessar a câmera"
      );

      return false;

    }

  }

}


async function restartCamera() {

  /*
    Não desligamos a câmera antes de
    conseguir uma nova.
  */

  await startCamera();

}


/* =========================================================
   INICIAR
   ========================================================= */

startButton.addEventListener("click", async () => {

  const success =
    await startCamera();

  if (success) {

    startOverlay.style.display =
      "none";

  }

});


/* =========================================================
   GRAVAÇÃO
   ========================================================= */

recordButton.addEventListener("click", async () => {

  if (recording) {

    stopRecording();

  } else {

    await startRecording();

  }

});


async function startRecording() {

  if (!stream) {

    setStatus(
      "Inicie a câmera primeiro"
    );

    return;

  }

  try {

    const canvasStream =
      board.captureStream(30);

    const combinedStream =
      new MediaStream();

    stream
      .getVideoTracks()
      .forEach(track => {

        combinedStream.addTrack(track);

      });

    canvasStream
      .getVideoTracks()
      .forEach(track => {

        combinedStream.addTrack(track);

      });

    stream
      .getAudioTracks()
      .forEach(track => {

        combinedStream.addTrack(track);

      });

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

    recordedChunks = [];

    mediaRecorder.ondataavailable =
      event => {

        if (event.data.size > 0) {

          recordedChunks.push(
            event.data
          );

        }

      };

    mediaRecorder.onstop =
      saveRecording;

    mediaRecorder.start();

    recording = true;

    recordButton.classList.add(
      "recording"
    );

    setStatus("Gravando");

  } catch (error) {

    console.error(
      "Erro na gravação:",
      error
    );

    setStatus(
      "Não foi possível iniciar a gravação"
    );

  }

}


function stopRecording() {

  if (
    mediaRecorder &&
    mediaRecorder.state !== "inactive"
  ) {

    mediaRecorder.stop();

  }

  recording = false;

  recordButton.classList.remove(
    "recording"
  );

  setStatus("Processando gravação...");

}


function saveRecording() {

  if (!recordedChunks.length) {

    setStatus("Gravação vazia");

    return;

  }

  const blob =
    new Blob(
      recordedChunks,
      {
        type:
          mediaRecorder.mimeType ||
          "video/webm"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    `lousa-cam-${Date.now()}.webm`;

  document.body.appendChild(a);

  a.click();

  a.remove();

  setTimeout(() => {

    URL.revokeObjectURL(url);

  }, 1000);

  setStatus("Gravação salva");

}


/* =========================================================
   MENU COLAR
   ========================================================= */

function showCanvasPasteMenu(x, y) {

  canvasMenu.classList.add("open");

  const rect =
    board.getBoundingClientRect();

  const menuRect =
    canvasMenu.getBoundingClientRect();

  let left = x;
  let top = y;

  if (
    left + menuRect.width >
    rect.width - 10
  ) {

    left =
      rect.width -
      menuRect.width -
      10;

  }

  if (
    top + menuRect.height >
    rect.height - 10
  ) {

    top =
      rect.height -
      menuRect.height -
      10;

  }

  canvasMenu.style.left =
    `${Math.max(10, left)}px`;

  canvasMenu.style.top =
    `${Math.max(10, top)}px`;

}


function closeCanvasPasteMenu() {

  canvasMenu.classList.remove("open");

  pendingPastePosition = null;

}


/* =========================================================
   VERIFICAR ÁREA DE TRANSFERÊNCIA
   ========================================================= */

async function clipboardHasContent() {

  /*
    Primeira tentativa:
    ler tipos do clipboard.
  */

  if (
    navigator.clipboard &&
    navigator.clipboard.read
  ) {

    try {

      const items =
        await navigator.clipboard.read();

      if (items && items.length) {

        for (const item of items) {

          if (
            item.types &&
            item.types.length
          ) {

            /*
              Evita considerar formatos vazios
              ou internos.
            */

            for (const type of item.types) {

              if (
                type === "text/plain" ||
                type === "text/html" ||
                type.startsWith("image/")
              ) {

                return true;

              }

            }

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
    Segunda tentativa:
    texto.
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
        text.trim().length > 0
      ) {

        return true;

      }

    } catch (error) {

      console.log(
        "Clipboard.readText indisponível:",
        error
      );

    }

  }


  /*
    Se o navegador não permite consultar
    o clipboard, NÃO mostramos o botão
    Colar.

    Isso evita a caixa/menu aparecendo
    quando não há conteúdo verificável.
  */

  return false;

}


/* =========================================================
   COLAR
   ========================================================= */

pasteButton.addEventListener("click", async (event) => {

  event.stopPropagation();

  /*
    Guardamos a posição antes de fechar
    o menu.
  */

  const position =
    pendingPastePosition;

  /*
    Fecha imediatamente o menu.
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

  /*
    Garante novamente que o menu
    não fique aberto.
  */

  closeCanvasPasteMenu();

  if (success) {

    setStatus("Conteúdo colado");

  }

});


/* =========================================================
   COLAR DA ÁREA DE TRANSFERÊNCIA
   ========================================================= */

async function pasteFromClipboard(x, y) {

  /*
    IMAGENS
  */

  if (
    navigator.clipboard &&
    navigator.clipboard.read
  ) {

    try {

      const items =
        await navigator.clipboard.read();

      for (const item of items) {

        const imageType =
          item.types.find(
            type =>
              type.startsWith("image/")
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
        "Não foi possível ler imagem:",
        error
      );

    }

  }


  /*
    TEXTO
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
        text.trim().length > 0
      ) {

        const obj =
          createTextObject(
            x,
            y,
            text
          );

        selectedObject = obj;

        redraw();

        return true;

      }

    } catch (error) {

      console.log(
        "Não foi possível ler texto:",
        error
      );

    }

  }


  /*
    No Safari, caso o navegador bloqueie
    o acesso programático ao clipboard,
    não criamos caixa de texto.

    O navegador pode mostrar o menu nativo
    de "Colar" por conta própria.
  */

  return false;

}


/* =========================================================
   CRIAR IMAGEM
   ========================================================= */

function createImageFromBlob(
  blob,
  x,
  y
) {

  return new Promise((resolve, reject) => {

    const url =
      URL.createObjectURL(blob);

    const image =
      new Image();

    image.onload = () => {

      URL.revokeObjectURL(url);

      const maxWidth = 320;
      const maxHeight = 260;

      let width =
        image.naturalWidth;

      let height =
        image.naturalHeight;

      if (width > maxWidth) {

        const scale =
          maxWidth / width;

        width *= scale;
        height *= scale;

      }

      if (height > maxHeight) {

        const scale =
          maxHeight / height;

        width *= scale;
        height *= scale;

      }

      const obj = {

        type: "image",

        x,
        y,

        width,
        height,

        image

      };

      boardObjects.push(obj);

      redoObjects = [];

      selectedObject = obj;

      secondTapImage = obj;

      redraw();

      resolve(obj);

    };

    image.onerror = error => {

      URL.revokeObjectURL(url);

      reject(error);

    };

    image.src = url;

  });

}


/* =========================================================
   CANCELAR IMAGEM
   ========================================================= */

function showImageCancelButton(obj) {

  if (!obj) return;

  imageCancelButton.classList.add(
    "open"
  );

  imageCancelButton.style.left =
    `${obj.x}px`;

  imageCancelButton.style.top =
    `${Math.max(10, obj.y - 45)}px`;

}


function hideImageCancelButton() {

  imageCancelButton.classList.remove(
    "open"
  );

}


imageCancelButton.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    if (secondTapImage) {

      const index =
        boardObjects.indexOf(
          secondTapImage
        );

      if (index >= 0) {

        boardObjects.splice(
          index,
          1
        );

      }

    }

    selectedObject = null;

    secondTapImage = null;

    hideImageCancelButton();

    redraw();

  }
);


/* =========================================================
   MENU PRINCIPAL
   ========================================================= */

document
  .querySelectorAll("[data-menu-action]")
  .forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const action =
          button.dataset.menuAction;

        menuPanel.classList.remove(
          "open"
        );

        if (action === "record") {

          if (recording) {

            stopRecording();

          } else {

            await startRecording();

          }

        }

        if (action === "camera") {

          await restartCamera();

        }

      }
    );

  });


/* =========================================================
   TOQUE FORA DOS PAINÉIS
   ========================================================= */

document.addEventListener(
  "pointerdown",
  event => {

    /*
      Não interfere no editor de texto.
    */

    if (
      event.target ===
      inlineEditor
    ) {

      return;

    }

    /*
      Não fecha se tocou nos próprios
      elementos dos painéis.
    */

    if (
      toolsPanel.contains(event.target) ||
      menuPanel.contains(event.target) ||
      canvasMenu.contains(event.target) ||
      imageCancelButton.contains(event.target)
    ) {

      return;

    }

    /*
      Se clicou no canvas, o próprio
      handler do canvas cuida dele.
    */

    if (
      event.target === board
    ) {

      return;

    }

    closePanels();

  }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

resizeCanvas();

updateToolName();

setStatus("Pronto");


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
        .catch(error => {

          console.log(
            "Service Worker:",
            error
          );

        });

    }
  );

}
