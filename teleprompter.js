"use strict";

/* =========================================================
   LOUSA CAM 2.0
   TELEPROMPTER — ETAPA 11A

   Módulo independente.

   PRINCÍPIOS:
   - não acessa câmera
   - não acessa MediaStream
   - não acessa MediaRecorder
   - não desenha no canvas
   - não altera objetos da lousa
   - não usa innerHTML com conteúdo do usuário
   - não executa conteúdo fornecido pelo usuário
   - limita o tamanho do roteiro
   ========================================================= */

(() => {

  /* =======================================================
     CONFIGURAÇÃO
     ======================================================= */

  const MAX_SCRIPT_LENGTH =
    100000;

  const STORAGE_KEY =
    "lousacam.teleprompter.v1";


  /* =======================================================
     ELEMENTOS
     ======================================================= */

  const button =
    document.getElementById(
      "teleprompterButton"
    );

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


  /* =======================================================
     VERIFICAÇÃO DE INTEGRIDADE

     Se o HTML estiver incompleto,
     o módulo simplesmente não inicia.
     ======================================================= */

  if (
    !button ||
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
     ESTADO PRIVADO

     Nada disso é exposto diretamente
     para outros scripts.
     ======================================================= */

  let isOpen =
    false;

  let isPlaying =
    false;

  let animationFrameId =
    null;

  let previousTimestamp =
    null;

  let speed =
    40;

  let fontSize =
    32;


  /* =======================================================
     FUNÇÕES AUXILIARES
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
     TEXTO SEGURO

     IMPORTANTE:
     usamos textContent.

     O roteiro nunca é interpretado
     como HTML.
     ======================================================= */

  function getSafeScript() {

    return String(
      editor.value || ""
    ).slice(
      0,
      MAX_SCRIPT_LENGTH
    );

  }


  function updateReaderText() {

    const text =
      getSafeScript();

    /*
      Segurança contra HTML/XSS:

      NÃO substituir por innerHTML.
    */
    readerText.textContent =
      text;

  }


  /* =======================================================
     CONFIGURAÇÕES
     ======================================================= */

  function applySettings() {

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

  }


  /* =======================================================
     PERSISTÊNCIA

     Apenas:
     - roteiro
     - velocidade
     - tamanho da fonte

     Nenhum dado de câmera,
     conta ou autenticação.
     ======================================================= */

  function saveState() {

    const state = {

      version:
        1,

      script:
        getSafeScript(),

      speed:
        speed,

      fontSize:
        fontSize

    };


    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          state
        )
      );

    } catch (error) {

      /*
        Falha no armazenamento não pode
        impedir o funcionamento.
      */

      console.warn(
        "Teleprompter: não foi possível salvar.",
        error
      );

    }

  }


  function loadState() {

    let raw =
      null;


    try {

      raw =
        localStorage.getItem(
          STORAGE_KEY
        );

    } catch (error) {

      return;

    }


    if (!raw) {

      return;

    }


    try {

      const parsed =
        JSON.parse(raw);


      if (
        !parsed ||
        typeof parsed !==
          "object"
      ) {

        return;

      }


      if (
        typeof parsed.script ===
          "string"
      ) {

        editor.value =
          parsed.script.slice(
            0,
            MAX_SCRIPT_LENGTH
          );

      }


      speed =
        safeNumber(
          parsed.speed,
          40,
          5,
          200
        );


      fontSize =
        safeNumber(
          parsed.fontSize,
          32,
          18,
          72
        );


      speedInput.value =
        String(speed);

      fontSizeInput.value =
        String(fontSize);


      applySettings();
      updateReaderText();

    } catch (error) {

      /*
        Dados inválidos ou manipulados
        são simplesmente ignorados.
      */

      console.warn(
        "Teleprompter: configuração inválida."
      );

    }

  }


  /* =======================================================
     ROLAGEM
     ======================================================= */

  function stopAnimation() {

    isPlaying =
      false;

    previousTimestamp =
      null;


    if (
      animationFrameId !==
        null
    ) {

      cancelAnimationFrame(
        animationFrameId
      );

      animationFrameId =
        null;

    }


    playButton.textContent =
      "▶";

    playButton.setAttribute(
      "aria-label",
      "Iniciar teleprompter"
    );

    playButton.setAttribute(
      "title",
      "Iniciar"
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
      previousTimestamp ===
        null
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


    /*
      speed = pixels por segundo.
    */
    const movement =
      speed *
      (
        elapsed /
        1000
      );


    reader.scrollTop +=
      movement;


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


  function play() {

    if (
      !isOpen ||
      isPlaying
    ) {

      return;

    }


    updateReaderText();
    applySettings();


    if (
      !getSafeScript().trim()
    ) {

      editor.focus();

      return;

    }


    isPlaying =
      true;

    previousTimestamp =
      null;


    playButton.textContent =
      "❚❚";

    playButton.setAttribute(
      "aria-label",
      "Pausar teleprompter"
    );

    playButton.setAttribute(
      "title",
      "Pausar"
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

    reader.scrollTop =
      0;

  }


  /* =======================================================
     ABRIR / FECHAR
     ======================================================= */

  function open() {

    if (isOpen) {

      return;

    }


    isOpen =
      true;


    /*
      Fecha apenas o menu que originou
      a abertura.

      Não interfere com câmera,
      gravação ou canvas.
    */
    const menuPanel =
      document.getElementById(
        "menuPanel"
      );


    if (menuPanel) {

      menuPanel.classList.remove(
        "open"
      );

      menuPanel.setAttribute(
        "aria-hidden",
        "true"
      );

    }


    updateReaderText();
    applySettings();


    layer.classList.add(
      "show"
    );

    layer.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  function close() {

    if (!isOpen) {

      return;

    }


    stopAnimation();

    saveState();


    isOpen =
      false;


    layer.classList.remove(
      "show"
    );

    layer.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  /* =======================================================
     EVENTOS
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


  speedInput.addEventListener(
    "input",
    () => {

      applySettings();

    }
  );


  fontSizeInput.addEventListener(
    "input",
    () => {

      applySettings();

    }
  );


  editor.addEventListener(
    "input",
    () => {

      /*
        Limite defensivo.

        Não esperamos apenas o atributo
        maxlength do HTML.
      */
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


      updateReaderText();

  });


  editor.addEventListener(
    "change",
    () => {

      saveState();

    }
  );


  /*
    Se o app for colocado em segundo plano,
    interrompemos a rolagem.

    Evita animação acumulada quando o Safari
    volta ao primeiro plano.
  */
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


  /*
    Escape funciona em navegadores/desktop.
  */
  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
          "Escape" &&
        isOpen
      ) {

        close();

      }

    }
  );


  /* =======================================================
     API PÚBLICA MÍNIMA

     Futuramente o controle Pro poderá
     decidir se open() pode ser chamado,
     sem reescrever este módulo.
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


  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */

  loadState();

  updateReaderText();

  applySettings();

})();
