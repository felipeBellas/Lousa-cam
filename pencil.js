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
  <div class="pencil-ruler-scale"></div>
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

   /* =======================================================
   FORMAS — ETAPA 4H
   ======================================================= */

const shapeSettings = {

  color:
    "#ffffff",

  size:
    3,

  selected:
    "line"

};


const shapes = [

  {
    id: "line",
    label: "Linha",
    symbol: "╱"
  },

  {
    id: "arrow",
    label: "Seta",
    symbol: "→"
  },

  {
    id: "rectangle",
    label: "Retângulo",
    symbol: "▭"
  },

  {
    id: "square",
    label: "Quadrado",
    symbol: "□"
  },

  {
    id: "circle",
    label: "Círculo",
    symbol: "○"
  },

  {
    id: "ellipse",
    label: "Elipse",
    symbol: "⬭"
  },

  {
    id: "triangle",
    label: "Triângulo",
    symbol: "△"
  },

  {
    id: "diamond",
    label: "Losango",
    symbol: "◇"
  },

  {
    id: "pentagon",
    label: "Pentágono",
    symbol: "⬠"
  },

  {
    id: "hexagon",
    label: "Hexágono",
    symbol: "⬡"
  },

  {
    id: "star",
    label: "Estrela",
    symbol: "☆"
  },

  {
    id: "speech",
    label: "Balão",
    symbol: "▢"
  }

];


  let activeTool =
    "pen";


  let pencilVisible =
    false;


  let pencilExpanded =
    false;


  let rulerVisible =
  false;


/* =======================================================
   RÉGUA — ETAPA 4F

   Estado geométrico independente
   do motor principal da lousa.
   ======================================================= */

const rulerState = {

  x:
    window.innerWidth / 2,

  y:
    window.innerHeight / 2,

  angle:
    0,

  width:
    Math.min(
      320,
      window.innerWidth - 40
    )

};


const RULER_MIN_WIDTH =
  180;


const RULER_MAX_WIDTH =
  700;


const rulerPointers =
  new Map();


let rulerGesture =
  null;


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
   LÁPIS — ETAPA 4D
   ======================================================= */

function applyPencilToDrawingEngine() {

  if (
    activeTool !==
    "pencil"
  ) {

    return;

  }


  const pencilSettings =
    toolSettings.pencil;


  if (
    !pencilSettings
  ) {

    return;

  }


  if (
    !window.LousaCamPencil ||
    typeof window.LousaCamPencil.setPencil !==
      "function"
  ) {

    console.warn(
      "Pencil: ponte do Lápis não encontrada."
    );

    return;

  }


  window.LousaCamPencil.setPencil(
    pencilSettings.color,
    pencilSettings.size
  );

}

   /* =======================================================
   PINCEL — ETAPA 4E
   ======================================================= */

function applyBrushToDrawingEngine() {

  if (
    activeTool !==
    "brush"
  ) {

    return;

  }


  const brushSettings =
    toolSettings.brush;


  if (
    !brushSettings
  ) {

    return;

  }


  if (
    !window.LousaCamPencil ||
    typeof window.LousaCamPencil.setBrush !==
      "function"
  ) {

    console.warn(
      "Pencil: ponte do Pincel não encontrada."
    );

    return;

  }


  window.LousaCamPencil.setBrush(
    brushSettings.color,
    brushSettings.size
  );

}

   /* =======================================================
   RÉGUA — ETAPA 4F
   ======================================================= */


/*
  Atualiza a posição e a rotação
  visual da Régua.
*/

