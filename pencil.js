"use strict";


/* =========================================================
   LOUSA CAM — PENCIL
   ETAPA 3

   Interface profissional completa.

   IMPORTANTE:
   Nesta etapa a Pencil ainda NÃO modifica
   o motor de desenho do app.js.

   Funções:
   - Ativar / desativar Pencil
   - Expandir / recolher
   - Arrastar
   - Selecionar ferramentas
   - Selecionar cor
   - Selecionar espessura
   - Régua visual
   - Ocultar na Galeria
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


  if (!settingsButton) {

    console.warn(
      "Pencil: botão settings não encontrado."
    );

    return;

  }


  /* =======================================================
     EVITAR DUPLICAÇÃO
     ======================================================= */

  if (
    document.getElementById(
      "pencilFloat"
    )
  ) {

    return;

  }


  /* =======================================================
     SVGs

     Ícones próprios, vetoriais e monocromáticos.
     ======================================================= */

  const icons = {

    toggle: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20l4.2-1 10.6-10.6a2.1 2.1 0 0 0 0-3l-.2-.2a2.1 2.1 0 0 0-3 0L5 15.8 4 20z"/>
        <path d="M14.5 6.3l3.2 3.2"/>
      </svg>
    `,

    pen: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l5.8 5.8-7.9 7.9-4.6 1.2 1.2-4.6L14.4 5.4"/>
        <path d="M6.5 13.3l4.2 4.2"/>
        <path d="M12 3l2.4 2.4"/>
      </svg>
    `,

    brush: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.2 4.1c1.6-1.6 3.8-1.8 5.1-.5s1.1 3.5-.5 5.1l-7.4 7.4-3.5-3.5 6.3-8.5z"/>
        <path d="M8 12.8c-2.5.4-4 1.8-4.3 4.4-.2 1.5-.8 2.4-1.7 2.8 2.8.5 5.4-.1 7-1.8 1.5-1.5 1.4-3.7-1-5.4z"/>
      </svg>
    `,

    pencil: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20l1.1-4.6L15.8 4.7a2.3 2.3 0 0 1 3.2 0l.3.3a2.3 2.3 0 0 1 0 3.2L8.6 18.9 4 20z"/>
        <path d="M14.3 6.2l3.5 3.5"/>
        <path d="M5.1 15.4l3.5 3.5"/>
      </svg>
    `,

    marker: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 17l-1.5-1.5a2 2 0 0 1 0-2.8L15.8 2.4l5.8 5.8L11.3 18.5a2 2 0 0 1-2.8 0L7 17z"/>
        <path d="M4 20h9"/>
        <path d="M14.3 4l5.7 5.7"/>
      </svg>
    `,

    eraser: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.2 19H18"/>
        <path d="M3.8 14.8L13.5 5a2.1 2.1 0 0 1 3 0l2.5 2.5a2.1 2.1 0 0 1 0 3L10.5 19H8.1l-4.3-4.2z"/>
        <path d="M11.5 7l5.5 5.5"/>
      </svg>
    `,

    ruler: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="7" width="18" height="10" rx="2"/>
        <path d="M7 7v4"/>
        <path d="M11 7v2.5"/>
        <path d="M15 7v4"/>
        <path d="M19 7v2.5"/>
      </svg>
    `,

    more: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14"/>
        <path d="M5 12h14"/>
      </svg>
    `

  };


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
     BOTÃO PRINCIPAL
     ======================================================= */

  const pencilToggle =
    document.createElement(
      "button"
    );


  pencilToggle.id =
    "pencilToggle";


  pencilToggle.type =
    "button";


  pencilToggle.innerHTML =
    icons.toggle;


  pencilToggle.setAttribute(
    "aria-label",
    "Expandir Pencil"
  );


  /* =======================================================
     CONTEÚDO
     ======================================================= */

  const pencilContent =
    document.createElement(
      "div"
    );


  pencilContent.id =
    "pencilContent";


  const toolsBar =
    document.createElement(
      "div"
    );


  toolsBar.className =
    "pencil-tools";


  pencilContent.appendChild(
    toolsBar
  );


  /* =======================================================
     PAINEL CONTEXTUAL
     ======================================================= */

  const contextPanel =
    document.createElement(
      "div"
    );


  contextPanel.id =
    "pencilContextPanel";


  /* =======================================================
     RÉGUA
     ======================================================= */

  const ruler =
    document.createElement(
      "div"
    );


  ruler.id =
    "pencilRuler";


  ruler.innerHTML = `
    <div class="pencil-ruler-ticks"></div>
    <div class="pencil-ruler-line"></div>
  `;


  /* =======================================================
     MONTAGEM PRINCIPAL
     ======================================================= */

  pencilFloat.appendChild(
    pencilToggle
  );


  pencilFloat.appendChild(
    pencilContent
  );


  pencilFloat.appendChild(
    contextPanel
  );


  document.body.appendChild(
    ruler
  );


  document.body.appendChild(
    pencilFloat
  );


  /* =======================================================
     CONFIGURAÇÃO DAS FERRAMENTAS
     ======================================================= */

  const drawingTools = [
    "pen",
    "brush",
    "pencil",
    "marker"
  ];


  const tools = [

    {
      id: "pen",
      label: "Caneta",
      icon: icons.pen
    },

    {
      id: "brush",
      label: "Pincel",
      icon: icons.brush
    },

    {
      id: "pencil",
      label: "Lápis",
      icon: icons.pencil
    },

    {
      id: "marker",
      label: "Marcador",
      icon: icons.marker
    },

    {
      id: "eraser",
      label: "Borracha",
      icon: icons.eraser
    },

    {
      id: "ruler",
      label: "Régua",
      icon: icons.ruler
    },

    {
      id: "more",
      label: "Mais",
      icon: icons.more
    }

  ];


  /* =======================================================
     ESTADO DE CADA FERRAMENTA
     ======================================================= */

  const toolSettings = {

    pen: {
      color: "#ffffff",
      size: 3
    },

    brush: {
      color: "#ffffff",
      size: 10
    },

    pencil: {
      color: "#ffffff",
      size: 3
    },

    marker: {
      color: "#ffcc00",
      size: 16
    },

    eraser: {
      size: 16
    }

  };


  const sizeOptions =
    [1, 3, 6, 10, 16];


  const colorOptions = [
    "#ffffff",
    "#111111",
    "#ff3b30",
    "#007aff",
    "#34c759",
    "#ffcc00"
  ];


  let activeTool =
    "pen";


  let pencilVisible =
    false;


  let pencilExpanded =
    false;


  let rulerVisible =
    false;


  let contextTool =
    null;


  /* =======================================================
     ARRASTE
     ======================================================= */

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
     CRIAR BOTÕES
     ======================================================= */

  const toolButtons =
    new Map();


  tools.forEach(
    tool => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "pencil-tool";


      button.dataset.tool =
        tool.id;


      button.innerHTML =
        tool.icon;


      button.setAttribute(
        "aria-label",
        tool.label
      );


      button.setAttribute(
        "title",
        tool.label
      );


      if (
        drawingTools.includes(
          tool.id
        )
      ) {

        const colorIndicator =
          document.createElement(
            "span"
          );


        colorIndicator.className =
          "pencil-tool-color";


        button.appendChild(
          colorIndicator
        );

      }


      toolButtons.set(
        tool.id,
        button
      );


      toolsBar.appendChild(
        button
      );


      if (
        tool.id ===
        "eraser"
      ) {

        const divider =
          document.createElement(
            "span"
          );


        divider.className =
          "pencil-divider";


        toolsBar.appendChild(
          divider
        );

      }

    }
  );

 /* =======================================================
   INTEGRAÇÃO COM O MOTOR — ETAPA 4A

   Nesta etapa somente a Caneta
   conversa com o app.js.
   ======================================================= */

