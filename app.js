/* Lousa Cam - versão 20260910-02 */
"use strict";

const $ = id => document.getElementById(id);

const video = $("video");
const canvas = $("canvas");
const ctx = canvas.getContext("2d", { alpha: true });

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
const menuPanel = $("menuPanel");
const menuCloseTools = $("menuCloseTools");
const colorInput = $("color");
const widthInput = $("width");
const eraserBtn = $("eraser");
const toolName = $("toolName");

const canvasMenu = $("canvasMenu");

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
let pointerStart = null;
let pointerMoved = false;
let pointerDownTime = 0;

let selectedObject = null;
let draggingObject = false;
let resizingObject = false;
let dragOffset = null;
let resizeStart = null;
let secondTapImage = false;

let pendingPastePosition = null;

let mediaRecorder = null;
let chunks = [];
let recording = false;
let renderCanvas = null;
let renderCtx = null;
let animationId = null;
let wakeLock = null;

const TAP_MAX_TIME = 350;
const TAP_MAX_DISTANCE = 12;

function setStatus(text, ms = 2500) {
  statusEl.textContent = text || "";
  clearTimeout(setStatus.timer);
  if (text) {
    setStatus.timer = setTimeout(() => {
      statusEl.textContent = "";
    }, ms);
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function closePanels() {
  toolsPanel.classList.remove("show");
  menuPanel.classList.remove("show");
  canvasMenu.classList.remove("show");
}

function toggleTools() {
  const opening = !toolsPanel.classList.contains("show");
  menuPanel.classList.remove("show");
  canvasMenu.classList.remove("show");
  toolsPanel.classList.toggle("show", opening);
}

function toggleMainMenu() {
  const opening = !menuPanel.classList.contains("show");
  toolsPanel.classList.remove("show");
  canvasMenu.classList.remove("show");
  menuPanel.classList.toggle("show", opening);
}

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redraw();
}

function drawStroke(target, stroke) {
  if (!stroke || !stroke.points || !stroke.points.length) return;

  target.save();
  target.lineCap = "round";
  target.lineJoin = "round";
  target.lineWidth = stroke.width;
  target.globalCompositeOperation =
    stroke.tool === "eraser" ? "destination-out" : "source-over";
  target.strokeStyle = stroke.color;

  target.beginPath();
  target.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let i = 1; i < stroke.points.length; i++) {
    target.lineTo(stroke.points[i].x, stroke.points[i].y);
  }

  if (stroke.points.length === 1) {
    target.lineTo(stroke.points[0].x + 0.01, stroke.points[0].y + 0.01);
  }

  target.stroke();
  target.restore();
}

function objectBounds(obj) {
  return {
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height
  };
}

function drawBoardObjects(target) {
  for (const obj of boardObjects) {
    target.save();

    if (obj.type === "text") {
      target.fillStyle = obj.color || "#ffffff";
      target.font = `${obj.size || 32}px Arial`;
      target.textBaseline = "top";

      const lines = String(obj.text || "").split("\n");
      const lh = (obj.size || 32) * 1.2;

      lines.forEach((line, i) => {
        target.fillText(line, obj.x, obj.y + i * lh);
      });
    }

    if (obj.type === "image" && obj.image && obj.image.complete) {
      target.drawImage(obj.image, obj.x, obj.y, obj.width, obj.height);
    }

    target.restore();
  }

  if (selectedObject) {
    drawSelection(target, selectedObject);
  }
}

function drawSelection(target, obj) {
  const b = objectBounds(obj);
  target.save();
  target.strokeStyle = "rgba(255,255,255,.9)";
  target.lineWidth = 1.5;
  target.setLineDash([6, 4]);
  target.strokeRect(b.x, b.y, b.width, b.height);
  target.setLineDash([]);

  target.fillStyle = "#fff";
  target.fillRect(
    b.x + b.width - 14,
    b.y + b.height - 14,
    14,
    14
  );
  target.restore();
}

function redraw() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }

  drawBoardObjects(ctx);
}

function addBoardObject(obj) {
  boardObjects.push(obj);
  redoObjects = [];
  selectedObject = obj;
  redraw();
}

function textMetrics(text, size) {
  const lines = String(text).split("\n");
  const widths = lines.map(line => {
    const probe = document.createElement("canvas").getContext("2d");
    probe.font = `${size}px Arial`;
    return probe.measureText(line).width;
  });

  return {
    width: Math.max(120, ...widths) + 12,
    height: Math.max(42, lines.length * size * 1.2)
  };
}

