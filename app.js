/* =========================================================
   LOUSA CAM
   Função Colar + Texto
   ---------------------------------------------------------

========================================================= */

const $ = id => document.getElementById(id);

const video = $("video");
const canvas = $("canvas");

const ctx = canvas.getContext("2d", {
  alpha: true
});

const startOverlay = $("startOverlay");
const startBtn = $("startBtn");
const statusEl = $("status");
const recordBtn = $("record");


/* =========================================================
   ESTADO PRINCIPAL
========================================================= */

let facingMode = "user";

let stream = null;

let drawing = false;

let tool = "pen";

let color = "#fff";

let lineWidth = 5;


/*
   Antes o projeto utilizava somente strokes.

   Agora usamos um histórico único para que
   desenhos, textos e imagens possam participar
   do mesmo sistema de desfazer/refazer.
*/
let history = [];

let redoStack = [];

let currentStroke = null;


/* =========================================================
   OBJETOS
========================================================= */

let selectedObject = null;

let interaction = null;

let pastePosition = {
  x: 0,
  y: 0
};


/* =========================================================
   CONTROLE DO TOQUE
========================================================= */

let pointerDownData = null;

let pointerMoved = false;

let drawTimer = null;

const TAP_DELAY = 120;

const MOVE_THRESHOLD = 7;


/* =========================================================
   GRAVAÇÃO
========================================================= */

let mediaRecorder = null;

let chunks = [];

let recording = false;

let renderCanvas = null;

let renderCtx = null;

let animationId = null;

let wakeLock = null;


/* =========================================================
   MENSAGENS
========================================================= */

function toast(message, duration = 2200) {

  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;

  statusEl.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {

    statusEl.classList.remove("show");

  }, duration);
}


/* =========================================================
   HISTÓRICO
========================================================= */

function addHistoryItem(item) {

  history.push(item);

  redoStack = [];

  redraw();
}


function undoLastAction() {

  if (!history.length) {
    return;
  }

  redoStack.push(
    history.pop()
  );

  selectedObject = null;

  redraw();
}


function redoLastAction() {

  if (!redoStack.length) {
    return;
  }

  history.push(
    redoStack.pop()
  );

  redraw();
}


/* =========================================================
   CANVAS
========================================================= */

function fitCanvas() {

  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  canvas.width =
    Math.round(
      window.innerWidth * dpr
    );

  canvas.height =
    Math.round(
      window.innerHeight * dpr
    );

  canvas.style.width =
    window.innerWidth + "px";

  canvas.style.height =
    window.innerHeight + "px";

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  redraw();
}


/* =========================================================
   REDESENHAR TUDO
========================================================= */

function redraw() {

  ctx.clearRect(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );

  for (
    const item of history
  ) {

    if (
      item.type === "stroke"
    ) {

      drawStroke(
        ctx,
        item.data
      );

    }

    if (
      item.type === "text"
    ) {

      drawTextObject(
        ctx,
        item.data
      );

    }

    if (
      item.type === "image"
    ) {

      drawImageObject(
        ctx,
        item.data
      );

    }

  }


  /*
     Seleção fica por cima dos objetos.
  */

  if (selectedObject) {

    drawSelection(
      ctx,
      selectedObject
    );

  }

}


/* =========================================================
   DESENHO
========================================================= */

function drawStroke(
  c,
  stroke
) {

  if (
    !stroke ||
    !stroke.points ||
    !stroke.points.length
  ) {

    return;

  }


  c.save();

  c.lineCap = "round";

  c.lineJoin = "round";

  c.lineWidth =
    stroke.width;

  c.globalCompositeOperation =
    stroke.tool === "eraser"
      ? "destination-out"
      : "source-over";

  c.strokeStyle =
    stroke.color;

  c.beginPath();

  c.moveTo(
    stroke.points[0].x,
    stroke.points[0].y
  );


  for (
    let i = 1;
    i < stroke.points.length;
    i++
  ) {

    c.lineTo(
      stroke.points[i].x,
      stroke.points[i].y
    );

  }


  if (
    stroke.points.length === 1
  ) {

    c.lineTo(
      stroke.points[0].x + 0.01,
      stroke.points[0].y + 0.01
    );

  }


  c.stroke();

  c.restore();
}


/* =========================================================
   POSIÇÃO DO TOQUE
========================================================= */

