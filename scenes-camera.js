
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — SCENES-CAMERA.JS
   ETAPA 2 — ACESSO RÁPIDO E NAVEGAÇÃO LATERAL

   - Botão Cenas ao lado de Teleprompter
   - Remove botão anterior do menu principal
   - Abre seletor ou fecha apresentação
   - Setas nas laterais da câmera
   - Mantém centro da tela livre
   - Não altera câmera, Pencil ou gravação
   ========================================================= */

(() => {

  const Player = window.ScenesPlayer;

  const app = document.getElementById("app");
  const dock = document.getElementById("modeDock");
  const teleprompterButton =
    document.getElementById("teleprompterButton");

  if (!Player || !app || !dock || !teleprompterButton) {
    console.error(
      "[ScenesCamera] Dependências indisponíveis."
    );
    return;
  }

  /* =====================================================
     REMOVER ACESSO ANTIGO DO MENU
     ===================================================== */

  const oldMenuButton =
    document.getElementById("scenesCameraMenuButton");

  if (oldMenuButton) {
    const oldRow = oldMenuButton.closest(".row");

    if (oldRow && oldRow.children.length === 1) {
      oldRow.remove();
    } else {
      oldMenuButton.remove();
    }
  }

  /* =====================================================
     ESTILOS
     ===================================================== */

  const style = document.createElement("style");

  style.textContent = `
    #scenesCameraCanvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 4;
      display: none;
      pointer-events: none;
    }

    #modeDock #scenesCameraDockButton {
      min-width: 48px;
      width: 48px;
      padding: 0 9px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
    }

    #scenesCameraDockButton svg {
      width: 21px;
      height: 21px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

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
      #modeDock {
        max-width: calc(100% - 12px);
      }

      #modeDock button {
        min-width: 0;
        padding-left: 9px;
        padding-right: 9px;
        font-size: 12px;
      }

      #modeDock #scenesCameraDockButton {
        width: 42px;
        min-width: 42px;
      }

      #scenesCameraPrev,
      #scenesCameraNext {
        width: 40px;
        height: 54px;
      }
    }
  `;

  document.head.appendChild(style);

  /* =====================================================
     BOTÃO CENAS NO DOCK
     ===================================================== */

  const scenesButton = document.createElement("button");

  scenesButton.id = "scenesCameraDockButton";
  scenesButton.type = "button";
  scenesButton.title = "Cenas";
  scenesButton.setAttribute("aria-label", "Abrir cenas");
  scenesButton.setAttribute("aria-pressed", "false");

  scenesButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2"/>
      <path d="M8 21h8"/>
      <path d="M12 18v3"/>
      <path d="m10 8 5 3-5 3z"/>
    </svg>
  `;

  teleprompterButton.insertAdjacentElement(
    "afterend",
    scenesButton
  );

  /* =====================================================
     CANVAS
     ===================================================== */

  const canvas = document.createElement("canvas");
  canvas.id = "scenesCameraCanvas";
  canvas.setAttribute("aria-hidden", "true");

  app.appendChild(canvas);

  /* =====================================================
     SETAS LATERAIS
     ===================================================== */

  const prev = document.createElement("button");
  prev.id = "scenesCameraPrev";
  prev.type = "button";
  prev.textContent = "‹";
  prev.setAttribute("aria-label", "Cena anterior");

  const next = document.createElement("button");
  next.id = "scenesCameraNext";
  next.type = "button";
  next.textContent = "›";
  next.setAttribute("aria-label", "Próxima cena");

  app.appendChild(prev);
  app.appendChild(next);

  /* =====================================================
     SELETOR
     ===================================================== */

  const dialog = document.createElement("div");
  dialog.id = "scenesCameraDialog";

  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute(
    "aria-label",
    "Selecionar apresentação"
  );

  dialog.innerHTML = `
    <div class="sc-panel">
      <div class="sc-header">
        <strong>Apresentações salvas</strong>
        <button type="button" id="scenesCameraDismiss">
          Fechar
        </button>
      </div>
      <div id="scenesCameraList"></div>
      <p id="scenesCameraStatus" role="status"></p>
    </div>
  `;

  app.appendChild(dialog);

  const dismiss =
    dialog.querySelector("#scenesCameraDismiss");

  const list =
    dialog.querySelector("#scenesCameraList");

  const status =
    dialog.querySelector("#scenesCameraStatus");

  let opening = false;
  let selectionGeneration = 0;

  /* =====================================================
     DIMENSIONAMENTO
     ===================================================== */

  function syncSize() {

    const pixelRatio = window.devicePixelRatio || 1;

    const width = Math.max(
      1,
      Math.round(app.clientWidth * pixelRatio)
    );

    const height = Math.max(
      1,
      Math.round(app.clientHeight * pixelRatio)
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
     ESTADO DA INTERFACE
     ===================================================== */

  function updateControls() {

    const state = Player.getState();
    const active = state.active;

    canvas.style.display = active ? "block" : "none";

    prev.style.display = active ? "flex" : "none";
    next.style.display = active ? "flex" : "none";

    prev.disabled = !state.hasPrevious;
    next.disabled = !state.hasNext;

    scenesButton.classList.toggle("active", active);

    scenesButton.setAttribute(
      "aria-pressed",
      active ? "true" : "false"
    );

    scenesButton.setAttribute(
      "aria-label",
      active ? "Fechar cenas" : "Abrir cenas"
    );

    scenesButton.title =
      active ? "Fechar cenas" : "Abrir cenas";
  }

  /* =====================================================
     SELETOR DE APRESENTAÇÕES
     ===================================================== */

  function hideDialog() {
    selectionGeneration++;
    dialog.style.display = "none";
  }

  async function showDialog() {

    const generation = ++selectionGeneration;

    dialog.style.display = "flex";

    list.replaceChildren();
    status.textContent = "Carregando apresentações…";

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

        const button = document.createElement("button");
        button.type = "button";

        const count = presentation.scenes?.length || 0;

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

  async function openPresentation(id) {

    if (opening) return;

    opening = true;
    status.textContent = "Preparando apresentação…";

    try {

      syncSize();

      const loaded =
        await Player.loadPresentation(id);

      if (loaded) {
        hideDialog();
        updateControls();
      }

    } catch (error) {

      status.textContent =
        `Não foi possível abrir: ${error.message}`;

      updateControls();

    } finally {
      opening = false;
    }
  }

  /* =====================================================
     BOTÃO DE ACESSO RÁPIDO
     ===================================================== */

  scenesButton.addEventListener("click", event => {

    event.stopPropagation();

    if (Player.isActive()) {
      Player.closePresentation();
      hideDialog();
    } else {
      showDialog();
    }
  });

  dismiss.addEventListener("click", hideDialog);

  dialog.addEventListener("click", event => {
    if (event.target === dialog) {
      hideDialog();
    }
  });

  /* =====================================================
     NAVEGAÇÃO
     ===================================================== */

  prev.addEventListener(
    "click",
    () => Player.previousScene()
  );

  next.addEventListener(
    "click",
    () => Player.nextScene()
  );

  Player.on("scenechange", updateControls);
  Player.on("loaded", updateControls);
  Player.on("closed", updateControls);

  /* =====================================================
     REDIMENSIONAMENTO
     ===================================================== */

  window.addEventListener("resize", syncSize);
  window.addEventListener("orientationchange", syncSize);

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(syncSize).observe(app);
  }

  /* =====================================================
     INICIALIZAÇÃO
     ===================================================== */

  syncSize();
  Player.setCanvas(canvas);
  updateControls();

  window.ScenesCamera = Object.freeze({
    openSelector: showDialog,
    close: () => Player.closePresentation()
  });

})();