function createTextObject(x, y, initialText = null) {
  const text = initialText ?? window.prompt("Digite o texto:", "");
  if (text === null || !String(text).trim()) return;

  const size = clamp(lineWidth * 6, 20, 54);
  const m = textMetrics(text, size);

  addBoardObject({
    type: "text",
    text: String(text),
    x: clamp(x, 8, Math.max(8, window.innerWidth - m.width - 8)),
    y: clamp(y, 8, Math.max(8, window.innerHeight - m.height - 8)),
    size,
    color,
    width: m.width,
    height: m.height
  });

  tool = "pen";
  toolName.textContent = "Caneta";
  setStatus("Texto inserido.");
}

function createImageObject(dataUrl, x, y) {
  const image = new Image();

  image.onload = () => {
    const maxW = Math.min(window.innerWidth * 0.55, 420);
    const maxH = Math.min(window.innerHeight * 0.45, 320);

    const scale = Math.min(
      1,
      maxW / image.naturalWidth,
      maxH / image.naturalHeight
    );

    const width = Math.max(40, image.naturalWidth * scale);
    const height = Math.max(40, image.naturalHeight * scale);

    addBoardObject({
      type: "image",
      image,
      dataUrl,
      x: clamp(x, 8, Math.max(8, window.innerWidth - width - 8)),
      y: clamp(y, 8, Math.max(8, window.innerHeight - height - 8)),
      width,
      height
    });

    setStatus("Imagem inserida.");
  };

  image.src = dataUrl;
}

function chooseImage(x, y) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => createImageObject(reader.result, x, y);
    reader.readAsDataURL(file);
  };

  input.click();
}

function removeObject(obj) {
  const i = boardObjects.indexOf(obj);
  if (i >= 0) {
    boardObjects.splice(i, 1);
    redoObjects = [];
    selectedObject = null;
    redraw();
  }
}

function editTextObject(obj) {
  if (!obj || obj.type !== "text") return;

  const value = window.prompt("Edite o texto:", obj.text);
  if (value === null || !String(value).trim()) return;

  obj.text = String(value);
  const m = textMetrics(obj.text, obj.size || 32);
  obj.width = m.width;
  obj.height = m.height;
  redraw();
}

function getObjectAtPoint(x, y) {
  for (let i = boardObjects.length - 1; i >= 0; i--) {
    const obj = boardObjects[i];
    if (
      x >= obj.x &&
      x <= obj.x + obj.width &&
      y >= obj.y &&
      y <= obj.y + obj.height
    ) {
      return obj;
    }
  }
  return null;
}

function showImageCancelButton(obj) {
  let button = document.getElementById("imageCancelAction");

  if (!button) {
    button = document.createElement("button");
    button.id = "imageCancelAction";
    button.textContent = "Cancelar";
    Object.assign(button.style, {
      position: "fixed",
      zIndex: "10001",
      width: "auto",
      minWidth: "100px",
      height: "40px",
      padding: "0 14px",
      background: "rgba(25,25,25,.96)",
      color: "#fff",
      borderRadius: "10px",
      fontSize: "15px"
    });
    document.body.appendChild(button);
  }

  const x = clamp(obj.x, 8, window.innerWidth - 108);
  const y = clamp(obj.y + obj.height + 8, 8, window.innerHeight - 48);

  button.style.left = `${x}px`;
  button.style.top = `${y}px`;
  button.style.display = "flex";

  button.onclick = event => {
    event.stopPropagation();
    selectedObject = null;
    secondTapImage = false;
    button.style.display = "none";
    redraw();
  };
}

function hideImageCancelButton() {
  const button = document.getElementById("imageCancelAction");
  if (button) button.style.display = "none";
}

function openCanvasPasteMenu(x, y) {
  pendingPastePosition = { x, y };
  toolsPanel.classList.remove("show");
  menuPanel.classList.remove("show");

  const rect = canvasMenu.getBoundingClientRect();
  const margin = 8;

  canvasMenu.style.left = `${clamp(
    x,
    margin,
    Math.max(margin, window.innerWidth - rect.width - margin)
  )}px`;

  canvasMenu.style.top = `${clamp(
    y,
    margin,
    Math.max(margin, window.innerHeight - rect.height - margin)
  )}px`;

  canvasMenu.classList.add("show");
}

function closeCanvasPasteMenu() {
  canvasMenu.classList.remove("show");
  pendingPastePosition = null;
}