function getPointerPosition(event) {

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


/* =========================================================
   DETECTAR OBJETO
========================================================= */

function getObjectAtPoint(
  x,
  y
) {

  /*
     Percorre de trás para frente,
     pois o último objeto é o que
     está visualmente por cima.
  */

  for (
    let i = history.length - 1;
    i >= 0;
    i--
  ) {

    const item =
      history[i];

    if (
      item.type !== "text" &&
      item.type !== "image"
    ) {

      continue;

    }


    const object =
      item.data;


    if (
      x >= object.x &&
      x <= object.x + object.width &&
      y >= object.y &&
      y <= object.y + object.height
    ) {

      return object;

    }

  }


  return null;
}


/* =========================================================
   DESENHO DE TEXTO
========================================================= */

function drawTextObject(
  c,
  object
) {

  if (!object) {
    return;
  }


  c.save();

  c.globalCompositeOperation =
    "source-over";

  c.fillStyle =
    object.color || "#fff";

  c.font =
    `${object.fontSize || 32}px ${object.fontFamily || "Arial"}`;

  c.textBaseline =
    "top";


  const lines =
    String(object.text || "")
      .split("\n");


  const lineHeight =
    object.lineHeight ||
    Math.round(
      (object.fontSize || 32) * 1.25
    );


  /*
     Quebra linhas muito grandes.
  */

  let currentY =
    object.y;


  for (
    const line of lines
  ) {

    const words =
      line.split(" ");

    let currentLine = "";


    for (
      const word of words
    ) {

      const testLine =
        currentLine
          ? currentLine + " " + word
          : word;

      const width =
        c.measureText(
          testLine
        ).width;


      if (
        width > object.width &&
        currentLine
      ) {

        c.fillText(
          currentLine,
          object.x,
          currentY
        );

        currentY +=
          lineHeight;

        currentLine =
          word;

      } else {

        currentLine =
          testLine;

      }

    }


    if (currentLine) {

      c.fillText(
        currentLine,
        object.x,
        currentY
      );

      currentY +=
        lineHeight;

    }

  }


  c.restore();
}


/* =========================================================
   DESENHO DE IMAGEM
========================================================= */

function drawImageObject(
  c,
  object
) {

  if (
    !object ||
    !object.image
  ) {

    return;

  }


  if (
    !object.imageElement
  ) {

    const img =
      new Image();

    img.onload = () => {

      object.imageElement =
        img;

      redraw();

    };

    img.src =
      object.image;

    object.imageElement =
      img;

  }


  const img =
    object.imageElement;


  if (
    !img.complete
  ) {

    return;

  }


  c.save();

  c.globalCompositeOperation =
    "source-over";

  c.drawImage(
    img,
    object.x,
    object.y,
    object.width,
    object.height
  );

  c.restore();
}


/* =========================================================
   SELEÇÃO DO OBJETO
========================================================= */

function drawSelection(
  c,
  object
) {

  if (!object) {
    return;
  }


  c.save();

  c.globalCompositeOperation =
    "source-over";

  c.strokeStyle =
    "#2f8cff";

  c.lineWidth =
    2;

  c.setLineDash([
    6,
    4
  ]);

  c.strokeRect(
    object.x,
    object.y,
    object.width,
    object.height
  );

  c.setLineDash([]);


  /*
     Cantos de controle.
  */

  const size = 8;


  const points = [

    {
      x: object.x,
      y: object.y
    },

    {
      x: object.x + object.width,
      y: object.y
    },

    {
      x: object.x,
      y: object.y + object.height
    },

    {
      x: object.x + object.width,
      y: object.y + object.height
    }

  ];


  c.fillStyle =
    "#ffffff";

  c.strokeStyle =
    "#2f8cff";

  c.lineWidth =
    2;


  for (
    const point of points
  ) {

    c.beginPath();

    c.arc(
      point.x,
      point.y,
      size / 2,
      0,
      Math.PI * 2
    );

    c.fill();

    c.stroke();

  }


  c.restore();
}


/* =========================================================
   VERIFICAR ALÇA DE REDIMENSIONAMENTO
========================================================= */

function isResizeHandle(
  x,
  y,
  object
) {

  if (!object) {
    return false;
  }


  const handleSize =
    18;


  const hx =
    object.x +
    object.width;

  const hy =
    object.y +
    object.height;


  return (
    Math.abs(x - hx) <=
      handleSize &&
    Math.abs(y - hy) <=
      handleSize
  );
}


/* =========================================================
   INÍCIO DO TOQUE
========================================================= */

function beginPointer(
  event
) {

  if (
    event.target !== canvas
  ) {

    return;

  }


  event.preventDefault();


  const point =
    getPointerPosition(
      event
    );


  pointerDownData = {

    x: point.x,

    y: point.y,

    pointerId:
      event.pointerId,

    type:
      event.pointerType,

    time:
      Date.now()

  };


  pointerMoved =
    false;


  /*
     Se tocou em um objeto,
     prepara seleção/movimento.
  */

  const object =
    getObjectAtPoint(
      point.x,
      point.y
    );


  if (object) {

    selectedObject =
      object;

    if (
      isResizeHandle(
        point.x,
        point.y,
        object
      )
    ) {

      interaction = {

        type: "resize",

        object: object,

        startX: point.x,

        startY: point.y,

        startWidth:
          object.width,

        startHeight:
          object.height

      };

    } else {

      interaction = {

        type: "move",

        object: object,

        startX: point.x,

        startY: point.y,

        startObjectX:
          object.x,

        startObjectY:
          object.y

      };

    }


    redraw();

    return;

  }


  /*
     Área vazia:
     aguardamos alguns milissegundos
     para saber se é toque ou desenho.
  */

  drawTimer =
    setTimeout(() => {

      if (
        !pointerDownData ||
        pointerMoved
      ) {

        return;

      }


      startDrawing(
        event,
        point
      );

    }, TAP_DELAY);

}


/* =========================================================
   COMEÇAR DESENHO
========================================================= */

function startDrawing(
  event,
  point
) {

  if (drawing) {
    return;
  }


  drawing =
    true;


  currentStroke = {

    tool:
      tool,

    color:
      color,

    width:
      lineWidth,

    points: [
      point
    ]

  };


  redoStack = [];


  drawStroke(
    ctx,
    currentStroke
  );
}


/* =========================================================
   MOVIMENTO
========================================================= */

function movePointer(
  event
) {

  if (
    !pointerDownData
  ) {

    return;

  }


  const point =
    getPointerPosition(
      event
    );


  const dx =
    point.x -
    pointerDownData.x;


  const dy =
    point.y -
    pointerDownData.y;


  const distance =
    Math.hypot(
      dx,
      dy
    );


  if (
    distance >
    MOVE_THRESHOLD
  ) {

    pointerMoved =
      true;

    clearTimeout(
      drawTimer
    );

  }


  /*
     Movimento de objeto.
  */

  if (
    interaction &&
    interaction.type === "move"
  ) {

    const object =
      interaction.object;


    object.x =
      interaction.startObjectX +
      (
        point.x -
        interaction.startX
      );


    object.y =
      interaction.startObjectY +
      (
        point.y -
        interaction.startY
      );


    redraw();

    return;
  }


  /*
     Redimensionamento.
  */

  if (
    interaction &&
    interaction.type === "resize"
  ) {

    const object =
      interaction.object;


    object.width =
      Math.max(
        40,
        interaction.startWidth +
        (
          point.x -
          interaction.startX
        )
      );


    object.height =
      Math.max(
        30,
        interaction.startHeight +
        (
          point.y -
          interaction.startY
        )
      );


    redraw();

    return;
  }


  /*
     Desenho.
  */

  if (
    !drawing ||
    !currentStroke
  ) {

    return;

  }


  event.preventDefault();


  const points =
    currentStroke.points;


  const last =
    points[
      points.length - 1
    ];


  const distance =
    Math.hypot(
      point.x - last.x,
      point.y - last.y
    );


  if (
    distance < 0.8
  ) {

    return;

  }


  points.push(
    point
  );


  drawStroke(
    ctx,
    currentStroke
  );
}


/* =========================================================
   FINALIZAR TOQUE
========================================================= */

function endPointer(
  event
) {

  clearTimeout(
    drawTimer
  );


  const point =
    getPointerPosition(
      event
    );


  /*
     Finaliza movimento ou resize.
  */

  if (
    interaction
  ) {

    interaction =
      null;

    pointerDownData =
      null;

    redraw();

    return;

  }


  /*
     Finaliza desenho.
  */

  if (drawing) {

    drawing =
      false;


    if (
      currentStroke &&
      currentStroke.points.length
    ) {

      history.push({

        type:
          "stroke",

        data:
          currentStroke

      });

    }


    currentStroke =
      null;


    pointerDownData =
      null;


    redraw();

    return;

  }


  /*
     Se foi um toque rápido
     em área vazia, abre Colar.
  */

  if (
    pointerDownData &&
    !pointerMoved
  ) {

    pastePosition = {

      x: point.x,

      y: point.y

    };


    openPasteMenu(
      point.x,
      point.y
    );

  }


  pointerDownData =
    null;

}


/* =========================================================
   CANCELAR TOQUE
========================================================= */

function cancelPointer() {

  clearTimeout(
    drawTimer
  );


  drawing =
    false;


  currentStroke =
    null;


  interaction =
    null;


  pointerDownData =
    null;

}


/* =========================================================
   EVENTOS DO CANVAS
========================================================= */

canvas.addEventListener(
  "pointerdown",
  beginPointer,
  {
    passive: false
  }
);


canvas.addEventListener(
  "pointermove",
  movePointer,
  {
    passive: false
  }
);


canvas.addEventListener(
  "pointerup",
  endPointer
);


canvas.addEventListener(
  "pointercancel",
  cancelPointer
);


/* =========================================================
   CORES
========================================================= */

document
  .querySelectorAll(
    ".color"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          color =
            button.dataset.color;

          tool =
            "pen";


          document
            .querySelectorAll(
              ".color"
            )
            .forEach(
              item =>
                item.classList
                  .remove(
                    "active"
                  )
            );


          button.classList
            .add("active");


          const toolName =
            $("toolName");


          if (toolName) {

            toolName.textContent =
              "Caneta";

          }

        }
      );

    }
  );


