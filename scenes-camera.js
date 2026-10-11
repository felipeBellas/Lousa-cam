
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — SCENES-CAMERA.JS
   ETAPA 3 — BARRA DE NAVEGAÇÃO COM ÍCONES

   - Câmera, Galeria, Teleprompter e Cenas com ícones
   - Preserva os botões e eventos originais
   - Mantém a navegação lateral entre cenas
   - Mantém a visualização sobre a câmera
   - Não modifica gravação, Pencil ou MediaRecorder
   ========================================================= */

(() => {

  const Player = window.ScenesPlayer;

  const app = document.getElementById("app");
  const dock = document.getElementById("modeDock");

  const cameraButton =
    document.getElementById("cameraModeButton");

  const galleryButton =
    document.getElementById("galleryModeButton");

  const teleprompterButton =
    document.getElementById("teleprompterButton");

  if (
    !Player ||
    !app ||
    !dock ||
    !cameraButton ||
    !galleryButton ||
    !teleprompterButton
  ) {

    console.error(
      "[ScenesCamera] Dependências indisponíveis."
    );

    return;
  }

  /* =====================================================
     ÍCONES SVG
     ===================================================== */

  const ICONS = {

    camera: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3" y="5"
          width="13" height="14"
          rx="2"
        />
        <path d="m16 10 5-3v10l-5-3z"/>
      </svg>
    `,

    gallery: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3" y="3"
          width="18" height="18"
          rx="2"
        />
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="m21 15-5-5L5 21"/>
      </svg>
    `,

    teleprompter: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="4" y="3"
          width="16" height="18"
          rx="2"
        />
        <path d="M8 8h8"/>
        <path d="M8 12h8"/>
        <path d="M8 16h5"/>
      </svg>
    `,

    scenes: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3" y="4"
          width="18" height="14"
          rx="2"
        />
        <path d="M8 21h8"/>
        <path d="M12 18v3"/>
        <path d="m10 8 5 3-5 3z"/>
      </svg>
    `

  };

  /* =====================================================
     ESTILOS
     ===================================================== */

  const style = document.createElement("style");

  style.textContent = `

    /* ---------------------------------------------
       BARRA INFERIOR
       --------------------------------------------- */

    #modeDock {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      max-width: calc(100% - 12px);
    }

    #modeDock button {
      box-sizing: border-box;
      width: 52px;
      min-width: 52px;
      height: 42px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 1;
      font-size: 0;
      touch-action: manipulation;
    }

    #modeDock button svg {
      display: block;
      width: 23px;
      height: 23px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    #modeDock button.active {
      color: #ffffff;
    }

    @media (max-width: 390px) {

      #modeDock {
        gap: 2px;
      }

      #modeDock button {
        width: 45px;
        min-width: 45px;
        height: 40px;
      }

      #modeDock button svg {
        width: 21px;
        height: 21px;
      }

    }

    /* ---------------------------------------------
       CANVAS DAS CENAS
       --------------------------------------------- */

    #scenesCameraCanvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
      display: none;
      pointer-events: none;
    }

    /* ---------------------------------------------
       SETAS LATERAIS
       --------------------------------------------- */

    #scenesCameraPrev,
    #scenesCameraNext {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 36;
      display: none;
      align-items: center;
      justify-content: center;
      width: 46px;
      height: 60px;
      padding: 0;
      border: 1px solid rgba(255,255,255,.24);
      border-radius: 15px;
      background: rgba(20,23,30,.50);
      color: white;
      font: 32px system-ui, sans-serif;
      cursor: pointer;
      touch-action: manipulation;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    #scenesCameraPrev {
      left: max(8px, env(safe-area-inset-left));
    }

    #scenesCameraNext {
      right: max(8px, env(safe-area-inset-right));
    }

    #scenesCameraPrev:disabled,
    #scenesCameraNext:disabled {
      opacity: .24;
      pointer-events: none;
    }

    /* ---------------------------------------------
       SELETOR DE APRESENTAÇÕES
       --------------------------------------------- */

    #scenesCameraDialog {
      position: absolute;
      inset: 0;
      z-index: 60;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0,0,0,.65);
      color: white;
      font: 15px system-ui, Arial, sans-serif;
    }

    #scenesCameraDialog .sc-panel {
      width: min(430px, 100%);
      max-height: 80dvh;
      overflow: auto;
      background: #202532;
      border: 1px solid #555d6e;
      border-radius: 16px;
      padding: 18px;
    }

    #scenesCameraDialog .sc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    #scenesCameraDialog button {
      appearance: none;
      border: 1px solid rgba(255,255,255,.22);
      background: #343a49;
      color: white;
      border-radius: 10px;
      padding: 10px 12px;
      font: inherit;
      cursor: pointer;
      touch-action: manipulation;
    }

    #scenesCameraList {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    #scenesCameraList button {
      width: 100%;
      text-align: left;
    }

    #scenesCameraStatus {
      margin: 12px 0 0;
      color: #d1d5db;
      font-size: 13px;
    }

    @media (max-width: 430px) {

      #scenesCameraPrev,
      #scenesCameraNext {
        width: 40px;
        height: 54px;
      }

    }

  `;

  document.head.appendChild(style);

  /* =====================================================
     CONVERTER BOTÕES EXISTENTES EM ÍCONES

     Preserva:
     - IDs
     - Classes
     - Eventos de clique
     - aria-pressed
     - Funcionamento original
     ===================================================== */

  function applyIcon(button, icon, label) {

    button.innerHTML = icon;

    button.setAttribute(
      "aria-label",
      label
    );

    button.title = label;
  }

  applyIcon(
    cameraButton,
    ICONS.camera,
    "Câmera"
  );

  applyIcon(
    galleryButton,
    ICONS.gallery,
    "Galeria"
  );

  applyIcon(
    teleprompterButton,
    ICONS.teleprompter,
    "Teleprompter"
  );

  /* =====================================================
     BOTÃO CENAS
     ===================================================== */

  let scenesButton =
    document.getElementById("scenesCameraDockButton");

  if (!scenesButton) {

    scenesButton = document.createElement("button");

    scenesButton.id = "scenesCameraDockButton";
    scenesButton.type = "button";

    teleprompterButton.insertAdjacentElement(
      "afterend",
      scenesButton
    );
  }

  applyIcon(
    scenesButton,
    ICONS.scenes,
    "Abrir cenas"
  );

  scenesButton.setAttribute(
    "aria-pressed",
    "false"
  );

  /* =====================================================
     CANVAS
     ===================================================== */

  const canvas = document.createElement("canvas");

  canvas.id = "scenesCameraCanvas";

  canvas.setAttribute(
    "aria-hidden",
    "true"
  );

  app.appendChild(canvas);

  /* =====================================================
     SETAS LATERAIS
     ===================================================== */

  const prev = document.createElement("button");

  prev.id = "scenesCameraPrev";
  prev.type = "button";
  prev.textContent = "‹";

  prev.setAttribute(
    "aria-label",
    "Cena anterior"
  );

  const next = document.createElement("button");

  next.id = "scenesCameraNext";
  next.type = "button";
  next.textContent = "›";

  next.setAttribute(
    "aria-label",
    "Próxima cena"
  );

  app.appendChild(prev);
  app.appendChild(next);

  /* =====================================================
     SELETOR DE APRESENTAÇÕES
     ===================================================== */

  const dialog = document.createElement("div");

  dialog.id = "scenesCameraDialog";

  dialog.setAttribute(
    "role",
    "dialog"
  );

  dialog.setAttribute(
    "aria-modal",
    "true"
  );

  dialog.setAttribute(
    "aria-label",
    "Selecionar apresentação"
  );

  dialog.innerHTML = `

    <div class="sc-panel">

      <div class="sc-header">

        <strong>Apresentações salvas</strong>

        <button
          type="button"
          id="scenesCameraDismiss">
          Fechar
        </button>

      </div>

      <div id="scenesCameraList"></div>

      <p
        id="scenesCameraStatus"
        role="status"></p>

    </div>

  `;

  app.appendChild(dialog);

  const dismiss =
    dialog.querySelector("#scenesCameraDismiss");

  const list =
    dialog.querySelector("#scenesCameraList");

  const status =
    dialog.querySelector("#scenesCameraStatus");

  /* =====================================================
     DIMENSIONAMENTO
     ===================================================== */

  function syncSize() {

    const pixelRatio =
      window.devicePixelRatio || 1;

    const width = Math.max(
      1,
      Math.round(
        app.clientWidth * pixelRatio
      )
    );

    const height = Math.max(
      1,
      Math.round(
        app.clientHeight * pixelRatio
      )
    );

    if (
      canvas.width !== width ||
      canvas.height !== height
    ) {

      canvas.width = width;
      canvas.height = height;

      if (Player.isActive()) {
        Player.render();
      }
    }
  }

  /* =====================================================
     ESTADO E VISIBILIDADE — CONTROLE ÚNICO
     ===================================================== */

  const galleryLayer =
    document.getElementById("galleryLayer");

  let scenesVisible = false;
  let opening = false;
  let selectionGeneration = 0;

  function isGalleryOpen() {

    return !!galleryLayer?.classList.contains("show");
  }

  function isTeleprompterOpen() {

    return document.body.classList.contains(
      "teleprompter-active"
    );
  }

  function syncVisibility() {

    const state = Player.getState();

    const visible = !!(
      scenesVisible &&
      state.active &&
      !isGalleryOpen() &&
      !isTeleprompterOpen()
    );

    canvas.style.display =
      visible ? "block" : "none";

    prev.style.display =
      visible ? "flex" : "none";

    next.style.display =
      visible ? "flex" : "none";

    prev.disabled = !state.hasPrevious;
    next.disabled = !state.hasNext;

    scenesButton.classList.toggle(
      "active",
      visible
    );

    scenesButton.setAttribute(
      "aria-pressed",
      String(visible)
    );

    scenesButton.setAttribute(
      "aria-label",
      visible ? "Ocultar cenas" : "Abrir cenas"
    );

    scenesButton.title =
      visible ? "Ocultar cenas" : "Abrir cenas";
  }

  function hideDialog() {

    selectionGeneration++;

    dialog.style.display = "none";
  }

  function suspendScenes() {

    scenesVisible = false;

    hideDialog();

    syncVisibility();
  }

  /* =====================================================
     SELETOR DE APRESENTAÇÕES
     ===================================================== */

  async function showDialog() {

    const generation =
      ++selectionGeneration;

    dialog.style.display = "flex";

    list.replaceChildren();

    status.textContent =
      "Carregando apresentações…";

    try {

      const presentations =
        await Player.listPresentations();

      if (generation !== selectionGeneration) {
        return;
      }

      status.textContent = presentations.length
        ? ""
        : "Nenhuma apresentação salva neste navegador.";

      for (const presentation of presentations) {

        const button =
          document.createElement("button");

        button.type = "button";

        const count =
          presentation.scenes?.length || 0;

        button.textContent =
          `${presentation.title || "Sem título"} — ` +
          `${count} cena(s)`;

        button.addEventListener(
          "click",
          () => openPresentation(presentation.id)
        );

        list.appendChild(button);
      }

    } catch (error) {

      if (generation === selectionGeneration) {

        status.textContent =
          `Erro ao listar: ${error.message}`;
      }
    }
  }

  /* =====================================================
     ABRIR APRESENTAÇÃO
     ===================================================== */

  async function openPresentation(id) {

    if (opening) return;

    opening = true;

    status.textContent =
      "Preparando apresentação…";

    try {

      syncSize();

      const loaded =
        await Player.loadPresentation(id);

      if (loaded) {

        scenesVisible = true;

        hideDialog();

        syncVisibility();
      }

    } catch (error) {

      status.textContent =
        `Não foi possível abrir: ${error.message}`;

      syncVisibility();

    } finally {

      opening = false;
    }
  }

  /* =====================================================
     ALTERNÂNCIA ENTRE MODOS
     ===================================================== */

  // Ao sair de Cenas, apenas ocultamos a apresentação.
  // A cena atual permanece carregada.

  cameraButton.addEventListener(
    "click",
    suspendScenes
  );

  galleryButton.addEventListener(
    "click",
    suspendScenes
  );

  teleprompterButton.addEventListener(
    "click",
    suspendScenes
  );

  /* =====================================================
     BOTÃO CENAS — ABRE A BIBLIOTECA DIRETAMENTE
     ===================================================== */

  scenesButton.addEventListener("click", event => {
    event.stopPropagation();
    window.location.assign("./scenes.html");
  });

  /* =====================================================
     FECHAMENTO DO SELETOR
     ===================================================== */

  dismiss.addEventListener(
    "click",
    hideDialog
  );

  dialog.addEventListener(
    "click",
    event => {

      if (event.target === dialog) {
        hideDialog();
      }
    }
  );

  /* =====================================================
     NAVEGAÇÃO ENTRE CENAS
     ===================================================== */

  prev.addEventListener(
    "click",
    () => Player.previousScene()
  );

  next.addEventListener(
    "click",
    () => Player.nextScene()
  );

  Player.on(
    "scenechange",
    syncVisibility
  );

  Player.on(
    "loaded",
    syncVisibility
  );

  Player.on(
    "closed",
    () => {

      scenesVisible = false;

      syncVisibility();
    }
  );

  /* =====================================================
     OBSERVAÇÃO DOS MODOS ORIGINAIS
     ===================================================== */

  if (typeof MutationObserver !== "undefined") {

    if (galleryLayer) {

      new MutationObserver(() => {

        if (isGalleryOpen()) {

          suspendScenes();

        } else {

          syncVisibility();
        }

      }).observe(galleryLayer, {

        attributes: true,
        attributeFilter: ["class"]

      });
    }

    new MutationObserver(() => {

      if (isTeleprompterOpen()) {

        suspendScenes();

      } else {

        syncVisibility();
      }

    }).observe(document.body, {

      attributes: true,
      attributeFilter: ["class"]

    });
  }

  /* =====================================================
     REDIMENSIONAMENTO
     ===================================================== */

  window.addEventListener(
    "resize",
    syncSize
  );

  window.addEventListener(
    "orientationchange",
    syncSize
  );

  if (typeof ResizeObserver !== "undefined") {

    new ResizeObserver(syncSize).observe(app);
  }

  /* =====================================================
     INICIALIZAÇÃO
     ===================================================== */

  syncSize();

  Player.setCanvas(canvas);

  syncVisibility();

 
  /* =====================================================
     ABRIR APRESENTAÇÃO SELECIONADA NA BIBLIOTECA
     ===================================================== */

  const presentationId = new URLSearchParams(
    window.location.search
  ).get("presentation");

  if (presentationId) {
    // A mesma função já usada pelo seletor antigo ativa o
    // canvas, as setas e a renderização para gravação.
    openPresentation(presentationId).then(() => {
      // Mantém a URL limpa após a tentativa de carregamento.
      const cleanURL = new URL(window.location.href);
      cleanURL.searchParams.delete("presentation");
      window.history.replaceState(
        window.history.state,
        "",
        cleanURL.pathname + cleanURL.search + cleanURL.hash
      );
    });
  }

  /* =====================================================
     API PÚBLICA — PRESERVADA
     ===================================================== */

  window.ScenesCamera = Object.freeze({

    openSelector: showDialog,

    openEditor: () => {

      window.location.href = "./scenes.html";

    },

    close: () => {

      scenesVisible = false;

      hideDialog();

      Player.closePresentation();

      syncVisibility();
    }

  });

})();
