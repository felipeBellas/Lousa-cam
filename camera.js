"use strict";


/* =========================================================
   LOUSA CAM 2.0
   CAMERA MODULE — C2B

   MÓDULO ISOLADO

   IMPORTANTE:
   Este arquivo ainda NÃO deve ser conectado ao index.html.

   RESPONSABILIDADES:
   - câmera
   - microfone
   - MediaStream
   - tracks
   - preview
   - câmera frontal/traseira
   - enquadramento da câmera
   - capacidades da câmera

   NÃO É RESPONSÁVEL POR:
   - gravação
   - galeria
   - canvas
   - desenhos
   - texto
   - imagens
   - formas
   - régua
   - interface geral

   REGRA DE SEGURANÇA:
   Nenhum acesso à câmera ou ao microfone ocorre
   automaticamente durante o carregamento deste módulo.

   getUserMedia() somente poderá ser executado depois
   de uma chamada explícita a start() ou switchCamera().
   ========================================================= */


(() => {

  /* =======================================================
     ESTADO PRIVADO
     ======================================================= */

  let videoElement =
    null;

  let stream =
    null;

  let facingMode =
    "user";

  let cameraSwitching =
    false;


  /* =======================================================
     INICIALIZAÇÃO

     Apenas registra o elemento <video>.

     NÃO:
     - abre câmera
     - solicita microfone
     - chama getUserMedia
     - altera permissões
     ======================================================= */

  function init(
    video
  ) {

    if (
      !video ||
      !(video instanceof HTMLVideoElement)
    ) {

      console.error(
        "LousaCamCamera: elemento de vídeo inválido."
      );

      return false;

    }


    videoElement =
      video;


    /*
      Configurações seguras do elemento.

      Nenhuma delas solicita acesso
      à câmera ou ao microfone.
    */

    videoElement.muted =
      true;

    videoElement.playsInline =
      true;


    fitPreview();


    return true;

  }


  /* =======================================================
     VALIDAR MEDIA DEVICES
     ======================================================= */

  function mediaDevicesAvailable() {

    return Boolean(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia ===
        "function"
    );

  }


  /* =======================================================
     ETAPA 4K.3C
     PREVIEW COM MARGEM DE SEGURANÇA

     Mantemos a configuração estável de 125%.

     IMPORTANTE:

     - não reinicia câmera
     - não troca srcObject
     - não chama getUserMedia
     - não interrompe MediaStream
     - não usa freeze frame
     - não rotaciona o vídeo
     - não interfere na gravação
     ======================================================= */

  function fitPreview() {

    if (!videoElement) {
      return;
    }


    videoElement.style.position =
      "absolute";

    videoElement.style.left =
      "-12.5%";

    videoElement.style.top =
      "-12.5%";

    videoElement.style.width =
      "125%";

    videoElement.style.height =
      "125%";

    videoElement.style.objectFit =
      "cover";

    videoElement.style.objectPosition =
      "center center";

    videoElement.style.pointerEvents =
      "none";

  }


  /* =======================================================
     ENCERRAR TRACKS

     Função privada.
     ======================================================= */

  function stopTracks(
    targetStream
  ) {

    if (!targetStream) {
      return;
    }


    targetStream
      .getTracks()
      .forEach(
        track => {

          try {

            track.stop();

          } catch (error) {

            console.warn(
              "LousaCamCamera: erro ao encerrar track.",
              error
            );

          }

        }
      );

  }


  /* =======================================================
     ETAPA 4K.3D
     ENQUADRAMENTO MAIS ABERTO QUANDO DISPONÍVEL

     Esta função é opcional.

     Se a câmera informar suporte a zoom abaixo de 1,
     utilizamos o menor valor permitido.

     Qualquer falha aqui NÃO pode impedir
     o funcionamento normal da câmera.
     ======================================================= */

  async function applyMinimumZoom(
    targetStream
  ) {

    try {

      if (!targetStream) {
        return;
      }


      const videoTrack =
        targetStream
          .getVideoTracks()[0];


      if (
        !videoTrack ||
        typeof videoTrack.getCapabilities !==
          "function"
      ) {

        return;

      }


      const capabilities =
        videoTrack.getCapabilities();


      if (
        !capabilities.zoom ||
        typeof capabilities.zoom.min !==
          "number"
      ) {

        return;

      }


      const minimumZoom =
        capabilities.zoom.min;


      if (
        minimumZoom >= 1 ||
        typeof videoTrack.applyConstraints !==
          "function"
      ) {

        return;

      }


      try {

        await videoTrack.applyConstraints({

          advanced: [
            {
              zoom:
                minimumZoom
            }
          ]

        });


        console.log(
          "LousaCamCamera: enquadramento aberto aplicado:",
          minimumZoom
        );

      } catch (zoomError) {

        /*
          A câmera continua funcionando
          mesmo se esta melhoria falhar.
        */

        console.warn(
          "LousaCamCamera: não foi possível aplicar o enquadramento aberto.",
          zoomError
        );

      }

    } catch (capabilityError) {

      console.warn(
        "LousaCamCamera: não foi possível consultar as capacidades da câmera.",
        capabilityError
      );

    }

  }


  /* =======================================================
     AGUARDAR METADADOS DO VÍDEO

     Proteção especialmente importante
     para WebKit / iPhone.
     ======================================================= */

  function waitForVideoMetadata() {

    return new Promise(
      resolve => {

        if (!videoElement) {

          resolve();

          return;

        }


        let finished =
          false;


        const finish =
          () => {

            if (finished) {
              return;
            }


            finished =
              true;


            videoElement.removeEventListener(
              "loadedmetadata",
              handleMetadata
            );


            resolve();

          };


        const handleMetadata =
          () => {

            finish();

          };


        videoElement.addEventListener(
          "loadedmetadata",
          handleMetadata,
          {
            once: true
          }
        );


        /*
          WebKit pode ter carregado
          os metadados muito rapidamente.
        */

        if (
          videoElement.videoWidth > 0 &&
          videoElement.videoHeight > 0
        ) {

          requestAnimationFrame(
            finish
          );

        }


        /*
          Segurança para nunca bloquear
          indefinidamente a inicialização.
        */

        setTimeout(
          finish,
          1200
        );

      }
    );

  }


  /* =======================================================
     ABRIR CÂMERA

     Função PRIVADA.

     Esta é uma das únicas regiões deste módulo
     autorizadas a chamar getUserMedia().
     ======================================================= */

  async function openCamera(
    requestedFacingMode,
    withAudio
  ) {

    if (!videoElement) {

      throw new Error(
        "LousaCamCamera não foi inicializada."
      );

    }


    const newStream =
      await navigator.mediaDevices
        .getUserMedia({

          video: {

            facingMode:
              requestedFacingMode

          },

          audio:
            withAudio

        });


    stream =
      newStream;


    /*
      4K.3D

      Opcional.
      Nunca impede a câmera de funcionar.
    */

    await applyMinimumZoom(
      stream
    );


    /*
      Conecta o MediaStream
      ao elemento de vídeo.
    */

    videoElement.srcObject =
      stream;

    videoElement.muted =
      true;

    videoElement.playsInline =
      true;


    await waitForVideoMetadata();


    await videoElement.play();


    /*
      Espelhamento somente
      na câmera frontal.
    */

    videoElement.classList.toggle(
      "mirror",
      requestedFacingMode ===
        "user"
    );


    /*
      Reafirma o enquadramento
      estável depois da abertura.
    */

    fitPreview();


    return true;

  }


  /* =======================================================
     INICIAR CÂMERA

     IMPORTANTE:

     Esta função NÃO é executada automaticamente.

     Somente app.js deverá chamá-la depois
     de uma ação explícita do usuário.
     ======================================================= */

  async function start(
    requestedFacingMode = facingMode
  ) {

    if (!videoElement) {

      console.error(
        "LousaCamCamera: init(video) deve ser chamado antes de start()."
      );

      return false;

    }


    if (!mediaDevicesAvailable()) {

      console.error(
        "LousaCamCamera: câmera não disponível."
      );

      return false;

    }


    const previousStream =
      stream;


    /*
      PRIMEIRA TENTATIVA
      câmera + microfone
    */

    try {

      await openCamera(
        requestedFacingMode,
        true
      );


      facingMode =
        requestedFacingMode;


      /*
        Se já havia um stream anterior,
        somente agora o encerramos.

        Assim evitamos desligar uma câmera
        funcional antes de sabermos que
        a nova câmera abriu corretamente.
      */

      if (
        previousStream &&
        previousStream !== stream
      ) {

        stopTracks(
          previousStream
        );

      }


      return true;

    } catch (firstError) {

      console.error(
        "LousaCamCamera: primeira tentativa da câmera:",
        firstError
      );

    }


    /*
      Limpa qualquer stream incompleto
      antes da segunda tentativa.
    */

    if (
      stream &&
      stream !== previousStream
    ) {

      stopTracks(
        stream
      );

    }


    stream =
      null;


    if (videoElement) {

      videoElement.srcObject =
        null;

    }


    /*
      SEGUNDA TENTATIVA
      câmera sem áudio.

      Isso preserva o comportamento
      de fallback existente no Lousa Cam.
    */

    try {

      await openCamera(
        requestedFacingMode,
        false
      );


      facingMode =
        requestedFacingMode;


      if (
        previousStream &&
        previousStream !== stream
      ) {

        stopTracks(
          previousStream
        );

      }


      return true;

    } catch (secondError) {

      console.error(
        "LousaCamCamera: segunda tentativa da câmera:",
        secondError
      );


      if (
        stream &&
        stream !== previousStream
      ) {

        stopTracks(
          stream
        );

      }


      stream =
        previousStream || null;


      /*
        Se ainda existe o stream anterior,
        preservamos o preview antigo.

        Caso contrário, desconectamos
        completamente o elemento de vídeo.
      */

      if (
        videoElement &&
        stream
      ) {

        videoElement.srcObject =
          stream;

        try {

          await videoElement.play();

        } catch (restoreError) {

          console.warn(
            "LousaCamCamera: não foi possível restaurar o preview anterior.",
            restoreError
          );

        }

      } else if (videoElement) {

        videoElement.srcObject =
          null;

      }


      return false;

    }

  }


  /* =======================================================
     PARAR CÂMERA
     ======================================================= */

  function stop() {

    if (stream) {

      stopTracks(
        stream
      );

    }


    stream =
      null;


    if (videoElement) {

      videoElement.srcObject =
        null;

    }

  }


  /* =======================================================
     TROCAR CÂMERA

     Frontal ↔ traseira.

     Mantém a proteção contra chamadas simultâneas.
     ======================================================= */

  async function switchCamera() {

    if (cameraSwitching) {
      return false;
    }


    if (!videoElement) {

      console.error(
        "LousaCamCamera: módulo ainda não inicializado."
      );

      return false;

    }


    if (!mediaDevicesAvailable()) {
      return false;
    }


    cameraSwitching =
      true;


    const previousFacingMode =
      facingMode;

    const previousStream =
      stream;


    const nextFacingMode =
      facingMode === "user"
        ? "environment"
        : "user";


    try {

      /*
        Mantemos o comportamento seguro
        utilizado na troca atual:

        encerra a câmera anterior antes
        de solicitar o outro dispositivo.
      */

      if (previousStream) {

        stopTracks(
          previousStream
        );

        stream =
          null;

        videoElement.srcObject =
          null;


        /*
          Intervalo usado pelo código atual
          para permitir ao WebKit/iOS liberar
          o dispositivo anterior.
        */

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              180
            )
        );

      }


      /*
        PRIMEIRA TENTATIVA
        nova câmera + microfone
      */

      try {

        await openCamera(
          nextFacingMode,
          true
        );


        facingMode =
          nextFacingMode;


        return true;

      } catch (firstError) {

        console.error(
          "LousaCamCamera: primeira tentativa de troca:",
          firstError
        );

      }


      /*
        Limpa tentativa incompleta.
      */

      if (stream) {

        stopTracks(
          stream
        );

      }


      stream =
        null;

      videoElement.srcObject =
        null;


      /*
        SEGUNDA TENTATIVA
        nova câmera sem áudio
      */

      try {

        await openCamera(
          nextFacingMode,
          false
        );


        facingMode =
          nextFacingMode;


        return true;

      } catch (secondError) {

        console.error(
          "LousaCamCamera: segunda tentativa de troca:",
          secondError
        );


        if (stream) {

          stopTracks(
            stream
          );

        }


        stream =
          null;

        videoElement.srcObject =
          null;


        /*
          A câmera anterior já precisou ser encerrada
          para permitir a troca no iOS.

          Portanto mantemos o facingMode lógico
          anterior, mas não solicitamos automaticamente
          uma terceira abertura.

          O app poderá decidir como tratar a falha.
        */

        facingMode =
          previousFacingMode;


        return false;

      }

    } finally {

      cameraSwitching =
        false;

    }

  }


  /* =======================================================
     ACESSO CONTROLADO AO STREAM

     Necessário futuramente para a gravação.

     O stream permanece privado:
     apenas sua referência é fornecida
     quando explicitamente solicitada.
     ======================================================= */

  function getStream() {

    return stream;

  }


  /* =======================================================
     TRACK DE VÍDEO ATUAL
     ======================================================= */

  function getVideoTrack() {

    if (!stream) {
      return null;
    }


    return (
      stream.getVideoTracks()[0] ||
      null
    );

  }


  /* =======================================================
     CÂMERA ATUAL
     ======================================================= */

  function getFacingMode() {

    return facingMode;

  }


  /* =======================================================
     ESTADO
     ======================================================= */

  function isActive() {

    if (!stream) {
      return false;
    }


    return stream
      .getVideoTracks()
      .some(
        track =>
          track.readyState ===
          "live"
      );

  }


  /* =======================================================
     API PÚBLICA

     Esta é a única interface que o restante
     do Lousa Cam deverá utilizar futuramente.
     ======================================================= */

  Object.defineProperty(
    window,
    "LousaCamCamera",
    {

      value:
        Object.freeze({

          init,
          start,
          stop,
          switchCamera,
          getStream,
          getVideoTrack,
          getFacingMode,
          isActive,
          fitPreview

        }),

      writable:
        false,

      configurable:
        false

    }
  );

})();
