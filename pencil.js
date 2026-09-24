"use strict";


/* =========================================================
   LOUSA CAM — PENCIL
   ETAPA 2

   Interface isolada.

   Funções desta etapa:
   - Mostrar / esconder a Pencil
   - Expandir / recolher
   - Arrastar pela tela
   - Impedir que o arraste desenhe no canvas

   Não controla desenho.
   Não altera câmera.
   Não altera canvas.
   Não altera app.js.
   ========================================================= */


(() => {


  /* =======================================================
     ELEMENTOS EXISTENTES
     ======================================================= */

  const settingsButton =
    document.getElementById(
      "settings"
    );


  const oldToolsPanel =
    document.getElementById(
      "tools"
    );


  /*
    Segurança:

    Se o botão principal da caneta
    não existir, não fazemos nada.
  */

  if (!settingsButton) {

    console.warn(
      "Pencil: botão settings não encontrado."
    );

    return;

  }


  /* =======================================================
     EVITAR DUPLICAÇÃO

     Segurança caso o script seja executado
     novamente por algum motivo.
     ======================================================= */

  if (
    document.getElementById(
      "pencilFloat"
    )
  ) {

    return;

  }


  /* =======================================================
     CRIAR PENCIL
     ======================================================= */

  const pencilFloat =
    document.createElement(
      "div"
    );


  pencilFloat.id =
    "pencilFloat";


  pencilFloat.className =
    "compact";


  pencilFloat.setAttribute(
    "aria-hidden",
    "true"
  );


  /* =======================================================
     BOTÃO DA PENCIL
     ======================================================= */

  const pencilToggle =
    document.createElement(
      "button"
    );


  pencilToggle.id =
    "pencilToggle";


  pencilToggle.type =
    "button";


  pencilToggle.textContent =
    "✎";


  pencilToggle.setAttribute(
    "aria-label",
    "Abrir Pencil"
  );


  /* =======================================================
     CONTEÚDO TEMPORÁRIO
     ======================================================= */

  const pencilContent =
    document.createElement(
      "div"
    );


  pencilContent.id =
    "pencilContent";


  pencilContent.textContent =
    "Ferramentas";


  /* =======================================================
     MONTAGEM
     ======================================================= */

  pencilFloat.appendChild(
    pencilToggle
  );


  pencilFloat.appendChild(
    pencilContent
  );


  document.body.appendChild(
    pencilFloat
  );


  /* =======================================================
     ESTADO
     ======================================================= */

  let pencilVisible =
    false;


  let pencilExpanded =
    false;


  let dragging =
    false;


  let movedDuringPointer =
    false;


  let activePointerId =
    null;


  let dragOffsetX =
    0;


  let dragOffsetY =
    0;


  const DRAG_THRESHOLD =
    6;


  /* =======================================================
     MOSTRAR / ESCONDER
     ======================================================= */

  function setPencilVisible(
    visible
  ) {

    pencilVisible =
      visible;


    pencilFloat.classList.toggle(
      "show",
      visible
    );


    pencilFloat.setAttribute(
      "aria-hidden",
      visible
        ? "false"
        : "true"
    );


    /*
      Ao esconder, volta ao
      estado compacto.
    */

    if (!visible) {

      pencilExpanded =
        false;


      pencilFloat.classList.remove(
        "expanded"
      );


      pencilFloat.classList.add(
        "compact"
      );

    }

  }


  /* =======================================================
     EXPANDIR / RECOLHER
     ======================================================= */

  function togglePencilExpanded() {

    pencilExpanded =
      !pencilExpanded;


    pencilFloat.classList.toggle(
      "expanded",
      pencilExpanded
    );


    pencilFloat.classList.toggle(
      "compact",
      !pencilExpanded
    );


    /*
      Depois de mudar o tamanho,
      garantimos que a Pencil
      continue dentro da tela.
    */

    requestAnimationFrame(
      keepPencilInsideViewport
    );

  }


  /* =======================================================
     LIMITES DA TELA
     ======================================================= */

  function keepPencilInsideViewport() {

    if (!pencilVisible) {

      return;

    }


    const rect =
      pencilFloat.getBoundingClientRect();


    const margin =
      8;


    const maxLeft =
      Math.max(
        margin,
        window.innerWidth -
          rect.width -
          margin
      );


    const maxTop =
      Math.max(
        margin,
        window.innerHeight -
          rect.height -
          margin
      );


    const nextLeft =
      Math.min(
        Math.max(
          rect.left,
          margin
        ),
        maxLeft
      );


    const nextTop =
      Math.min(
        Math.max(
          rect.top,
          margin
        ),
        maxTop
      );


    /*
      Só convertemos para left/top
      quando realmente for necessário.
    */

    if (
      nextLeft !== rect.left ||
      nextTop !== rect.top ||
      pencilFloat.style.left
    ) {

      pencilFloat.style.left =
        `${nextLeft}px`;


      pencilFloat.style.top =
        `${nextTop}px`;


      pencilFloat.style.right =
        "auto";


      pencilFloat.style.bottom =
        "auto";

    }

  }


  /* =======================================================
     INÍCIO DO POSSÍVEL ARRASTE
     ======================================================= */

  pencilFloat.addEventListener(
    "pointerdown",
    event => {

      /*
        Apenas o toque principal.
      */

      if (
        event.button !== undefined &&
        event.button !== 0
      ) {

        return;

      }


      const rect =
        pencilFloat.getBoundingClientRect();


      activePointerId =
        event.pointerId;


      dragging =
        true;


      movedDuringPointer =
        false;


      dragOffsetX =
        event.clientX -
        rect.left;


      dragOffsetY =
        event.clientY -
        rect.top;


      /*
        Guardamos o ponto inicial
        para distinguir toque de arraste.
      */

      pencilFloat.dataset.dragStartX =
        String(
          event.clientX
        );


      pencilFloat.dataset.dragStartY =
        String(
          event.clientY
        );


      /*
        Mantém os eventos de movimento
        ligados à Pencil mesmo se o dedo
        sair visualmente do componente.
      */

      try {

        pencilFloat.setPointerCapture(
          event.pointerId
        );

      } catch (error) {

        /*
          Alguns navegadores podem
          rejeitar pointer capture.
          O arraste ainda pode continuar.
        */

      }


      /*
        O canvas não deve receber
        este gesto.
      */

      event.preventDefault();

      event.stopPropagation();

    }
  );


  /* =======================================================
     MOVIMENTO
     ======================================================= */

  pencilFloat.addEventListener(
    "pointermove",
    event => {

      if (
        !dragging ||
        event.pointerId !==
          activePointerId
      ) {

        return;

      }


      const startX =
        Number(
          pencilFloat.dataset.dragStartX
        );


      const startY =
        Number(
          pencilFloat.dataset.dragStartY
        );


      const distanceX =
        Math.abs(
          event.clientX -
          startX
        );


      const distanceY =
        Math.abs(
          event.clientY -
          startY
        );


      /*
        Pequenos movimentos naturais
        do dedo continuam sendo tratados
        como toque.
      */

      if (
        !movedDuringPointer &&
        distanceX <
          DRAG_THRESHOLD &&
        distanceY <
          DRAG_THRESHOLD
      ) {

        event.preventDefault();

        event.stopPropagation();

        return;

      }


      movedDuringPointer =
        true;


      const rect =
        pencilFloat.getBoundingClientRect();


      const margin =
        8;


      let newLeft =
        event.clientX -
        dragOffsetX;


      let newTop =
        event.clientY -
        dragOffsetY;


      const maxLeft =
        Math.max(
          margin,
          window.innerWidth -
            rect.width -
            margin
        );


      const maxTop =
        Math.max(
          margin,
          window.innerHeight -
            rect.height -
            margin
        );


      newLeft =
        Math.min(
          Math.max(
            newLeft,
            margin
          ),
          maxLeft
        );


      newTop =
        Math.min(
          Math.max(
            newTop,
            margin
          ),
          maxTop
        );


      /*
        Ao iniciar o arraste,
        left/top passam a controlar
        a posição da Pencil.
      */

      pencilFloat.style.left =
        `${newLeft}px`;


      pencilFloat.style.top =
        `${newTop}px`;


      pencilFloat.style.right =
        "auto";


      pencilFloat.style.bottom =
        "auto";


      event.preventDefault();

      event.stopPropagation();

    }
  );


  /* =======================================================
     FINALIZAR ARRASTE
     ======================================================= */

  function finishDrag(
    event
  ) {

    if (
      !dragging ||
      event.pointerId !==
        activePointerId
    ) {

      return;

    }


    dragging =
      false;


    activePointerId =
      null;


    try {

      if (
        pencilFloat.hasPointerCapture(
          event.pointerId
        )
      ) {

        pencilFloat.releasePointerCapture(
          event.pointerId
        );

      }

    } catch (error) {

      /*
        Nenhuma ação necessária.
      */

    }


    event.preventDefault();

    event.stopPropagation();

  }


  pencilFloat.addEventListener(
    "pointerup",
    finishDrag
  );


  pencilFloat.addEventListener(
    "pointercancel",
    finishDrag
  );


  /* =======================================================
     BOTÃO PRINCIPAL DA CANETA

     Intercepta o botão existente antes
     do listener antigo do app.js.
     ======================================================= */

  settingsButton.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      /*
        Garante que o painel antigo
        fique fechado.
      */

      if (oldToolsPanel) {

        oldToolsPanel.classList.remove(
          "open"
        );


        oldToolsPanel.setAttribute(
          "aria-hidden",
          "true"
        );

      }


      setPencilVisible(
        !pencilVisible
      );

    },
    true
  );


  /* =======================================================
     TOQUE NO BOTÃO DA PENCIL

     Um toque expande/recolhe.

     Se houve arraste, o click produzido
     no final do gesto é ignorado.
     ======================================================= */

  pencilToggle.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();


      if (
        movedDuringPointer
      ) {

        movedDuringPointer =
          false;

        return;

      }


      togglePencilExpanded();

    }
  );


  /* =======================================================
     EVITAR EVENTOS INDESEJADOS NO CANVAS
     ======================================================= */

  pencilFloat.addEventListener(
    "click",
    event => {

      event.stopPropagation();

    }
  );


  pencilFloat.addEventListener(
    "contextmenu",
    event => {

      event.preventDefault();

      event.stopPropagation();

    }
  );


  /* =======================================================
     AJUSTE SE A ÁREA VISÍVEL MUDAR

     Não altera câmera nem orientação.
     Apenas impede a Pencil de ficar
     fora da área visível.
     ======================================================= */

  window.addEventListener(
    "resize",
    () => {

      if (!pencilVisible) {

        return;

      }


      requestAnimationFrame(
        keepPencilInsideViewport
      );

    }
  );
  /* =======================================================
     VISIBILIDADE NA GALERIA

     A Pencil pertence somente à tela Câmera.

     Quando a Galeria interna estiver aberta,
     a Pencil fica visualmente escondida.

     Ao voltar para Câmera, ela reaparece
     somente se já estava ativada antes.
     ======================================================= */

  const galleryLayer =
    document.getElementById(
      "galleryLayer"
    );


  if (galleryLayer) {

    const galleryObserver =
      new MutationObserver(
        () => {

          const galleryIsOpen =
            galleryLayer.classList.contains(
              "show"
            );


          if (galleryIsOpen) {

            pencilFloat.style.display =
              "none";

          } else {

            pencilFloat.style.display =
              "";

          }

        }
      );


    galleryObserver.observe(
      galleryLayer,
      {
        attributes: true,
        attributeFilter: [
          "class"
        ]
      }
    );

  }

})();