/* =========================================================
   ESPESSURA
========================================================= */

const widthControl =
  $("width");


if (widthControl) {

  widthControl.addEventListener(
    "input",
    event => {

      lineWidth =
        Number(
          event.target.value
        );

    }
  );

}


/* =========================================================
   BORRACHA
========================================================= */

const eraser =
  $("eraser");


if (eraser) {

  eraser.addEventListener(
    "click",
    () => {

      if (
        tool === "eraser"
      ) {

        tool =
          "pen";


        const toolName =
          $("toolName");


        if (toolName) {

          toolName.textContent =
            "Caneta";

        }


        eraser.style.outline =
          "";

      } else {

        tool =
          "eraser";


        const toolName =
          $("toolName");


        if (toolName) {

          toolName.textContent =
            "Borracha";

        }


        eraser.style.outline =
          "2px solid #fff";

      }

    }
  );

}


/* =========================================================
   DESFAZER
========================================================= */

const undo =
  $("undo");


if (undo) {

  undo.addEventListener(
    "click",
    () => {

      undoLastAction();

    }
  );

}


/* =========================================================
   REFAZER
========================================================= */

const redo =
  $("redo");


if (redo) {

  redo.addEventListener(
    "click",
    () => {

      redoLastAction();

    }
  );

}


/* =========================================================
   LIMPAR
========================================================= */

