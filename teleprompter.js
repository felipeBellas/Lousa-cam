"use strict";

/* =========================================================
   LOUSA CAM 2.0
   TELEPROMPTER — ETAPA 11A

   Módulo independente.

   NÃO acessa:
   - câmera
   - MediaStream
   - MediaRecorder
   - canvas
   - objetos da lousa

   O texto do usuário é inserido somente com textContent.
   ========================================================= */

(() => {

  const MAX_SCRIPT_LENGTH = 100000;


  /* =======================================================
     ELEMENTOS
     ======================================================= */

  const layer =
    document.getElementById(
      "teleprompterLayer"
    );

  const closeButton =
    document.getElementById(
      "teleprompterClose"
    );

  const editor =
    document.getElementById(
      "teleprompterEditor"
    );

  const reader =
    document.getElementById(
      "teleprompterReader"
    );

  const readerText =
    document.getElementById(
      "teleprompterReaderText"
    );

  const playButton =
    document.getElementById(
      "teleprompterPlay"
    );

  const resetButton =
    document.getElementById(
      "teleprompterReset"
    );

  const speedInput =
    document.getElementById(
      "teleprompterSpeed"
    );

  const fontSizeInput =
    document.getElementById(
      "teleprompterFontSize"
    );
   const opacityInput =
  document.getElementById(
     "teleprompterOpacity"
  );
   const editButton =
  document.getElementById("teleprompterEdit");


  /* =======================================================
     VERIFICAÇÃO
     ======================================================= */

  if (
    !layer ||
    !closeButton ||
    !editor ||
    !reader ||
    !readerText ||
    !playButton ||
    !resetButton ||
    !speedInput ||
    !fontSizeInput
  ) {

    console.warn(
      "Teleprompter: interface incompleta."
    );

    return;

  }


  /* =======================================================
     ESTADO
     ======================================================= */

  let isOpen = false;

  let isPlaying = false;

  let animationFrameId = null;

  let previousTimestamp = null;

  let speed = 40;

  let fontSize = 32;


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function clamp(
    value,
    minimum,
    maximum
  ) {

    return Math.min(
      maximum,
      Math.max(
        minimum,
        value
      )
    );

  }


  function safeNumber(
    value,
    fallback,
    minimum,
    maximum
  ) {

    const number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {

      return fallback;

    }


    return clamp(
      number,
      minimum,
      maximum
    );

  }


  /* =======================================================
     TEXTO
     ======================================================= */

  function getScript() {

    return String(
      editor.value || ""
    ).slice(
      0,
      MAX_SCRIPT_LENGTH
    );

  }


  function updateReader() {

    /*
      Segurança:

      NÃO usar innerHTML aqui.

      O conteúdo digitado pelo usuário
      nunca é interpretado como HTML.
    */

    readerText.textContent =
      getScript();

  }


  /* =======================================================
     CONFIGURAÇÕES
     ======================================================= */

  function updateSettings() {

    speed =
      safeNumber(
        speedInput.value,
        40,
        5,
        200
      );


    fontSize =
      safeNumber(
        fontSizeInput.value,
        32,
        18,
        72
      );


    speedInput.value =
      String(speed);


    fontSizeInput.value =
      String(fontSize);


    readerText.style.fontSize =
      `${fontSize}px`;

    /* =======================================================
   TELEPROMPTER 11B.1
   TRANSPARÊNCIA REAL DO FUNDO
   ======================================================= */

if (opacityInput) {

  const opacity = safeNumber(
    opacityInput.value,
    30,
    0,
    90
  );

  opacityInput.value = String(opacity);

  const alpha = opacity / 100;

  // Transparência da janela externa
  const windowPanel =
    layer.querySelector(".teleprompter-window");

  if (windowPanel) {

    windowPanel.style.backgroundColor =
      `rgba(12, 12, 14, ${alpha})`;

    // Evita que o desfoque continue escondendo a câmera
    windowPanel.style.backdropFilter = "none";
    windowPanel.style.webkitBackdropFilter = "none";

  }

  // Fundo do leitor totalmente transparente.
  // A opacidade é controlada pela janela externa.
  reader.style.backgroundColor =
    "transparent";

}
  }


  /* =======================================================
     ANIMAÇÃO
     ======================================================= */

  function stopAnimation() {

    isPlaying = false;

    previousTimestamp = null;


    if (
      animationFrameId !== null
    ) {

      cancelAnimationFrame(
        animationFrameId
      );

      animationFrameId = null;

    }


    playButton.textContent =
      "▶";


    playButton.setAttribute(
      "aria-label",
      "Iniciar teleprompter"
    );

  }


  function animationStep(
    timestamp
  ) {

    if (
      !isPlaying ||
      !isOpen
    ) {

      stopAnimation();

      return;

    }


    if (
      previousTimestamp === null
    ) {

      previousTimestamp =
        timestamp;

    }


    const elapsed =
      Math.min(
        100,
        Math.max(
          0,
          timestamp -
          previousTimestamp
        )
      );


    previousTimestamp =
      timestamp;


    reader.scrollTop +=
      speed *
      (
        elapsed /
        1000
      );


    const reachedEnd =

      reader.scrollTop +
      reader.clientHeight >=

      reader.scrollHeight -
      2;


    if (reachedEnd) {

      stopAnimation();

      return;

    }


    animationFrameId =
      requestAnimationFrame(
        animationStep
      );

  }


  /* =======================================================
     PLAY / PAUSE
     ======================================================= */

  function play() {

    if (
      !isOpen ||
      isPlaying
    ) {

      return;

    }


    updateReader();
    updateSettings();


    if (
      !getScript().trim()
    ) {

      editor.focus();

      return;

    }
     setEditing(false);


    isPlaying = true;

    previousTimestamp = null;


    playButton.textContent =
      "❚❚";


    playButton.setAttribute(
      "aria-label",
      "Pausar teleprompter"
    );


    animationFrameId =
      requestAnimationFrame(
        animationStep
      );

  }


  function pause() {

    stopAnimation();

  }


  function togglePlay() {

    if (isPlaying) {

      pause();

    } else {

      play();

    }

  }


  function reset() {

    stopAnimation();

    reader.scrollTop = 0;

  }

   /* =====================================================
   TELEPROMPTER 11B — EDITOR RECOLHÍVEL
   ===================================================== */

function setEditing(editing) {

  layer.classList.toggle(
    "editing",
    editing
  );

  if (editButton) {

    editButton.setAttribute(
      "aria-expanded",
      editing ? "true" : "false"
    );

    editButton.textContent =
      editing ? "✓ Pronto" : "✎ Editar";

  }

}

if (editButton) {

  editButton.addEventListener(
    "click",
    event => {

      event.preventDefault();
      event.stopPropagation();

      const editing =
        layer.classList.contains("editing");

      if (!editing) {
        pause();
      }

      setEditing(!editing);

      if (!editing) {
        editor.focus();
      } else {
        editor.blur();
      }

    }
  );

}


  /* =======================================================
     ABRIR
     ======================================================= */

  function open() {

    if (isOpen) {

      return;

    }


    isOpen = true;

     document.body.classList.add(
  "teleprompter-active"
);

setEditing(!getScript().trim());


    updateReader();

    updateSettings();


    layer.classList.add(
      "show"
    );


    layer.setAttribute(
      "aria-hidden",
      "false"
    );


    window.dispatchEvent(
      new CustomEvent(
        "lousacam:teleprompterchange",
        {
          detail: {
            open: true
          }
        }
      )
    );

  }


  /* =======================================================
     FECHAR
     ======================================================= */

  function close() {

    if (!isOpen) {

      return;

    }


    stopAnimation();


    isOpen = false;

     document.body.classList.remove(
  "teleprompter-active"
);

setEditing(false);


    layer.classList.remove(
      "show"
    );


    layer.setAttribute(
      "aria-hidden",
      "true"
    );


    window.dispatchEvent(
      new CustomEvent(
        "lousacam:teleprompterchange",
        {
          detail: {
            open: false
          }
        }
      )
    );

  }


  /* =======================================================
     EVENTOS INTERNOS
     ======================================================= */

  closeButton.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();

      close();

    }
  );


  playButton.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();

      togglePlay();

    }
  );


  resetButton.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();

      reset();

    }
  );


 /* =======================================================
   CONTROLES DO TELEPROMPTER
   ======================================================= */