function applyPenToDrawingEngine() {

  if (
    activeTool !==
    "pen"
  ) {

    return;

  }


  const penSettings =
    toolSettings.pen;


  if (
    !penSettings
  ) {

    return;

  }


  if (
    !window.LousaCamPencil ||
    typeof window.LousaCamPencil.setPen !==
      "function"
  ) {

    console.warn(
      "Pencil: ponte do app.js não encontrada."
    );

    return;

  }


  window.LousaCamPencil.setPen(
    penSettings.color,
    penSettings.size
  );

}

   /* =======================================================
   BORRACHA — ETAPA 4B

   Usa o motor de borracha já existente
   no app.js.
   ======================================================= */

function applyEraserToDrawingEngine() {

  if (
    activeTool !==
    "eraser"
  ) {

    return;

  }


  const eraserSettings =
    toolSettings.eraser;


  if (
    !eraserSettings
  ) {

    return;

  }


  if (
    !window.LousaCamPencil ||
    typeof window.LousaCamPencil.setEraser !==
      "function"
  ) {

    console.warn(
      "Pencil: ponte da borracha não encontrada."
    );

    return;

  }


  window.LousaCamPencil.setEraser(
    eraserSettings.size
  );

}

   /* =======================================================
   MARCADOR — ETAPA 4C
   ======================================================= */