const clearButton =
  $("clear");


if (clearButton) {

  clearButton.addEventListener(
    "click",
    () => {

      if (
        !history.length
      ) {

        return;

      }


      history =
        [];

      redoStack =
        [];

      selectedObject =
        null;


      redraw();

    }
  );

}


/* =========================================================
   MENU EXISTENTE
========================================================= */

const settings =
  $("settings");


if (settings) {

  settings.addEventListener(
    "click",
    () => {

      const tools =
        $("tools");


      if (tools) {

        tools.classList
          .toggle(
            "open"
          );

      }

    }
  );

}


/* =========================================================
   MENU COLAR
========================================================= */

function createPasteMenu() {

  /*
     Se já existir, não cria outro.
  */

  if (
    document.getElementById(
      "pasteMenu"
    )
  ) {

    return;

  }


  const menu =
    document.createElement(
      "div"
    );


  menu.id =
    "pasteMenu";


  menu.innerHTML = `

    <div class="paste-menu-title">
      O que deseja colar?
    </div>

    <button
      type="button"
      id="pasteTextOption"
      class="paste-menu-option"
    >
      <span class="paste-menu-icon">T</span>
      <span>Texto</span>
    </button>

    <button
      type="button"
      id="pasteImageOption"
      class="paste-menu-option"
    >
      <span class="paste-menu-icon">▧</span>
      <span>Imagem</span>
    </button>

    <button
      type="button"
      id="pasteClipboardOption"
      class="paste-menu-option"
    >
      <span class="paste-menu-icon">▣</span>
      <span>Conteúdo da área de transferência</span>
    </button>

    <button
      type="button"
      id="pasteCancelOption"
      class="paste-menu-cancel"
    >
      Cancelar
    </button>

  `;


  document.body.appendChild(
    menu
  );


  addPasteMenuStyles();


  /*
     Texto.
  */

  document
    .getElementById(
      "pasteTextOption"
    )
    .addEventListener(
      "click",
      () => {

        closePasteMenu();

        createTextFromPrompt();

      }
    );


  /*
     Imagem.
  */

  document
    .getElementById(
      "pasteImageOption"
    )
    .addEventListener(
      "click",
      () => {

        closePasteMenu();

        selectImage();

      }
    );


  /*
     Área de transferência.
  */

  document
    .getElementById(
      "pasteClipboardOption"
    )
    .addEventListener(
      "click",
      async () => {

        closePasteMenu();

        await pasteFromClipboard();

      }
    );


  /*
     Cancelar.
  */

  document
    .getElementById(
      "pasteCancelOption"
    )
    .addEventListener(
      "click",
      () => {

        closePasteMenu();

      }
    );

}


/* =========================================================
   POSICIONAR MENU
========================================================= */

function openPasteMenu(
  x,
  y
) {

  createPasteMenu();


  const menu =
    document.getElementById(
      "pasteMenu"
    );


  if (!menu) {
    return;
  }


  menu.classList
    .add("show");


  /*
     Mantém o menu dentro da tela.
  */

  const margin =
    12;


  const menuWidth =
    310;

  const menuHeight =
    250;


  let left =
    x + 10;


  let top =
    y + 10;


  if (
    left + menuWidth >
    window.innerWidth -
    margin
  ) {

    left =
      window.innerWidth -
      menuWidth -
      margin;

  }


  if (
    top + menuHeight >
    window.innerHeight -
    margin
  ) {

    top =
      window.innerHeight -
      menuHeight -
      margin;

  }


  left =
    Math.max(
      margin,
      left
    );


  top =
    Math.max(
      margin,
      top
    );


  menu.style.left =
    left + "px";


  menu.style.top =
    top + "px";

}