// Velocidade da leitura
speedInput.addEventListener(
  "input",
  updateSettings
);

// Tamanho do texto
fontSizeInput.addEventListener(
  "input",
  updateSettings
);

// Transparência do fundo — Etapa 11B.1
if (opacityInput) {
  opacityInput.addEventListener(
    "input",
    updateSettings
  );
}


  editor.addEventListener(
    "input",
    () => {

      if (
        editor.value.length >
        MAX_SCRIPT_LENGTH
      ) {

        editor.value =
          editor.value.slice(
            0,
            MAX_SCRIPT_LENGTH
          );

      }


      updateReader();

    }
  );


  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.visibilityState !==
        "visible"
      ) {

        pause();

      }

    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        isOpen
      ) {

        close();

      }

    }
  );


  /* =======================================================
     API PÚBLICA
     ======================================================= */

  const publicApi =
    Object.freeze({

      open,

      close,

      play,

      pause,

      reset,

      isOpen() {

        return isOpen;

      }

    });


  /*
    Proteção contra carregamento duplicado.

    Se a API já existir, não tentamos
    redefinir a propriedade.
  */

  if (
    !Object.prototype.hasOwnProperty.call(
      window,
      "LousaCamTeleprompter"
    )
  ) {

    Object.defineProperty(
      window,
      "LousaCamTeleprompter",
      {

        value:
          publicApi,

        writable:
          false,

        configurable:
          false

      }
    );

  }


  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */

  updateReader();

  updateSettings();

})();
