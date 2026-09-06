/* =====================================================
   LOUSA CAM 2.0
   JAVASCRIPT PRINCIPAL
===================================================== */

const video =
  document.getElementById("video");

const canvas =
  document.getElementById("canvas");

const ctx =
  canvas.getContext("2d");

const toolbarWrapper =
  document.getElementById("toolbarWrapper");

const btnToggleMenu =
  document.getElementById("btn-toggle-menu");

const penSideWrapper =
  document.getElementById("penSideWrapper");

const btnTogglePen =
  document.getElementById("btn-toggle-pen");

const btnFlip =
  document.getElementById("btn-flip");

const btnRecord =
  document.getElementById("btn-record");

const startOverlay =
  document.getElementById("startOverlay");

const startBtn =
  document.getElementById("startBtn");

const cameraError =
  document.getElementById("cameraError");


/* =====================================================
   ESTADO
===================================================== */

let currentFacingMode = "user";

let currentColor = "#ffffff";

let isEraser = false;

let history = [];

let historyIndex = -1;

let isDrawing = false;

let mediaRecorder = null;

let recordedChunks = [];

let audioStream = null;

let isRecording = false;


/* =====================================================
   ÍCONES DE GRAVAÇÃO
===================================================== */

const svgRecord = `
<svg viewBox="0 0 24 24">
  <circle
    cx="12"
    cy="12"
    r="8"
    fill="#ff3b30"
  />
</svg>
`;


const svgStop = `
<svg viewBox="0 0 24 24">
  <rect
    x="6"
    y="6"
    width="12"
    height="12"
    rx="2"
    fill="#ffffff"
  />
</svg>
`;


/* =====================================================
   MENUS
===================================================== */

function closeMenus() {

  toolbarWrapper.classList.add(
    "collapsed"
  );

  penSideWrapper.classList.add(
    "collapsed"
  );

}


function closeMenusExcept(wrapper) {

  [
    toolbarWrapper,
    penSideWrapper
  ].forEach(element => {

    if (element !== wrapper) {

      element.classList.add(
        "collapsed"
      );

    }

  });

}


/* =====================================================
   MENU PRINCIPAL
===================================================== */

btnToggleMenu.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    closeMenusExcept(
      toolbarWrapper
    );

    toolbarWrapper.classList.toggle(
      "collapsed"
    );

  }
);


/* =====================================================
   MENU DE CANETA
===================================================== */

btnTogglePen.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    closeMenusExcept(
      penSideWrapper
    );

    penSideWrapper.classList.toggle(
      "collapsed"
    );

  }
);


[
  toolbarWrapper,
  penSideWrapper
].forEach(element => {

  element.addEventListener(
    "pointerdown",
    event => {

      event.stopPropagation();

    }
  );

});


document.addEventListener(
  "pointerdown",
  event => {

    if (

      !penSideWrapper.contains(
        event.target
      )

      &&

      !toolbarWrapper.contains(
        event.target
      )

      &&

      !btnToggleMenu.contains(
        event.target
      )

    ) {

      closeMenus();

    }

  }
);


/* =====================================================
   CANVAS
===================================================== */

function resizeCanvas() {

  canvas.width =
    window.innerWidth;

  canvas.height =
    window.innerHeight;

  redraw();

}


window.addEventListener(
  "resize",
  resizeCanvas
);


window.addEventListener(
  "orientationchange",
  () => {

    setTimeout(
      resizeCanvas,
      250
    );

  }
);


resizeCanvas();


/* =====================================================
   CÂMERA
===================================================== */

async function startCamera() {

  cameraError.style.display =
    "none";

  if (
    video.srcObject
  ) {

    video.srcObject
      .getTracks()
      .forEach(track => {

        track.stop();

      });

  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    showCameraError(
      "Este navegador não permite acesso à câmera."
    );

    return false;

  }


  try {

    const stream =
      await navigator.mediaDevices
        .getUserMedia({

          video: {

            facingMode:
              currentFacingMode,

            width: {
              ideal: 1920
            },

            height: {
              ideal: 1080
            }

          },

          audio: true

        });


    video.srcObject =
      stream;

    audioStream =
      stream;


    if (
      currentFacingMode ===
      "environment"
    ) {

      video.classList.add(
        "rear-camera"
      );

    } else {

      video.classList.remove(
        "rear-camera"
      );

    }


    try {

      await video.play();

    } catch (error) {

      console.log(
        "Autoplay controlado pelo navegador."
      );

    }


    return true;

  } catch (error) {

    console.error(
      "Erro na câmera:",
      error
    );

    showCameraError(
      getCameraErrorMessage(
        error
      )
    );

    return false;

  }

}


/* =====================================================
   MENSAGEM DE ERRO
===================================================== */

function showCameraError(
  message
) {

  cameraError.textContent =
    message;

  cameraError.style.display =
    "block";

}