function updateRulerTransform() {

  ruler.style.left =
    `${rulerState.x}px`;

  ruler.style.top =
    `${rulerState.y}px`;

  ruler.style.width =
    `${rulerState.width}px`;

  ruler.style.transform =
    `translate(-50%, -50%)
     rotate(${rulerState.angle}rad)`;

  updateRulerScale();

}

   function updateRulerScale() {

  const scale =
    ruler.querySelector(
      ".pencil-ruler-scale"
    );


  if (!scale) {

    return;

  }


  scale.innerHTML =
    "";


  /*
    Cada divisão principal ocupa
    aproximadamente 40 px.

    As subdivisões são criadas
    visualmente pelo CSS.
  */

  const usableWidth =
    Math.max(
      0,
      rulerState.width - 28
    );


  const majorSpacing =
    40;


  const divisions =
    Math.floor(
      usableWidth /
      majorSpacing
    );


  for (
    let i = 0;
    i <= divisions;
    i++
  ) {

    const mark =
      document.createElement(
        "div"
      );


    mark.className =
      "pencil-ruler-major";


    mark.style.left =
      `${i * majorSpacing}px`;


    const tick =
      document.createElement(
        "span"
      );


    tick.className =
      "pencil-ruler-major-tick";


    const number =
      document.createElement(
        "span"
      );


    number.className =
      "pencil-ruler-number";


    number.textContent =
      String(i);


    mark.appendChild(
      tick
    );


    mark.appendChild(
      number
    );


    scale.appendChild(
      mark
    );

  }

}

/*
  Mantém o centro da Régua
  dentro da área visível.
*/

function keepRulerInsideViewport() {

  const margin =
    30;

  rulerState.x =
    Math.min(
      window.innerWidth - margin,
      Math.max(
        margin,
        rulerState.x
      )
    );

  rulerState.y =
    Math.min(
      window.innerHeight - margin,
      Math.max(
        margin,
        rulerState.y
      )
    );

  updateRulerTransform();

}


/*
  Retorna informações geométricas
  da linha-guia da Régua.

  A linha branca visual fica
  próxima à borda inferior.
*/

function getRulerGeometry() {

  const width =
    ruler.offsetWidth;

  const height =
    ruler.offsetHeight;

  /*
  GUIA DE DESENHO DA RÉGUA

  O traço deve acompanhar a borda
  física inferior da Régua,
  e não a linha branca interna.
*/

const guideOffsetY =
  height / 2;

  return {

    centerX:
      rulerState.x,

    centerY:
      rulerState.y,

    angle:
      rulerState.angle,

    halfWidth:
      Math.max(
        0,
        width / 2 - 12
      ),

    guideOffsetY:
      guideOffsetY

  };

}


/*
  Projeta um ponto do canvas
  sobre a linha da Régua.

  force = false:
  só ativa quando o desenho começa
  próximo da borda.

  force = true:
  mantém o restante daquele traço
  preso à mesma linha.
*/

function projectPointToRuler(
  point,
  force = false
) {

  if (
    !rulerVisible ||
    !point
  ) {

    return null;

  }


  const geometry =
    getRulerGeometry();


  const cos =
    Math.cos(
      geometry.angle
    );

  const sin =
    Math.sin(
      geometry.angle
    );


  /*
    Converte o ponto global
    para coordenadas locais
    da Régua.
  */

  const dx =
    point.x -
    geometry.centerX;

  const dy =
    point.y -
    geometry.centerY;


  const localX =
    dx * cos +
    dy * sin;

  const localY =
    -dx * sin +
    dy * cos;


  /*
    A linha-guia fica na borda
    inferior da Régua.
  */

  const guideY =
    geometry.guideOffsetY;


  /*
    Limites horizontais úteis
    da Régua.
  */

  const insideHorizontalRange =
    localX >=
      -geometry.halfWidth -
        12 &&
    localX <=
      geometry.halfWidth +
        12;


  /*
    Distância até a borda
    de desenho.
  */

  const distanceToGuide =
    Math.abs(
      localY -
      guideY
    );


  /*
    Zona de atração.

    Um valor moderado evita
    que a Régua capture traços
    feitos longe dela.
  */

  const SNAP_DISTANCE =
    26;


  /*
    -------------------------------------------------------
    INÍCIO DO TRAÇO
    -------------------------------------------------------

    O traço entra no modo guiado quando:

    1. começa próximo da borda;

    OU

    2. começa dentro da área física
       da Régua, próximo à sua largura.

    Assim a Régua passa a agir como
    uma barreira real.
  */

  if (!force) {

    const nearGuide =
      insideHorizontalRange &&
      distanceToGuide <=
        SNAP_DISTANCE;


    /*
      O corpo da Régua ocupa a região
      acima da borda inferior.

      localY menor que guideY significa
      que o ponto entrou no corpo
      visual da Régua.
    */

    const insideRulerBody =
      insideHorizontalRange &&
      localY <= guideY &&
      localY >=
        -geometry.guideOffsetY;


    if (
      !nearGuide &&
      !insideRulerBody
    ) {

      return null;

    }

  }


  /*
    -------------------------------------------------------
    PROJEÇÃO HORIZONTAL
    -------------------------------------------------------

    Depois que o traço foi capturado,
    ele permanece exatamente sobre
    a borda.
  */

  const projectedX =
    Math.max(
      -geometry.halfWidth,
      Math.min(
        geometry.halfWidth,
        localX
      )
    );


  const projectedY =
    guideY;


  /*
    Converte novamente para
    coordenadas globais.
  */

  return {

    x:
      geometry.centerX +
      projectedX * cos -
      projectedY * sin,

    y:
      geometry.centerY +
      projectedX * sin +
      projectedY * cos

  };

}


