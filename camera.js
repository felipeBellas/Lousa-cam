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
   ABRIR CÂMERA — C3.2B

   Migração fiel do fluxo estável do app.js.

   IMPORTANTE:
   - não executa automaticamente
   - não altera a gravação
   - não interfere no canvas
   - não reage à orientação
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


  /*
    Solicita exatamente a câmera desejada.

    Mantemos a mesma estrutura utilizada
    pelo startCamera() estável.
  */

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


  /*
    Assim como no app.js estável,
    o novo stream passa imediatamente
    a ser o stream atual.
  */

  stream =
    newStream;


  /* =====================================================
     ETAPA 4K.3D
     ENQUADRAMENTO MAIS ABERTO QUANDO DISPONÍVEL
     ===================================================== */

  /*
    Esta função é opcional.

    Qualquer falha relacionada ao zoom
    não pode impedir o funcionamento
    principal da câmera.
  */

  await applyMinimumZoom(
    stream
  );


  /*
    Conecta o MediaStream ao vídeo.

    A ordem abaixo deve permanecer.
  */

  videoElement.srcObject =
    stream;

  videoElement.muted =
    true;

  videoElement.playsInline =
    true;


  /*
    Esperamos explicitamente pelos
    metadados do NOVO MediaStream.

    Este comportamento é importante
    para WebKit/Safari.
  */

  await new Promise(
    resolve => {

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
        { once: true }
      );


      /*
        Proteção para WebKit:

        loadedmetadata pode ter ocorrido
        muito rapidamente.
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
        Segurança para nunca deixar
        a inicialização bloqueada.
      */

      setTimeout(
        finish,
        1200
      );

    }
  );


  /*
    Inicia a reprodução do NOVO stream.
  */

  await videoElement.play();


  /*
    Espelhamento somente na frontal.
  */

  videoElement.classList.toggle(
    "mirror",
    requestedFacingMode ===
      "user"
  );


  return true;

}


/* =======================================================
   INICIAR CÂMERA — C3.2B

   Reprodução do comportamento estável
   existente no app.js.
   ======================================================= */

async function start(
  requestedFacingMode = facingMode,
  isSwitchingCamera = false
) {

  if (!videoElement) {

    console.error(
      "LousaCamCamera: init(video) deve ser chamado antes de start()."
    );

    return false;

  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    console.error(
      "LousaCamCamera: câmera não disponível."
    );

    return false;

  }


  /*
    Guarda o stream atual.

    Na troca frontal/traseira,
    o dispositivo anterior precisa
    ser liberado primeiro.
  */

  const previousStream =
    stream;


  if (
    isSwitchingCamera &&
    previousStream
  ) {

    previousStream
      .getTracks()
      .forEach(
        track => {

          try {

            track.stop();

          } catch (error) {

            console.warn(
              "Erro ao encerrar track:",
              error
            );

          }

        }
      );


    /*
      Desconecta o stream antigo antes
      de solicitar outra câmera.
    */

    videoElement.srcObject =
      null;

    stream =
      null;


    /*
      Intervalo já utilizado pela
      implementação estável para WebKit/iOS.
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
    câmera + microfone
  */

  try {

    await openCamera(
      requestedFacingMode,
      true
    );


    /*
      Se não estamos trocando frontal/traseira
      e existia outro stream, encerramos o
      anterior somente depois que o novo abriu.
    */

    if (
      !isSwitchingCamera &&
      previousStream &&
      previousStream !== stream
    ) {

      previousStream
        .getTracks()
        .forEach(
          track =>
            track.stop()
        );

    }


    facingMode =
      requestedFacingMode;


    return true;

  } catch (error) {

    console.error(
      "LousaCamCamera: primeira tentativa da câmera:",
      error
    );

  }


  /*
    Se alguma tentativa deixou um stream,
    encerramos antes do fallback.

    IMPORTANTE:
    não restauramos automaticamente
    previousStream aqui.

    Isso reproduz o comportamento
    do startCamera() estável.
  */

  if (stream) {

    stream
      .getTracks()
      .forEach(
        track => {

          try {

            track.stop();

          } catch (error) {

            console.warn(
              error
            );

          }

        }
      );

  }


  videoElement.srcObject =
    null;

  stream =
    null;


  /*
    SEGUNDA TENTATIVA
    câmera sem áudio
  */

  try {

    await openCamera(
      requestedFacingMode,
      false
    );


    facingMode =
      requestedFacingMode;


    return true;

  } catch (secondError) {

    console.error(
      "LousaCamCamera: segunda tentativa da câmera:",
      secondError
    );


    if (stream) {

      stream
        .getTracks()
        .forEach(
          track => {

            try {

              track.stop();

            } catch (error) {

              console.warn(
                error
              );

            }

          }
        );

    }


    stream =
      null;

    videoElement.srcObject =
      null;


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
     C3.2D
     AJUSTE OPCIONAL DE ENQUADRAMENTO / ZOOM

     Ponte pública segura para a função interna
     applyMinimumZoom().

     IMPORTANTE:
     - NÃO abre câmera
     - NÃO solicita permissão
     - NÃO troca srcObject
     - NÃO executa getUserMedia
     - NÃO reinicia MediaStream
     - falhas continuam sendo opcionais
     ======================================================= */

  async function applyOpenFraming(
    targetStream
  ) {

    if (!targetStream) {
      return false;
    }

    try {

      await applyMinimumZoom(
        targetStream
      );

      return true;

    } catch (error) {

      console.warn(
        "Não foi possível aplicar o enquadramento aberto:",
        error
      );

      return false;

    }

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
          fitPreview,
          applyOpenFraming

        }),

      writable:
        false,

      configurable:
        false

    }
  );

})();