function getCameraErrorMessage(
  error
) {

  if (
    error &&
    error.name ===
    "NotAllowedError"
  ) {

    return (
      "Acesso negado. " +
      "Permita câmera e microfone " +
      "nas configurações do navegador."
    );

  }


  if (
    error &&
    error.name ===
    "NotFoundError"
  ) {

    return (
      "Nenhuma câmera disponível " +
      "neste dispositivo."
    );

  }


  if (
    error &&
    error.name ===
    "NotReadableError"
  ) {

    return (
      "A câmera está sendo usada " +
      "por outro aplicativo."
    );

  }


  return (
    "Não foi possível ativar " +
    "a câmera e o microfone."
  );

}


/* =====================================================
   BOTÃO INICIAL
===================================================== */

startBtn.addEventListener(
  "click",
  async () => {

    startBtn.disabled =
      true;

    startBtn.textContent =
      "Ativando...";


    const success =
      await startCamera();


    if (success) {

      startOverlay.classList.add(
        "hidden"
      );

    } else {

      startBtn.disabled =
        false;

      startBtn.textContent =
        "Tentar novamente";

    }

  }
);


/* =====================================================
   TROCA DE CÂMERA
===================================================== */

btnFlip.addEventListener(
  "click",
  async () => {

    closeMenus();


    currentFacingMode =
      currentFacingMode === "user"
        ? "environment"
        : "user";


    await startCamera();

  }
);


/* =====================================================
   DESENHO
===================================================== */

function saveState() {

  history =
    history.slice(
      0,
      historyIndex + 1
    );


  history.push(
    canvas.toDataURL()
  );


  historyIndex =
    history.length - 1;

}


function redraw() {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  if (
    historyIndex >= 0 &&
    history[historyIndex]
  ) {

    const image =
      new Image();


    image.onload =
      () => {

        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );


        ctx.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

      };


    image.src =
      history[
        historyIndex
      ];

  }

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


/* =====================================================
   INÍCIO DO DESENHO
===================================================== */

function startDrawing(event) {

  if (
    event.pointerType ===
    "mouse" &&
    event.button !== 0
  ) {

    return;

  }


  closeMenus();

  isDrawing = true;


  const position =
    getPointerPosition(
      event
    );


  const lineWidth =
    Number(
      document.getElementById(
        "lineWidth"
      ).value
    );


  ctx.lineWidth =
    lineWidth;

  ctx.lineCap =
    "round";

  ctx.lineJoin =
    "round";


  if (isEraser) {

    ctx.globalCompositeOperation =
      "destination-out";

  } else {

    ctx.globalCompositeOperation =
      "source-over";

    ctx.strokeStyle =
      currentColor;

  }


  ctx.beginPath();

  ctx.moveTo(
    position.x,
    position.y
  );


  event.preventDefault();

}


/* =====================================================
   DESENHANDO
===================================================== */

function draw(event) {

  if (!isDrawing) {

    return;

  }


  const position =
    getPointerPosition(
      event
    );


  ctx.lineTo(
    position.x,
    position.y
  );


  ctx.stroke();


  event.preventDefault();

}


/* =====================================================
   FIM DO DESENHO
===================================================== */

function stopDrawing() {

  if (!isDrawing) {

    return;

  }


  isDrawing = false;

  ctx.closePath();

  ctx.globalCompositeOperation =
    "source-over";


  saveState();

}


/* =====================================================
   POINTER EVENTS
===================================================== */

canvas.addEventListener(
  "pointerdown",
  startDrawing
);


canvas.addEventListener(
  "pointermove",
  draw
);


canvas.addEventListener(
  "pointerup",
  stopDrawing
);


canvas.addEventListener(
  "pointercancel",
  stopDrawing
);


canvas.addEventListener(
  "pointerleave",
  stopDrawing
);


/* =====================================================
   CORES
===================================================== */

document
  .querySelectorAll(
    ".color-dot"
  )
  .forEach(dot => {

    dot.addEventListener(
      "click",
      event => {

        isEraser =
          false;


        document
          .getElementById(
            "btn-eraser"
          )
          .classList
          .remove("active");


        document
          .querySelectorAll(
            ".color-dot"
          )
          .forEach(
            other => {

              other.classList
                .remove(
                  "active"
                );

            }
          );


        event.currentTarget
          .classList
          .add("active");


        currentColor =
          event.currentTarget
            .getAttribute(
              "data-color"
            );

      }
    );

  });


/* =====================================================
   BORRACHA
===================================================== */

document
  .getElementById(
    "btn-eraser"
  )
  .addEventListener(
    "click",
    function() {

      isEraser =
        !isEraser;


      this.classList.toggle(
        "active",
        isEraser
      );

    }
  );


/* =====================================================
   DESFAZER
===================================================== */

document
  .getElementById(
    "btn-undo"
  )
  .addEventListener(
    "click",
    () => {

      closeMenus();


      if (
        historyIndex >= 0
      ) {

        historyIndex--;

        redraw();

      }

    }
  );


/* =====================================================
   REFAZER
===================================================== */

document
  .getElementById(
    "btn-redo"
  )
  .addEventListener(
    "click",
    () => {

      closeMenus();


      if (
        historyIndex <
        history.length - 1
      ) {

        historyIndex++;

        redraw();

      }

    }
  );