/*
  Expõe somente a projeção necessária
  para o motor de desenho do app.js.

  Não substitui as pontes existentes
  de Caneta, Pincel, Lápis etc.
*/

window.LousaCamPencil.projectPointToRuler =
  projectPointToRuler;

/* =======================================================
   RÉGUA — PONTE PARA GRAVAÇÃO

   Expõe somente uma CÓPIA do estado visual.
   Não permite que app.js altere a Régua.
   ======================================================= */

window.LousaCamPencil.getRulerRecordingState =
  function () {

    if (!rulerVisible) {

      return null;

    }


    return {

      visible:
        true,

      x:
        rulerState.x,

      y:
        rulerState.y,

      angle:
        rulerState.angle,

      width:
        rulerState.width,

      height:
        ruler.offsetHeight || 58

    };

  };

   
/* =======================================================
   GESTOS DA RÉGUA
   ======================================================= */

function getRulerPointerCenter() {

  const points =
    Array.from(
      rulerPointers.values()
    );


  if (!points.length) {

    return null;

  }


  if (points.length === 1) {

    return {

      x:
        points[0].x,

      y:
        points[0].y

    };

  }


  return {

    x:
      (
        points[0].x +
        points[1].x
      ) / 2,

    y:
      (
        points[0].y +
        points[1].y
      ) / 2

  };

}


function getRulerPointerAngle() {

  const points =
    Array.from(
      rulerPointers.values()
    );


  if (points.length < 2) {

    return 0;

  }


  return Math.atan2(
    points[1].y -
      points[0].y,

    points[1].x -
      points[0].x
  );

}


ruler.addEventListener(
  "pointerdown",
  event => {

    event.preventDefault();
    event.stopPropagation();


    rulerPointers.set(
      event.pointerId,
      {
        x:
          event.clientX,

        y:
          event.clientY
      }
    );


    try {

      ruler.setPointerCapture(
        event.pointerId
      );

    } catch (error) {

      /* sem ação */

    }


    const center =
      getRulerPointerCenter();


    if (
      rulerPointers.size === 1
    ) {

      rulerGesture = {

        type:
          "move",

        startPointerX:
          center.x,

        startPointerY:
          center.y,

        startX:
          rulerState.x,

        startY:
          rulerState.y

      };

    } else {

     rulerGesture = {

  type:
    "transform",

  startCenterX:
    center.x,

  startCenterY:
    center.y,

  startX:
    rulerState.x,

  startY:
    rulerState.y,

  startAngle:
    rulerState.angle,

  pointerAngle:
    getRulerPointerAngle(),

  startDistance:
    getRulerPointerDistance(),

  startWidth:
    rulerState.width

};

    }

  }
);

   function getRulerPointerDistance() {

  const points =
    Array.from(
      rulerPointers.values()
    );


  if (
    points.length < 2
  ) {

    return 0;

  }


  const dx =
    points[1].x -
    points[0].x;


  const dy =
    points[1].y -
    points[0].y;


  return Math.hypot(
    dx,
    dy
  );

}