/* =========================================================
   FECHAR MENU
========================================================= */

function closePasteMenu() {

  const menu =
    document.getElementById(
      "pasteMenu"
    );


  if (menu) {

    menu.classList
      .remove(
        "show"
      );

  }

}


/* =========================================================
   ESTILO DO MENU
========================================================= */

function addPasteMenuStyles() {

  if (
    document.getElementById(
      "pasteMenuStyles"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "pasteMenuStyles";


  style.textContent = `

    #pasteMenu {

      position: fixed;

      z-index: 99999;

      width: 310px;

      max-width:
        calc(100vw - 24px);

      box-sizing: border-box;

      padding: 10px;

      border-radius: 18px;

      background:
        rgba(10, 35, 60, 0.97);

      border:
        1px solid
        rgba(80, 170, 255, 0.55);

      box-shadow:
        0 18px 50px
        rgba(0, 0, 0, 0.45);

      backdrop-filter:
        blur(14px);

      -webkit-backdrop-filter:
        blur(14px);

      opacity: 0;

      transform:
        translateY(6px)
        scale(.98);

      pointer-events:
        none;

      transition:
        opacity .15s ease,
        transform .15s ease;

      color: #fff;

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    }


    #pasteMenu.show {

      opacity: 1;

      transform:
        translateY(0)
        scale(1);

      pointer-events:
        auto;

    }


    .paste-menu-title {

      font-size: 15px;

      font-weight: 600;

      padding:
        8px 10px 12px;

      color:
        rgba(255,255,255,.95);

    }


    .paste-menu-option {

      width: 100%;

      display: flex;

      align-items: center;

      gap: 12px;

      border: 0;

      background:
        rgba(255,255,255,.045);

      color: #fff;

      padding:
        13px 10px;

      margin:
        3px 0;

      border-radius: 12px;

      font-size: 14px;

      text-align: left;

      cursor: pointer;

    }


    .paste-menu-option:hover {

      background:
        rgba(50,145,255,.20);

    }


    .paste-menu-option:active {

      background:
        rgba(50,145,255,.30);

    }


    .paste-menu-icon {

      width: 30px;

      height: 30px;

      flex:
        0 0 30px;

      display: flex;

      align-items: center;

      justify-content: center;

      border-radius: 9px;

      background:
        rgba(40,130,255,.18);

      color:
        #8fc8ff;

      font-size: 18px;

      font-weight: 600;

    }


    .paste-menu-cancel {

      width: 100%;

      border: 0;

      background: transparent;

      color:
        rgba(255,255,255,.75);

      padding:
        12px 10px 7px;

      font-size: 14px;

      cursor: pointer;

    }


    .paste-menu-cancel:hover {

      color: #fff;

    }


    @media (
      max-width: 600px
    ) {

      #pasteMenu {

        width:
          calc(100vw - 24px);

      }

    }

  `;


  document.head.appendChild(
    style
  );

}


/* =========================================================
   CRIAR TEXTO
========================================================= */

function createTextFromPrompt() {

  const text =
    window.prompt(
      "Digite o texto:"
    );


  if (
    text === null ||
    !text.trim()
  ) {

    return;

  }


  const object = {

    text:
      text,

    x:
      pastePosition.x,

    y:
      pastePosition.y,

    width:
      350,

    height:
      calculateTextHeight(
        text,
        350,
        32
      ),

    fontSize:
      32,

    lineHeight:
      40,

    fontFamily:
      "Arial",

    color:
      color === "#fff"
        ? "#fff"
        : color

  };


  history.push({

    type:
      "text",

    data:
      object

  });


  redoStack =
    [];


  selectedObject =
    object;


  redraw();

}


/* =========================================================
   BOTÃO TEXTO
========================================================= */

function addTextButton() {

  if (
    document.getElementById(
      "textBtn"
    )
  ) {

    return;

  }


  const button =
    document.createElement(
      "button"
    );


  button.id =
    "textBtn";


  button.type =
    "button";


  button.title =
    "Texto";


  button.setAttribute(
    "aria-label",
    "Texto"
  );


  button.innerHTML =
    "T";


  /*
     Procuramos a barra atual.
  */

  const settingsButton =
    $("settings");


  if (
    settingsButton &&
    settingsButton.parentElement
  ) {

    settingsButton.parentElement
      .insertBefore(
        button,
        settingsButton
      );

  } else {

    document.body
      .appendChild(
        button
      );

  }


  addTextButtonStyles();


  button.addEventListener(
    "click",
    () => {

      /*
         Texto é inserido no
         centro da área visível.
      */

      pastePosition = {

        x:
          Math.max(
            30,
            window.innerWidth / 2 -
            175
          ),

        y:
          Math.max(
            80,
            window.innerHeight / 2 -
            30
          )

      };


      createTextFromPrompt();

    }
  );

}


/* =========================================================
   ESTILO DO BOTÃO TEXTO
========================================================= */

function addTextButtonStyles() {

  if (
    document.getElementById(
      "textButtonStyles"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "textButtonStyles";


  style.textContent = `

    #textBtn {

      width: 38px;

      height: 38px;

      min-width: 38px;

      border: 0;

      border-radius: 10px;

      margin:
        0 2px;

      display: inline-flex;

      align-items: center;

      justify-content: center;

      background:
        transparent;

      color: #fff;

      font-size: 21px;

      font-weight: 600;

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      cursor: pointer;

      touch-action:
        manipulation;

    }


    #textBtn:hover {

      background:
        rgba(255,255,255,.10);

    }


    #textBtn:active {

      background:
        rgba(50,145,255,.30);

    }

  `;


  document.head.appendChild(
    style
  );

}


/* =========================================================
   CALCULAR ALTURA DO TEXTO
========================================================= */

function calculateTextHeight(
  text,
  width,
  fontSize
) {

  const tempCanvas =
    document.createElement(
      "canvas"
    );


  const tempCtx =
    tempCanvas.getContext(
      "2d"
    );


  tempCtx.font =
    `${fontSize}px Arial`;


  const lines =
    String(text)
      .split("\n");


  let totalLines =
    0;


  for (
    const line of lines
  ) {

    if (!line) {

      totalLines++;

      continue;

    }


    const words =
      line.split(" ");


    let current =
      "";


    let lineCount =
      1;


    for (
      const word of words
    ) {

      const test =
        current
          ? current + " " + word
          : word;


      if (
        tempCtx.measureText(
          test
        ).width > width &&
        current
      ) {

        lineCount++;

        current =
          word;

      } else {

        current =
          test;

      }

    }


    totalLines +=
      lineCount;

  }


  return Math.max(
    40,
    totalLines *
    Math.round(
      fontSize * 1.25
    )
  );

}


/* =========================================================
   SELECIONAR IMAGEM
========================================================= */

function selectImage() {

  const input =
    document.createElement(
      "input"
    );


  input.type =
    "file";


  input.accept =
    "image/*";


  input.style.display =
    "none";


  document.body.appendChild(
    input
  );


  input.addEventListener(
    "change",
    () => {

      const file =
        input.files &&
        input.files[0];


      if (!file) {

        input.remove();

        return;

      }


      const reader =
        new FileReader();


      reader.onload =
        event => {

          createImageObject(
            event.target.result
          );


          input.remove();

        };


      reader.readAsDataURL(
        file
      );

    }
  );


  input.click();

}


/* =========================================================
   CRIAR OBJETO IMAGEM
========================================================= */

function createImageObject(
  dataUrl
) {

  const img =
    new Image();


  img.onload =
    () => {

      const maxWidth =
        Math.min(
          420,
          window.innerWidth -
          40
        );


      const ratio =
        img.height /
        Math.max(
          1,
          img.width
        );


      const width =
        maxWidth;


      const height =
        Math.max(
          80,
          width * ratio
        );


      const object = {

        image:
          dataUrl,

        imageElement:
          img,

        x:
          Math.max(
            20,
            pastePosition.x
          ),

        y:
          Math.max(
            60,
            pastePosition.y
          ),

        width:
          width,

        height:
          height

      };


      history.push({

        type:
          "image",

        data:
          object

      });


      redoStack =
        [];


      selectedObject =
        object;


      redraw();

    };


  img.src =
    dataUrl;

}


/* =========================================================
   COLAR DA ÁREA DE TRANSFERÊNCIA
========================================================= */

async function pasteFromClipboard() {

  /*
     Primeiro tentamos Clipboard API
     completa, que pode trazer imagem.
  */

  if (
    navigator.clipboard &&
    navigator.clipboard.read
  ) {

    try {

      const items =
        await navigator.clipboard.read();


      for (
        const item of items
      ) {

        /*
           Procurar imagem.
        */

        const imageType =
          item.types.find(
            type =>
              type.startsWith(
                "image/"
              )
          );


        if (imageType) {

          const blob =
            await item.getType(
              imageType
            );


          const reader =
            new FileReader();


          reader.onload =
            event => {

              createImageObject(
                event.target.result
              );

            };


          reader.readAsDataURL(
            blob
          );


          return;

        }


        /*
           Procurar texto.
        */

        if (
          item.types.includes(
            "text/plain"
          )
        ) {

          const blob =
            await item.getType(
              "text/plain"
            );


          const text =
            await blob.text();


          if (
            text.trim()
          ) {

            createTextObject(
              text
            );

            return;

          }

        }

      }

    } catch (error) {

      console.warn(
        "Clipboard.read não disponível:",
        error
      );

    }

  }


  /*
     Fallback para texto.
  */

  if (
    navigator.clipboard &&
    navigator.clipboard.readText
  ) {

    try {

      const text =
        await navigator.clipboard
          .readText();


      if (
        text &&
        text.trim()
      ) {

        createTextObject(
          text
        );

        return;

      }

    } catch (error) {

      console.warn(
        "Clipboard.readText não disponível:",
        error
      );

    }

  }


  toast(
    "Não foi possível acessar a área de transferência.",
    3500
  );

}


/* =========================================================
   CRIAR TEXTO COLADO
========================================================= */

function createTextObject(
  text
) {

  const width =
    Math.min(
      420,
      window.innerWidth -
      40
    );


  const object = {

    text:
      text,

    x:
      Math.max(
        20,
        pastePosition.x
      ),

    y:
      Math.max(
        60,
        pastePosition.y
      ),

    width:
      width,

    height:
      calculateTextHeight(
        text,
        width,
        32
      ),

    fontSize:
      32,

    lineHeight:
      40,

    fontFamily:
      "Arial",

    color:
      color === "#fff"
        ? "#fff"
        : color

  };


  history.push({

    type:
      "text",

    data:
      object

  });


  redoStack =
    [];


  selectedObject =
    object;


  redraw();

}


/* =========================================================
   ATALHOS DE TECLADO
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    /*
       ESC fecha o menu.
    */

    if (
      event.key ===
      "Escape"
    ) {

      closePasteMenu();

      selectedObject =
        null;

      redraw();

      return;

    }


    /*
       Ctrl + Z
       Cmd + Z
    */

    if (
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
      event.key.toLowerCase() ===
      "z"
    ) {

      event.preventDefault();

      undoLastAction();

      return;

    }


    /*
       Ctrl + Shift + Z
       Cmd + Shift + Z
    */

    if (
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
      event.shiftKey &&
      event.key.toLowerCase() ===
      "z"
    ) {

      event.preventDefault();

      redoLastAction();

    }

  }
);


/* =========================================================
   CÂMERA
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


  if (stream) {

    stream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

  }


  try {

    stream =
      await navigator.mediaDevices
        .getUserMedia({

          video: {

            facingMode: {

              ideal:
                facingMode

            },

            width: {

              ideal:
                1920,

              max:
                1920

            },

            height: {

              ideal:
                1080,

              max:
                1080

            },

            frameRate: {

              ideal:
                30,

              max:
                30

            }

          },

          audio: {

            echoCancellation:
              true,

            noiseSuppression:
              true,

            autoGainControl:
              true

          }

        });


    video.srcObject =
      stream;


    video.classList.toggle(
      "mirror",
      facingMode ===
        "user"
    );


    await video.play();


    startOverlay
      .classList
      .add(
        "hidden"
      );


    await requestWakeLock();


    toast(
      "Câmera ativada"
    );


    return true;


  } catch (error) {

    console.error(
      error
    );


    let message =
      "Não foi possível iniciar a câmera.";


    if (
      error.name ===
      "NotAllowedError"
    ) {

      message =
        "Permita câmera e microfone nas configurações do navegador.";

    }


    if (
      error.name ===
      "NotFoundError"
    ) {

      message =
        "Câmera ou microfone não encontrados.";

    }


    toast(
      message,
      5000
    );


    return false;

  }

}


/* =========================================================
   TROCAR CÂMERA
========================================================= */

const flip =
  $("flip");


if (flip) {

  flip.addEventListener(
    "click",
    async () => {

      facingMode =
        facingMode ===
          "user"
          ? "environment"
          : "user";


      await startCamera();

    }
  );

}


/* =========================================================
   WAKE LOCK
========================================================= */

async function requestWakeLock() {

  try {

    if (
      "wakeLock" in
      navigator
    ) {

      wakeLock =
        await navigator.wakeLock
          .request(
            "screen"
          );

    }

  } catch (error) {

    console.log(
      "Wake Lock indisponível"
    );

  }

}


document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      document.visibilityState ===
        "visible" &&
      stream
    ) {

      await requestWakeLock();

    }

  }
);