async function pasteFromClipboard(x, y) {
  closeCanvasPasteMenu();

  let pasted = false;

  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const items = await navigator.clipboard.read();

      for (const item of items) {
        const type = item.types.find(t => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          const reader = new FileReader();

          reader.onload = () => createImageObject(reader.result, x, y);
          reader.readAsDataURL(blob);
          pasted = true;
          return;
        }
      }
    }
  } catch (error) {
    console.warn("Leitura de imagem da área de transferência:", error);
  }

  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();

      if (text && text.trim()) {
        createTextObject(x, y, text);
        pasted = true;
        return;
      }
    }
  } catch (error) {
    console.warn("Leitura de texto da área de transferência:", error);
  }

  if (!pasted) {
    safariPasteFallback(x, y);
  }
}

function safariPasteFallback(x, y) {
  const old = document.getElementById("safariPasteFallback");
  if (old) old.remove();

  const area = document.createElement("textarea");
  area.id = "safariPasteFallback";
  area.setAttribute("aria-hidden", "true");

  Object.assign(area.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-1"
  });

  document.body.appendChild(area);
  area.focus();

  area.addEventListener("paste", event => {
    const cd = event.clipboardData;
    if (!cd) return;

    const files = Array.from(cd.files || []);
    const imageFile = files.find(file => file.type.startsWith("image/"));

    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => createImageObject(reader.result, x, y);
      reader.readAsDataURL(imageFile);
    } else {
      const text = cd.getData("text/plain");
      if (text && text.trim()) createTextObject(x, y, text);
    }

    event.preventDefault();
    setTimeout(() => area.remove(), 50);
  }, { once: true });

  setTimeout(() => {
    area.remove();
    if (!document.getElementById("safariPasteFallback")) return;
    setStatus("Se o Safari mostrar o menu, use Colar.");
  }, 3000);
}

function setPen() {
  tool = "pen";
  toolName.textContent = "Caneta";
  eraserBtn.style.background = "rgba(20,20,20,.78)";
}

function setEraser() {
  tool = "eraser";
  toolName.textContent = "Borracha";
  eraserBtn.style.background = "rgba(255,255,255,.2)";
}

function setTextMode() {
  tool = "text";
  toolName.textContent = "Texto";
  toolsPanel.classList.remove("show");
  menuPanel.classList.remove("show");
  setStatus("Toque na lousa para inserir o texto.");
}

function beginPointer(event) {
  if (event.target !== canvas) return;

  toolsPanel.classList.remove("show");
  menuPanel.classList.remove("show");

  const p = pointFromEvent(event);
  pointerStart = p;
  pointerDownTime = Date.now();
  pointerMoved = false;

  const obj = getObjectAtPoint(p.x, p.y);

  if (obj) {
    event.preventDefault();
    selectedObject = obj;

    if (obj.type === "image") {
      if (secondTapImage && selectedObject === obj) {
        showImageCancelButton(obj);
      } else {
        secondTapImage = true;
        hideImageCancelButton();
      }
    } else {
      secondTapImage = false;
      hideImageCancelButton();
    }

    const b = objectBounds(obj);
    const handle = 22;

    if (
      p.x >= b.x + b.width - handle &&
      p.y >= b.y + b.height - handle
    ) {
      resizingObject = true;
      resizeStart = {
        x: p.x,
        y: p.y,
        width: b.width,
        height: b.height
      };
    } else {
      draggingObject = true;
      dragOffset = {
        x: p.x - obj.x,
        y: p.y - obj.y
      };
    }

    redraw();
    return;
  }

  selectedObject = null;
  secondTapImage = false;
  hideImageCancelButton();

  drawing = true;
  currentStroke = {
    tool: tool === "eraser" ? "eraser" : "pen",
    color,
    width: lineWidth,
    points: [p]
  };

  redoStrokes = [];
  redraw();
  drawStroke(ctx, currentStroke);

  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (_) {}
}