ruler.addEventListener(
  "pointermove",
  event => {

    if (
      !rulerPointers.has(
        event.pointerId
      )
    ) {

      return;

    }


    event.preventDefault();
    event.stopPropagation();


    rulerPointers.set(
      event.pointerId,
      {
        x:
          event.clientX,

        y:
          event.clientY
      }
    );


    if (!rulerGesture) {

      return;

    }


    const center =
      getRulerPointerCenter();


    /*
      UM DEDO:
      mover.
    */

    if (
      rulerPointers.size === 1 &&
      rulerGesture.type ===
        "move"
    ) {

      rulerState.x =
        rulerGesture.startX +
        (
          center.x -
          rulerGesture.startPointerX
        );

      rulerState.y =
        rulerGesture.startY +
        (
          center.y -
          rulerGesture.startPointerY
        );


      keepRulerInsideViewport();

      return;

    }


    /*
      DOIS DEDOS:
      mover + girar.
    */

    if (
      rulerPointers.size >= 2
    ) {

      if (
        rulerGesture.type !==
        "transform"
      ) {

        rulerGesture = {

  type:
    "transform",

  startCenterX:
    center.x,

  startCenterY:
    center.y,

  startX:
    rulerState.x,

  startY:
    rulerState.y,

  startAngle:
    rulerState.angle,

  pointerAngle:
    getRulerPointerAngle(),

  startDistance:
    getRulerPointerDistance(),

  startWidth:
    rulerState.width

};

      }


      const currentAngle =
        getRulerPointerAngle();


      rulerState.angle =
        rulerGesture.startAngle +
        (
          currentAngle -
          rulerGesture.pointerAngle
        );

       const currentDistance =
  getRulerPointerDistance();


if (
  rulerGesture.startDistance > 0
) {

  const scaleFactor =
    currentDistance /
    rulerGesture.startDistance;


  rulerState.width =
    Math.max(
      RULER_MIN_WIDTH,
      Math.min(
        RULER_MAX_WIDTH,
        rulerGesture.startWidth *
        scaleFactor
      )
    );

}


      rulerState.x =
        rulerGesture.startX +
        (
          center.x -
          rulerGesture.startCenterX
        );

      rulerState.y =
        rulerGesture.startY +
        (
          center.y -
          rulerGesture.startCenterY
        );


      keepRulerInsideViewport();

    }

  }
);


function finishRulerPointer(
  event
) {

  if (
    !rulerPointers.has(
      event.pointerId
    )
  ) {

    return;

  }


  event.preventDefault();
  event.stopPropagation();


  rulerPointers.delete(
    event.pointerId
  );


  try {

    if (
      ruler.hasPointerCapture(
        event.pointerId
      )
    ) {

      ruler.releasePointerCapture(
        event.pointerId
      );

    }

  } catch (error) {

    /* sem ação */

  }


  /*
    Se ainda sobrou um dedo,
    ele passa a controlar
    novamente apenas o movimento.
  */

  if (
    rulerPointers.size === 1
  ) {

    const center =
      getRulerPointerCenter();


    rulerGesture = {

      type:
        "move",

      startPointerX:
        center.x,

      startPointerY:
        center.y,

      startX:
        rulerState.x,

      startY:
        rulerState.y

    };

  } else {

    rulerGesture =
      null;

  }

}


ruler.addEventListener(
  "pointerup",
  finishRulerPointer
);


ruler.addEventListener(
  "pointercancel",
  finishRulerPointer
);