/* =========================================================
   FORMATOS DE VÍDEO
========================================================= */

function getSupportedMimeType() {

  const formats = [

    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',

    "video/mp4;codecs=avc1",

    "video/mp4",

    "video/webm;codecs=vp8,opus",

    "video/webm"

  ];


  if (
    !window.MediaRecorder
  ) {

    return "";

  }


  return formats.find(
    type =>
      MediaRecorder
        .isTypeSupported(
          type
        )
  ) || "";

}


/* =========================================================
   VÍDEO COVER
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


  const scale =
    Math.max(
      width / videoWidth,
      height / videoHeight
    );


  const drawWidth =
    videoWidth *
    scale;


  const drawHeight =
    videoHeight *
    scale;


  const x =
    (
      width -
      drawWidth
    ) / 2;


  const y =
    (
      height -
      drawHeight
    ) / 2;


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
   RENDERIZAR OBJETOS NA GRAVAÇÃO
========================================================= */

function renderObject(
  context,
  item
) {

  if (
    item.type ===
    "stroke"
  ) {

    drawStroke(
      context,
      item.data
    );

  }


  if (
    item.type ===
    "text"
  ) {

    drawTextObject(
      context,
      item.data
    );

  }


  if (
    item.type ===
    "image"
  ) {

    drawImageObject(
      context,
      item.data
    );

  }

}