function movePointer(event) {
  if (draggingObject || resizingObject) {
    const p = pointFromEvent(event);
    pointerMoved = true;

    if (draggingObject && selectedObject && dragOffset) {
      const b = objectBounds(selectedObject);
      selectedObject.x = clamp(
        p.x - dragOffset.x,
        0,
        Math.max(0, window.innerWidth - b.width)
      );
      selectedObject.y = clamp(
        p.y - dragOffset.y,
        0,
        Math.max(0, window.innerHeight - b.height)
      );
      redraw();
    }

    if (resizingObject && selectedObject && resizeStart) {
      selectedObject.width = Math.max(
        selectedObject.type === "text" ? 100 : 60,
        resizeStart.width + (p.x - resizeStart.x)
      );
      selectedObject.height = Math.max(
        selectedObject.type === "text" ? 45 : 40,
        resizeStart.height + (p.y - resizeStart.y)
      );
      redraw();
    }
    return;
  }

  if (!drawing || !currentStroke) return;

  const p = pointFromEvent(event);
  const d = Math.hypot(
    p.x - pointerStart.x,
    p.y - pointerStart.y
  );

  if (d > TAP_MAX_DISTANCE) pointerMoved = true;

  const last = currentStroke.points[currentStroke.points.length - 1];
  if (Math.hypot(p.x - last.x, p.y - last.y) < 0.7) return;

  event.preventDefault();
  currentStroke.points.push(p);
  drawStroke(ctx, currentStroke);
}

function endPointer(event) {
  if (draggingObject || resizingObject) {
    draggingObject = false;
    resizingObject = false;
    dragOffset = null;
    resizeStart = null;
    if (selectedObject) redraw();
    return;
  }

  if (!drawing) return;

  drawing = false;

  const quickTap =
    !pointerMoved &&
    Date.now() - pointerDownTime <= TAP_MAX_TIME;

  const p = pointerStart;

  if (quickTap) {
    currentStroke = null;
    redraw();

    if (tool === "text") {
      createTextObject(p.x, p.y);
      pointerStart = null;
      return;
    }

    if (tool === "eraser") {
      pointerStart = null;
      return;
    }

    openCanvasPasteMenu(p.x, p.y);
    pointerStart = null;
    return;
  }

  if (currentStroke && currentStroke.points.length) {
    strokes.push(currentStroke);
  }

  currentStroke = null;
  pointerStart = null;
  redraw();
}

function cancelPointer() {
  drawing = false;
  currentStroke = null;
  draggingObject = false;
  resizingObject = false;
  dragOffset = null;
  resizeStart = null;
  redraw();
}

function undo() {
  if (boardObjects.length) {
    const obj = boardObjects.pop();
    redoObjects.push(obj);
    selectedObject = null;
    hideImageCancelButton();
    redraw();
    return;
  }

  if (strokes.length) {
    redoStrokes.push(strokes.pop());
    redraw();
  }
}

function redo() {
  if (redoObjects.length) {
    const obj = redoObjects.pop();
    boardObjects.push(obj);
    selectedObject = obj;
    redraw();
    return;
  }

  if (redoStrokes.length) {
    strokes.push(redoStrokes.pop());
    redraw();
  }
}

function clearAll() {
  drawing = false;
  currentStroke = null;
  strokes = [];
  redoStrokes = [];
  boardObjects = [];
  redoObjects = [];
  selectedObject = null;
  hideImageCancelButton();
  redraw();
  setStatus("Lousa limpa.");
}