updateRulerTransform();

   
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
  ) ||

  (
    id === "more" &&
    activeTool === "shape"
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

if (
  toolId ===
  "pencil"
) {

  applyPencilToDrawingEngine();

}

/*
  PINCEL
*/

if (
  toolId ===
  "brush"
) {

  applyBrushToDrawingEngine();

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


if (
  toolId ===
  "marker"
) {

  applyMarkerToDrawingEngine();

}

               
if (
  toolId ===
  "pencil"
) {

  applyPencilToDrawingEngine();

}

/*
  PINCEL
*/

if (
  toolId ===
  "brush"
) {

  applyBrushToDrawingEngine();

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
     
     if (
  toolId ===
  "marker"
   ) {

    applyMarkerToDrawingEngine();

}
     if (
  toolId ===
  "pencil"
) {

  applyPencilToDrawingEngine();

}

/*
  PINCEL
*/

if (
  toolId ===
  "brush"
) {

  applyBrushToDrawingEngine();

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
   FORMAS — ETAPA 4H
   ======================================================= */

function applyShapeToDrawingEngine(
  shapeId
) {

  shapeSettings.selected =
    shapeId;


  if (
    !window.LousaCamPencil ||
    typeof window.LousaCamPencil.setShape !==
      "function"
  ) {

    console.warn(
      "Pencil: ponte das Formas não encontrada."
    );

    return;

  }


  window.LousaCamPencil.setShape(
    shapeId,
    shapeSettings.color,
    shapeSettings.size
  );

}


function openShapesPanel() {

  contextTool =
    "more";


  contextPanel.innerHTML =
    "";


  /* -----------------------
     TÍTULO
     ----------------------- */

  const title =
    document.createElement(
      "div"
    );


  title.className =
    "pencil-context-title";


  title.textContent =
    "Formas";


  contextPanel.appendChild(
    title
  );


  /* -----------------------
     FORMAS
     ----------------------- */

  const shapeGrid =
    document.createElement(
      "div"
    );


  shapeGrid.style.display =
    "grid";


  shapeGrid.style.gridTemplateColumns =
    "repeat(4, 1fr)";


  shapeGrid.style.gap =
    "6px";


  shapeGrid.style.padding =
    "4px 0 8px";


  shapes.forEach(
    shape => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.style.minWidth =
        "42px";


      button.style.height =
        "42px";


      button.style.border =
        "1px solid rgba(255,255,255,.18)";


      button.style.borderRadius =
        "8px";


      button.style.background =
        shapeSettings.selected ===
          shape.id
          ? "rgba(255,255,255,.20)"
          : "rgba(255,255,255,.06)";


      button.style.color =
        "#fff";


      button.style.fontSize =
        "22px";


      button.style.display =
        "flex";


      button.style.alignItems =
        "center";


      button.style.justifyContent =
        "center";


      button.style.cursor =
        "pointer";


      button.textContent =
        shape.symbol;


      button.setAttribute(
        "aria-label",
        shape.label
      );


      button.setAttribute(
        "title",
        shape.label
      );


      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          event.stopPropagation();


          activeTool =
            "shape";


          applyShapeToDrawingEngine(
            shape.id
          );


          updateToolVisuals();


          openShapesPanel();

        }
      );


      shapeGrid.appendChild(
        button
      );

    }
  );


  contextPanel.appendChild(
    shapeGrid
  );


  /* -----------------------
     ESPESSURA
     ----------------------- */

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


      button.classList.toggle(
        "active",
        shapeSettings.size ===
          size
      );


      button.setAttribute(
        "aria-label",
        `Espessura ${size}`
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


          shapeSettings.size =
            size;


          applyShapeToDrawingEngine(
            shapeSettings.selected
          );


          openShapesPanel();

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


  /* -----------------------
     CORES
     ----------------------- */

  const colors =
    document.createElement(
      "div"
    );


  colors.className =
    "pencil-colors";


  colorOptions.forEach(
    shapeColor => {

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
        shapeColor
      );


      button.classList.toggle(
        "active",
        shapeSettings.color ===
          shapeColor
      );


      button.setAttribute(
        "aria-label",
        `Cor ${shapeColor}`
      );


      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          event.stopPropagation();


          shapeSettings.color =
            shapeColor;


          applyShapeToDrawingEngine(
            shapeSettings.selected
          );


          openShapesPanel();

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
    shapeSettings.color;


  colorInput.addEventListener(
    "input",
    event => {

      shapeSettings.color =
        event.target.value;


      applyShapeToDrawingEngine(
        shapeSettings.selected
      );

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


  if (rulerVisible) {

    keepRulerInsideViewport();

  } else {

    rulerPointers.clear();

    rulerGesture =
      null;

  }


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

  if (
    contextTool ===
    "more"
  ) {

    closeContextPanel();

    return;

  }


  openShapesPanel();

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


/*
  MARCADOR
*/

if (
  toolId ===
  "marker"
) {

  applyMarkerToDrawingEngine();

}


/*
  LÁPIS
*/

if (
  toolId ===
  "pencil"
) {

  applyPencilToDrawingEngine();

}

/*
  PINCEL
*/

if (
  toolId ===
  "brush"
) {

  applyBrushToDrawingEngine();

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