/* =========================================================
   RENDERIZAÇÃO DA GRAVAÇÃO
========================================================= */

function renderFrame() {

  if (
    !recording
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


  if (
    facingMode ===
    "user"
  ) {

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
      window.innerWidth,
    height /
      window.innerHeight
  );


  /*
     Renderiza exatamente
     a mesma lousa que o usuário
     está vendo.

     A seleção NÃO é gravada.
  */

  for (
    const item of history
  ) {

    renderObject(
      renderCtx,
      item
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
    !HTMLCanvasElement
      .prototype
      .captureStream
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
      "Formato de vídeo não suportado neste dispositivo.",
      4000
    );

    return;

  }


  chunks = [];


  renderCanvas =
    document.createElement(
      "canvas"
    );


  const width =
    1920;


  const aspect =
    window.innerWidth /
    Math.max(
      1,
      window.innerHeight
    );


  renderCanvas.width =
    width;


  renderCanvas.height =
    Math.round(
      width /
      aspect
    );


  renderCtx =
    renderCanvas.getContext(
      "2d"
    );


  recording =
    true;


  renderFrame();


  const outputStream =
    renderCanvas.captureStream(
      30
    );


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

          mimeType:
            mime,

          videoBitsPerSecond:
            6000000

        }
      );


  } catch (error) {

    recording =
      false;


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

      if (
        event.data &&
        event.data.size
      ) {

        chunks.push(
          event.data
        );

      }

    };


  mediaRecorder.onerror =
    event => {

      console.error(
        event
      );


      toast(
        "Erro durante a gravação.",
        4000
      );

    };


  mediaRecorder.onstop =
    exportRecording;


  mediaRecorder.start(
    1000
  );


  if (recordBtn) {

    recordBtn.classList
      .add(
        "recording"
      );

  }


  toast(
    "Gravando…"
  );

}