function drawVideoCover(target, source, width, height) {
  const vw = source.videoWidth || width;
  const vh = source.videoHeight || height;
  const scale = Math.max(width / vw, height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const x = (width - dw) / 2;
  const y = (height - dh) / 2;

  target.drawImage(source, 0, 0, vw, vh, x, y, dw, dh);
}

function renderFrame() {
  if (!recording || !renderCanvas || !renderCtx) return;

  const w = renderCanvas.width;
  const h = renderCanvas.height;

  renderCtx.clearRect(0, 0, w, h);

  renderCtx.save();

  if (facingMode === "user") {
    renderCtx.translate(w, 0);
    renderCtx.scale(-1, 1);
  }

  drawVideoCover(renderCtx, video, w, h);
  renderCtx.restore();

  renderCtx.save();
  renderCtx.scale(w / window.innerWidth, h / window.innerHeight);

  for (const stroke of strokes) {
    drawStroke(renderCtx, stroke);
  }
  drawBoardObjects(renderCtx);

  renderCtx.restore();

  animationId = requestAnimationFrame(renderFrame);
}

async function startRecording() {
  if (!stream) {
    setStatus("Ative a câmera primeiro.");
    return;
  }

  if (
    !window.MediaRecorder ||
    !HTMLCanvasElement.prototype.captureStream
  ) {
    setStatus("Este navegador não suporta a gravação integrada.", 4500);
    return;
  }

  renderCanvas = document.createElement("canvas");
  renderCanvas.width = Math.round(window.innerWidth * Math.min(devicePixelRatio || 1, 2));
  renderCanvas.height = Math.round(window.innerHeight * Math.min(devicePixelRatio || 1, 2));
  renderCtx = renderCanvas.getContext("2d");

  const canvasStream = renderCanvas.captureStream(30);

  const audioTracks = stream.getAudioTracks();
  audioTracks.forEach(track => canvasStream.addTrack(track));

  let mimeType = "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4"
  ];

  for (const candidate of candidates) {
    if (
      MediaRecorder.isTypeSupported &&
      MediaRecorder.isTypeSupported(candidate)
    ) {
      mimeType = candidate;
      break;
    }
  }

  try {
    mediaRecorder = new MediaRecorder(
      canvasStream,
      mimeType ? { mimeType } : undefined
    );
  } catch (error) {
    console.error(error);
    setStatus("Não foi possível iniciar a gravação.", 4000);
    return;
  }

  chunks = [];

  mediaRecorder.ondataavailable = event => {
    if (event.data && event.data.size) chunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const type = mediaRecorder.mimeType || "video/webm";
    const blob = new Blob(chunks, { type });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `lousa-cam-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);
    chunks = [];
  };

  mediaRecorder.start(250);
  recording = true;
  recordBtn.classList.add("recording");
  setStatus("Gravando.");

  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch (_) {}

  renderFrame();
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  recording = false;
  recordBtn.classList.remove("recording");

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }

  setStatus("Gravação finalizada.");
}

async function startCamera() {
  try {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: true
    });

    video.srcObject = stream;
    await video.play();

    startOverlay.classList.add("hidden");
    setStatus("Câmera ativada.");
    fitCanvas();
  } catch (error) {
    console.error(error);
    setStatus(
      "Não foi possível acessar a câmera e o microfone. Verifique as permissões.",
      6000
    );
  }
}

async function flipCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  await startCamera();
}

menuBtn.addEventListener("click", event => {
  event.stopPropagation();
  toggleMainMenu();
});

menuCloseTools.addEventListener("click", event => {
  event.stopPropagation();
  menuPanel.classList.remove("show");
});

settingsBtn.addEventListener("click", event => {
  event.stopPropagation();
  toggleTools();
});

textToolButton.addEventListener("click", event => {
  event.stopPropagation();
  setTextMode();
});

undoBtn.addEventListener("click", event => {
  event.stopPropagation();
  undo();
});

redoBtn.addEventListener("click", event => {
  event.stopPropagation();
  redo();
});

clearBtn.addEventListener("click", event => {
  event.stopPropagation();
  clearAll();
});

flipBtn.addEventListener("click", event => {
  event.stopPropagation();
  flipCamera();
});

recordBtn.addEventListener("click", event => {
  event.stopPropagation();
  if (recording) stopRecording();
  else startRecording();
});

colorInput.addEventListener("input", event => {
  color = event.target.value;
  setPen();
});

widthInput.addEventListener("input", event => {
  lineWidth = Number(event.target.value);
});

eraserBtn.addEventListener("click", event => {
  event.stopPropagation();
  if (tool === "eraser") setPen();
  else setEraser();
});

canvasMenu.addEventListener("pointerdown", event => {
  event.stopPropagation();
});

canvasMenu.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const position = pendingPastePosition || {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };

  if (action === "paste") {
    await pasteFromClipboard(position.x, position.y);
  }

  closeCanvasPasteMenu();
});

canvas.addEventListener("pointerdown", beginPointer, { passive: false });
canvas.addEventListener("pointermove", movePointer, { passive: false });
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", cancelPointer);

canvas.addEventListener("dblclick", event => {
  const p = pointFromEvent(event);
  const obj = getObjectAtPoint(p.x, p.y);

  if (obj && obj.type === "text") {
    selectedObject = obj;
    editTextObject(obj);
    redraw();
  }
});

document.addEventListener("pointerdown", event => {
  if (
    event.target !== canvas &&
    !canvasMenu.contains(event.target) &&
    !toolsPanel.contains(event.target) &&
    !menuPanel.contains(event.target) &&
    event.target !== menuBtn &&
    event.target !== settingsBtn &&
    event.target !== textToolButton
  ) {
    canvasMenu.classList.remove("show");
  }
});

startBtn.addEventListener("click", startCamera);

window.addEventListener("resize", fitCanvas);
window.addEventListener("orientationchange", () => {
  setTimeout(fitCanvas, 300);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}

fitCanvas();