/* =====================================================
   LIMPAR
===================================================== */

document
  .getElementById(
    "btn-clear-all"
  )
  .addEventListener(
    "click",
    () => {

      closeMenus();


      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


      saveState();

    }
  );


/* =====================================================
   GRAVAÇÃO
===================================================== */

btnRecord.addEventListener(
  "click",
  async () => {

    closeMenus();


    if (!isRecording) {

      await startRecording();

    } else {

      stopRecording();

    }

  }
);


async function startRecording() {

  if (!video.srcObject) {

    showCameraError(
      "Ative a câmera antes de iniciar a gravação."
    );

    return;

  }


  recordedChunks = [];


  const renderCanvas =
    document.createElement(
      "canvas"
    );


  renderCanvas.width =
    window.innerWidth;

  renderCanvas.height =
    window.innerHeight;


  const renderCtx =
    renderCanvas.getContext(
      "2d"
    );


  isRecording = true;


  function drawFrame() {

    if (!isRecording) {

      return;

    }


    renderCtx.save();


    if (
      currentFacingMode ===
      "user"
    ) {

      renderCtx.translate(
        renderCanvas.width,
        0
      );

      renderCtx.scale(
        -1,
        1
      );

    }


    const videoWidth =
      video.videoWidth ||
      renderCanvas.width;


    const videoHeight =
      video.videoHeight ||
      renderCanvas.height;


    const ratio =
      Math.max(
        renderCanvas.width /
          videoWidth,

        renderCanvas.height /
          videoHeight
      );


    const drawWidth =
      videoWidth * ratio;


    const drawHeight =
      videoHeight * ratio;


    const offsetX =
      (
        renderCanvas.width -
        drawWidth
      ) / 2;


    const offsetY =
      (
        renderCanvas.height -
        drawHeight
      ) / 2;


    renderCtx.drawImage(
      video,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );


    renderCtx.restore();


    renderCtx.drawImage(
      canvas,
      0,
      0,
      renderCanvas.width,
      renderCanvas.height
    );


    requestAnimationFrame(
      drawFrame
    );

  }


  drawFrame();


  const stream =
    renderCanvas.captureStream(
      30
    );


  if (
    audioStream &&
    audioStream.getAudioTracks()
      .length > 0
  ) {

    stream.addTrack(
      audioStream
        .getAudioTracks()[0]
    );

  }


  let mimeType =
    "video/webm";


  if (
    typeof MediaRecorder !==
    "undefined"
  ) {

    if (
      MediaRecorder
        .isTypeSupported(
          "video/mp4"
        )
    ) {

      mimeType =
        "video/mp4";

    } else if (
      MediaRecorder
        .isTypeSupported(
          "video/webm;codecs=vp9"
        )
    ) {

      mimeType =
        "video/webm;codecs=vp9";

    }

  }


  try {

    mediaRecorder =
      new MediaRecorder(
        stream,
        {
          mimeType
        }
      );

  } catch (error) {

    console.error(
      error
    );

    isRecording =
      false;

    showCameraError(
      "Este navegador não suporta a gravação de vídeo."
    );

    return;

  }


  mediaRecorder.ondataavailable =
    event => {

      if (
        event.data &&
        event.data.size > 0
      ) {

        recordedChunks.push(
          event.data
        );

      }

    };


  mediaRecorder.onstop =
    exportVideo;


  mediaRecorder.start();


  btnRecord.classList.add(
    "recording"
  );


  btnRecord.innerHTML =
    svgStop;


  btnRecord.title =
    "Parar gravação";

}


function stopRecording() {

  if (
    !mediaRecorder
  ) {

    return;

  }


  isRecording =
    false;


  if (
    mediaRecorder.state !==
    "inactive"
  ) {

    mediaRecorder.stop();

  }


  btnRecord.classList.remove(
    "recording"
  );


  btnRecord.innerHTML =
    svgRecord;


  btnRecord.title =
    "Gravar vídeo";

}


/* =====================================================
   EXPORTAR VÍDEO
===================================================== */

async function exportVideo() {

  if (
    recordedChunks.length === 0
  ) {

    return;

  }


  const mimeType =
    mediaRecorder.mimeType ||
    "video/webm";


  const blob =
    new Blob(
      recordedChunks,
      {
        type: mimeType
      }
    );


  const extension =
    mimeType.includes("mp4")
      ? "mp4"
      : "webm";


  const file =
    new File(
      [blob],
      `lousa-cam.${extension}`,
      {
        type: mimeType
      }
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

        title:
          "Lousa Cam",

        text:
          "Gravado via Lousa Cam"

      });


      return;

    } catch (error) {

      console.log(
        "Compartilhamento cancelado."
      );

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


  link.href =
    url;

  link.download =
    `lousa-cam.${extension}`;


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

}


/* =====================================================
   SERVICE WORKER
===================================================== */

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

            console.error(
              "Erro no Service Worker:",
              error
            );

          }
        );

    }
  );

}