function applyMarkerToDrawingEngine() {

  if (
    activeTool !==
    "marker"
  ) {

    return;

  }


  const markerSettings =
    toolSettings.marker;


  if (
    !markerSettings
  ) {

    return;

  }


  if (
    !window.LousaCamPencil ||
    typeof window.LousaCamPencil.setMarker !==
      "function"
  ) {

    console.warn(
      "Pencil: ponte do marcador não encontrada."
    );

    return;

  }


  window.LousaCamPencil.setMarker(
    markerSettings.color,
    markerSettings.size
  );

}

   
  /* =======================================================
     ATUALIZAR VISUAL
     ======================================================= */

  function updateToolVisuals() {

    toolButtons.forEach(
      (
        button,
        id
      ) => {

        button.classList.toggle(
          "active",
          id === activeTool ||
          (
            id === "ruler" &&
            rulerVisible
          )
        );


        if (
          drawingTools.includes(
            id
          )
        ) {

          button.style.setProperty(
            "--pencil-tool-color",
            toolSettings[id].color
          );

        }

      }
    );

  }


  /* =======================================================
     PAINEL DE CONFIGURAÇÃO
     ======================================================= */

  function closeContextPanel() {

    contextTool =
      null;


    contextPanel.classList.remove(
      "show"
    );

  }


  function openContextPanel(
    toolId
  ) {

    contextTool =
      toolId;


    const settings =
      toolSettings[
        toolId
      ];


    if (!settings) {

      closeContextPanel();

      return;

    }


    const hasColor =
      drawingTools.includes(
        toolId
      );


    contextPanel.innerHTML =
      "";


    const title =
      document.createElement(
        "div"
      );


    title.className =
      "pencil-context-title";


    title.textContent =
      tools.find(
        tool =>
          tool.id === toolId
      )?.label ||
      "Ferramenta";


    contextPanel.appendChild(
      title
    );


    /* -------------------------
       ESPESSURA
       ------------------------- */

    const sizes =
      document.createElement(
        "div"
      );


    sizes.className =
      "pencil-sizes";


    sizeOptions.forEach(
      size => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "pencil-size";


        button.setAttribute(
          "aria-label",
          `Espessura ${size}`
        );


        button.classList.toggle(
          "active",
          settings.size === size
        );


        const dot =
          document.createElement(
            "span"
          );


        dot.className =
          "pencil-size-dot";


        const visualSize =
          Math.max(
            3,
            Math.min(
              15,
              size
            )
          );


        dot.style.width =
          `${visualSize}px`;


        dot.style.height =
          `${visualSize}px`;


        button.appendChild(
          dot
        );


        button.addEventListener(
          "click",
          event => {

            event.preventDefault();

            event.stopPropagation();


           settings.size =
                 size;


/*
  CANETA
*/

if (
  toolId ===
  "pen"
) {

  applyPenToDrawingEngine();

}
             
/*
  BORRACHA
*/

if (
  toolId ===
  "eraser"
) {

  applyEraserToDrawingEngine();

}
             
/*
  MARCADOR
*/

if (
  toolId ===
  "marker"
) {

  applyMarkerToDrawingEngine();

}


openContextPanel(
  toolId
);
          }
        );


        sizes.appendChild(
          button
        );

      }
    );


    contextPanel.appendChild(
      sizes
    );


    /* -------------------------
       CORES
       ------------------------- */

    if (hasColor) {

      const colors =
        document.createElement(
          "div"
        );


      colors.className =
        "pencil-colors";


      colorOptions.forEach(
        color => {

          const button =
            document.createElement(
              "button"
            );


          button.type =
            "button";


          button.className =
            "pencil-color";


          button.style.setProperty(
            "--pencil-color",
            color
          );


          button.classList.toggle(
            "active",
            settings.color === color
          );


          button.setAttribute(
            "aria-label",
            `Cor ${color}`
          );


          button.addEventListener(
            "click",
            event => {

              event.preventDefault();

              event.stopPropagation();


             settings.color =
                color;


            updateToolVisuals();


             if (
                toolId ===
                     "pen"
                ) {

             applyPenToDrawingEngine();

              }


            openContextPanel(
             toolId
              );
               
            }
          );


          colors.appendChild(
            button
          );

        }
      );


      /* -----------------------
         COR PERSONALIZADA
         ----------------------- */

      const custom =
        document.createElement(
          "label"
        );


      custom.className =
        "pencil-custom-color";


      custom.setAttribute(
        "aria-label",
        "Escolher outra cor"
      );


      const colorInput =
        document.createElement(
          "input"
        );


      colorInput.type =
        "color";


      colorInput.value =
        settings.color;


  colorInput.addEventListener(
  "input",
  event => {

    settings.color =
      event.target.value;


    updateToolVisuals();


    if (
      toolId ===
      "pen"
    ) {

      applyPenToDrawingEngine();

    }

  }
);


      custom.appendChild(
        colorInput
      );


      colors.appendChild(
        custom
      );


      contextPanel.appendChild(
        colors
      );

    }


    contextPanel.classList.add(
      "show"
    );

  }


  /* =======================================================
     SELEÇÃO DAS FERRAMENTAS
     ======================================================= */

  toolButtons.forEach(
    (
      button,
      toolId
    ) => {

      button.addEventListener(
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


          /* -----------------------
             RÉGUA
             ----------------------- */

          if (
            toolId ===
            "ruler"
          ) {

            rulerVisible =
              !rulerVisible;


            ruler.classList.toggle(
              "show",
              rulerVisible
            );


            closeContextPanel();

            updateToolVisuals();

            return;

          }


          /* -----------------------
             MAIS
             ----------------------- */

          if (
            toolId ===
            "more"
          ) {

            closeContextPanel();

            return;

          }


          /* -----------------------
             FERRAMENTAS
             ----------------------- */

          if (
            activeTool === toolId &&
            contextTool === toolId
          ) {

            closeContextPanel();

            return;

          }

activeTool =
  toolId;


updateToolVisuals();


/*
  CANETA
*/

if (
  toolId ===
  "pen"
) {

  applyPenToDrawingEngine();

}


/*
  BORRACHA
*/

if (
  toolId ===
  "eraser"
) {

  applyEraserToDrawingEngine();

}


openContextPanel(
  toolId
);

        }
      );

    }
  );


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


    if (!visible) {

      pencilExpanded =
        false;


      closeContextPanel();


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


    if (!pencilExpanded) {

      closeContextPanel();

    }


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
     INÍCIO DO ARRASTE
     ======================================================= */

  pencilFloat.addEventListener(
    "pointerdown",
    event => {

      if (
        event.button !== undefined &&
        event.button !== 0
      ) {

        return;

      }


      /*
        Controles internos continuam
        podendo receber seus próprios
        cliques normalmente.
      */

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


      pencilFloat.dataset.dragStartX =
        String(
          event.clientX
        );


      pencilFloat.dataset.dragStartY =
        String(
          event.clientY
        );


      try {

        pencilFloat.setPointerCapture(
          event.pointerId
        );

      } catch (error) {

        /* sem ação */

      }


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


      if (
        !movedDuringPointer &&
        distanceX <
          DRAG_THRESHOLD &&
        distanceY <
          DRAG_THRESHOLD
      ) {

        event.stopPropagation();

        return;

      }


      movedDuringPointer =
        true;


      closeContextPanel();


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

      /* sem ação */

    }


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
     BOTÃO CANETA ORIGINAL

     Continua interceptando o painel antigo.
     ======================================================= */

  settingsButton.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


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
     BOTÃO PRINCIPAL DA PENCIL
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
     BLOQUEAR PROPAGAÇÃO PARA CANVAS
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
     RESIZE
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


            ruler.style.display =
              "none";

          } else {

            pencilFloat.style.display =
              "";


            ruler.style.display =
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


  /* =======================================================
     INICIALIZAÇÃO VISUAL
     ======================================================= */

  updateToolVisuals();


applyPenToDrawingEngine();


})();
