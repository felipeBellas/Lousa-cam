```js
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

let mediaRecorder = null;
let chunks = [];
let recording = false;
let renderCanvas = null;
let renderCtx = null;
let animationId = null;
let wakeLock = null;

/* =========================================================
   DETECÇÃO DO PWA / iOS
   ========================================================= */

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalonePWA() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/* =========================================================
   MENSAGEM
   ========================================================= */

function toast(message, duration = 2200) {
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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);

  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  redraw();
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
}

function drawStroke(c, stroke) {
  if (!stroke.points.length) return;

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

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

/* =========================================================
   DESENHO
   ========================================================= */

function beginDraw(event) {
  if (event.target !== canvas) return;

  event.preventDefault();

  drawing = true;

  if (canvas.setPointerCapture) {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (_) {}
  }

  const point = getPointerPosition(event);

  currentStroke = {
    tool,
    color,
    width: lineWidth,
    points: [point]
  };

  redoStack = [];

  drawStroke(ctx, currentStroke);
}

function moveDraw(event) {
  if (!drawing || !currentStroke) return;

  event.preventDefault();

  const point = getPointerPosition(event);
  const points = currentStroke.points;

  const last = points[points.length - 1];

  const distance = Math.hypot(
    point.x - last.x,
    point.y - last.y
  );

  if (distance < 0.8) return;

  points.push(point);

  drawStroke(ctx, currentStroke);
}

function endDraw(event) {
  if (!drawing) return;

  drawing = false;

  if (
    currentStroke &&
    currentStroke.points.length
  ) {
    strokes.push(currentStroke);
  }

  currentStroke = null;

  if (
    event &&
    canvas.releasePointerCapture
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
    } catch (_) {}
  }
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
   CORES
   ========================================================= */

document
  .querySelectorAll(".color")
  .forEach(button => {

    button.addEventListener("click", () => {

      color = button.dataset.color;

      tool = "pen";

      document
        .querySelectorAll(".color")
        .forEach(item => {
          item.classList.remove("active");
        });

      button.classList.add("active");

      $("toolName").textContent = "Caneta";

      $("eraser").style.outline = "";
    });

  });

/* =========================================================
   ESPESSURA
   ========================================================= */

$("width").addEventListener(
  "input",
  event => {
    lineWidth = Number(event.target.value);
  }
);

/* =========================================================
   BORRACHA
   ========================================================= */

$("eraser").addEventListener(
  "click",
  () => {

    if (tool === "eraser") {

      tool = "pen";

      $("toolName").textContent = "Caneta";

      $("eraser").style.outline = "";

    } else {

      tool = "eraser";

      $("toolName").textContent = "Borracha";

      $("eraser").style.outline =
        "2px solid #fff";
    }

  }
);

/* =========================================================
   DESFAZER
   ========================================================= */

$("undo").addEventListener(
  "click",
  () => {

    if (!strokes.length) return;

    redoStack.push(strokes.pop());

    redraw();
  }
);

/* =========================================================
   REFAZER
   ========================================================= */

$("redo").addEventListener(
  "click",
  () => {

    if (!redoStack.length) return;

    strokes.push(redoStack.pop());

    redraw();
  }
);

/* =========================================================
   LIMPAR
   ========================================================= */

$("clear").addEventListener(
  "click",
  () => {

    if (!strokes.length) return;

    strokes = [];

    redoStack = [];

    redraw();

    toast("Lousa limpa");
  }
);

/* =========================================================
   PAINÉIS
   ========================================================= */

function closePanels(except = null) {

  ["menuPanel", "tools"].forEach(id => {

    if (id !== except) {

      const panel = $(id);

      panel.classList.remove("open");

      panel.setAttribute(
        "aria-hidden",
        "true"
      );
    }

  });
}

$("menuBtn").addEventListener(
  "click",
  () => {

    const panel = $("menuPanel");

    const opening =
      !panel.classList.contains("open");

    closePanels(
      opening ? "menuPanel" : null
    );

    if (opening) {

      panel.classList.add("open");

      panel.setAttribute(
        "aria-hidden",
        "false"
      );
    }

  }
);

$("settings").addEventListener(
  "click",
  () => {

    const panel = $("tools");

    const opening =
      !panel.classList.contains("open");

    closePanels(
      opening ? "tools" : null
    );

    if (opening) {

      panel.classList.add("open");

      panel.setAttribute(
        "aria-hidden",
        "false"
      );
    }

  }
);

document.addEventListener(
  "pointerdown",
  event => {

    if (
      !event.target.closest("#menuPanel") &&
      !event.target.closest("#menuBtn") &&
      !event.target.closest("#tools") &&
      !event.target.closest("#settings")
    ) {
      closePanels();
    }

  }
);

/* =========================================================
   PREPARAÇÃO DO VÍDEO PARA SAFARI / iOS / PWA
   ========================================================= */

function prepareVideoElement() {

  if (!video) return;

  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  video.setAttribute(
    "autoplay",
    ""
  );

  video.setAttribute(
    "muted",
    ""
  );

  video.setAttribute(
    "playsinline",
    ""
  );

  video.setAttribute(
    "webkit-playsinline",
    ""
  );

  video.style.objectFit = "cover";
}

/* =========================================================
   AGUARDA O VIDEO RECEBER DIMENSÕES
   ========================================================= */

function waitForVideoMetadata(timeout = 4000) {

  return new Promise(resolve => {

    if (
      video.readyState >= 1 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      resolve(true);
      return;
    }

    let finished = false;

    const finish = result => {

      if (finished) return;

      finished = true;

      video.removeEventListener(
        "loadedmetadata",
        onMetadata
      );

      clearTimeout(timer);

      resolve(result);
    };

    const onMetadata = () => {
      finish(
        video.videoWidth > 0 &&
        video.videoHeight > 0
      );
    };

    const timer = setTimeout(
      () => finish(false),
      timeout
    );

    video.addEventListener(
      "loadedmetadata",
      onMetadata,
      { once: true }
    );

  });
}

/* =========================================================
   INICIALIZAÇÃO DA CÂMERA
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

  prepareVideoElement();

  /*
   * Se já existe uma câmera aberta,
   * encerramos antes de solicitar outra.
   */
  if (stream) {

    stream
      .getTracks()
      .forEach(track => {
        try {
          track.stop();
        } catch (_) {}
      });

    stream = null;
  }

  /*
   * Limpa o vídeo anterior.
   * Isso é especialmente importante no
   * Safari/PWA do iPhone.
   */
  try {
    video.pause();
  } catch (_) {}

  try {
    video.srcObject = null;
  } catch (_) {}

  try {

    /*
     * Solicitação de câmera.
     *
     * Não usamos resolução obrigatória.
     * O iPhone escolhe a resolução compatível.
     * Isso evita falhas específicas do PWA.
     */
    stream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          facingMode: {
            ideal: facingMode
          },

          width: {
            ideal: 1920
          },

          height: {
            ideal: 1080
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

    /*
     * Coloca o stream no elemento video.
     */
    video.srcObject = stream;

    video.classList.toggle(
      "mirror",
      facingMode === "user"
    );

    /*
     * No PWA do iOS, aguardar metadata
     * antes de chamar play() é mais seguro.
     */
    await waitForVideoMetadata();

    /*
     * Safari exige que o play seja tratado
     * como Promise.
     */
    try {

      await video.play();

    } catch (playError) {

      console.warn(
        "video.play() aguardará novamente:",
        playError
      );

      /*
       * Pequena segunda tentativa.
       * Útil especialmente no modo standalone.
       */
      await new Promise(resolve => {
        setTimeout(resolve, 100);
      });

      await video.play();
    }

    /*
     * Força uma atualização visual depois
     * que a câmera efetivamente entrou no vídeo.
     */
    requestAnimationFrame(() => {
      fitCanvas();
    });

    /*
     * Esconde a tela inicial SOMENTE depois
     * que a câmera foi realmente inicializada.
     */
    startOverlay.classList.add("hidden");

    await requestWakeLock();

    toast("Câmera ativada");

    return true;

  } catch (error) {

    console.error(
      "Erro ao iniciar câmera:",
      error
    );

    /*
     * Se houve erro, não deixamos uma
     * referência quebrada no vídeo.
     */
    try {
      video.pause();
      video.srcObject = null;
    } catch (_) {}

    if (stream) {

      stream
        .getTracks()
        .forEach(track => {
          try {
            track.stop();
          } catch (_) {}
        });

      stream = null;
    }

    let message =
      "Não foi possível iniciar a câmera.";

    if (
      error.name ===
      "NotAllowedError"
    ) {

      message =
        "Permita câmera e microfone para o Lousa Cam.";

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

    } else if (
      error.name ===
      "AbortError"
    ) {

      message =
        "A inicialização da câmera foi interrompida. Tente novamente.";

    } else if (
      error.name ===
      "OverconstrainedError"
    ) {

      message =
        "A câmera não aceitou a configuração solicitada.";

    }

    toast(
      message,
      5000
    );

    return false;
  }
}

/* =========================================================
   BOTÃO TROCAR CÂMERA
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

    if ("wakeLock" in navigator) {

      wakeLock =
        await navigator.wakeLock.request(
          "screen"
        );

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

/* =========================================================
   RETORNO AO PWA
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      document.visibilityState !==
      "visible"
    ) {
      return;
    }

    if (!stream) return;

    try {

      await requestWakeLock();

      /*
       * Safari/PWA pode pausar o elemento
       * de vídeo ao voltar para o aplicativo.
       */
      prepareVideoElement();

      if (
        video.srcObject !== stream
      ) {
        video.srcObject = stream;
      }

      if (
        video.paused ||
        video.readyState < 2
      ) {

        await waitForVideoMetadata();

        try {
          await video.play();
        } catch (_) {}
      }

      requestAnimationFrame(() => {
        fitCanvas();
      });

    } catch (error) {

      console.warn(
        "Não foi possível restaurar a câmera:",
        error
      );
    }
  }
);

/* =========================================================
   MEDIA RECORDER
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

  return formats.find(
    type =>
      MediaRecorder.isTypeSupported(type)
  ) || "";
}

/* =========================================================
   VÍDEO PARA GRAVAÇÃO
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

  const scale = Math.max(
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

  renderCtx.save();

  if (facingMode === "user") {

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

  for (const stroke of strokes) {

    drawStroke(
      renderCtx,
      stroke
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

  if (!stream) {

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
    renderCanvas.captureStream(30);

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

      if (event.data?.size) {
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

  toast("Gravando…");
}

/* =========================================================
   PARAR GRAVAÇÃO
   ========================================================= */

function stopRecording() {

  if (!mediaRecorder) return;

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
      { type }
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
      .replace(/[:.]/g, "-")
    }.${extension}`;

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
   LIMPEZA DA GRAVAÇÃO
   ========================================================= */

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
   BOTÃO DE GRAVAÇÃO
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
   BOTÃO ATIVAR CÂMERA
   ========================================================= */

startBtn.addEventListener(
  "click",
  async () => {

    /*
     * O getUserMedia permanece diretamente
     * dentro do clique do usuário.
     *
     * Isso é importante no iOS.
     */
    await startCamera();

  }
);

/* =========================================================
   REDIMENSIONAMENTO
   ========================================================= */

window.addEventListener(
  "resize",
  () => {

    fitCanvas();

  }
);

/*
 * No iPhone, orientationchange pode ocorrer
 * antes de o viewport terminar de mudar.
 *
 * Fazemos somente o ajuste do canvas.
 * Não reiniciamos a câmera aqui.
 */
window.addEventListener(
  "orientationchange",
  () => {

    setTimeout(
      () => {
        fitCanvas();
      },
      300
    );

  }
);

/* =========================================================
   SERVICE WORKER
   ========================================================= */

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./sw.js")
        .catch(console.error);

    }
  );
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

prepareVideoElement();

fitCanvas();
```