/* =========================================================
   PARAR GRAVAÇÃO
========================================================= */

function stopRecording() {

  if (
    !mediaRecorder
  ) {

    return;

  }


  recording =
    false;


  cancelAnimationFrame(
    animationId
  );


  if (
    mediaRecorder.state !==
    "inactive"
  ) {

    mediaRecorder.stop();

  }


  if (recordBtn) {

    recordBtn.classList
      .remove(
        "recording"
      );

  }


  toast(
    "Processando vídeo…",
    3000
  );

}


/* =========================================================
   BOTÃO GRAVAR
========================================================= */

if (recordBtn) {

  recordBtn.addEventListener(
    "click",
    () => {

      if (
        recording
      ) {

        stopRecording();

      } else {

        startRecording();

      }

    }
  );

}


/* =========================================================
   EXPORTAR VÍDEO
========================================================= */

async function exportRecording() {

  const type =
    mediaRecorder?.mimeType ||
    "video/mp4";


  const extension =
    type.includes(
      "webm"
    )
      ? "webm"
      : "mp4";


  const blob =
    new Blob(
      chunks,
      {
        type
      }
    );


  if (
    !blob.size
  ) {

    toast(
      "A gravação ficou vazia.",
      4000
    );

    return;

  }


  const filename =
    `lousa-cam-${new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      )
    }.${extension}`;


  const file =
    new File(
      [blob],
      filename,
      {
        type
      }
    );


  if (
    navigator.canShare &&
    navigator.canShare({
      files: [
        file
      ]
    })
  ) {

    try {

      await navigator.share({

        files: [
          file
        ],

        title:
          "Lousa Cam",

        text:
          "Vídeo gravado no Lousa Cam"

      });


      toast(
        "Vídeo compartilhado."
      );


      return;


    } catch (error) {

      if (
        error.name ===
        "AbortError"
      ) {

        toast(
          "Compartilhamento cancelado."
        );


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


  link.href =
    url;


  link.download =
    filename;


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    15000
  );


  toast(
    `Vídeo salvo como ${extension.toUpperCase()}.`,
    3500
  );

}


/* =========================================================
   INICIAR
========================================================= */

if (startBtn) {

  startBtn.addEventListener(
    "click",
    startCamera
  );

}


/* =========================================================
   REDIMENSIONAMENTO
========================================================= */

window.addEventListener(
  "resize",
  fitCanvas
);


window.addEventListener(
  "orientationchange",
  () => {

    setTimeout(
      fitCanvas,
      300
    );

  }
);


/* =========================================================
   SERVICE WORKER
========================================================= */

if (
  "serviceWorker" in
  navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "./sw.js"
        )
        .catch(
          console.error
        );

    }
  );

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

createPasteMenu();

addTextButton();

fitCanvas();
