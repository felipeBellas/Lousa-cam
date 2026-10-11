
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — SCENES-CAMERA.JS — ETAPA 1
   Visualização de apresentações sobre a câmera.
   Não modifica o canvas de desenho nem a gravação.
   ========================================================= */

(() => {
  const Player = window.ScenesPlayer;
  const app = document.getElementById("app");
  const menu = document.getElementById("menuPanel");

  if (!Player || !app || !menu) {
    console.error(
      "[ScenesCamera] Player, #app ou #menuPanel indisponível."
    );
    return;
  }

  const css = document.createElement("style");

  css.textContent = `
    #scenesCameraCanvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 4;
      pointer-events: none;
      display: none;
    }

    #scenesCameraControls {
      position: absolute;
      left: 50%;
      bottom: max(20px, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      z-index: 35;
      display: none;
      align-items: center;
      gap: 8px;
      padding: 9px;
      max-width: calc(100% - 20px);
      border-radius: 16px;
      background: rgba(18, 20, 28, .88);
      color: #fff;
      box-shadow: 0 8px 28px rgba(0, 0, 0, .35);
      font: 14px system-ui, Arial, sans-serif;
    }

    #scenesCameraControls button,
    #scenesCameraDialog button {
      appearance: none;
      border: 1px solid rgba(255, 255, 255, .22);
      background: #343a49;
      color: white;
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font: inherit;
      touch-action: manipulation;
    }

    #scenesCameraControls button:disabled {
      opacity: .35;
      cursor: default;
    }

    #scenesCameraCounter {
      white-space: nowrap;
      min-width: 52px;
      text-align: center;
    }

    #scenesCameraDialog {
      position: absolute;
      inset: 0;
      z-index: 60;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, .65);
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
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    #scenesCameraList {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    #scenesCameraList button {
      text-align: left;
      width: 100%;
    }

    #scenesCameraStatus {
      margin: 12px 0 0;
      font-size: 13px;
      color: #d1d5db;
    }

    #scenesCameraMenuButton {
      width: 100%;
    }
  `;

  document.head.appendChild(css);

  /* =====================================================
     BOTÃO NO MENU EXISTENTE
     ===================================================== */

  const menuRow = document.createElement("div");
  menuRow.className = "row";

  const menuButton = document.createElement("button");
  menuButton.id = "scenesCameraMenuButton";
  menuButton.className = "menu-wide-button";
  menuButton.type = "button";
  menuButton.textContent = "▣ Apresentações";

  menuRow.appendChild(menuButton);
  menu.appendChild(menuRow);

  /* =====================================================
     CANVAS TRANSPARENTE
     ===================================================== */

  const canvas = document.createElement("canvas");
  canvas.id = "scenesCameraCanvas";
  canvas.setAttribute("aria-hidden", "true");

  app.appendChild(canvas);

  /* =====================================================
     CONTROLES DE NAVEGAÇÃO
     ===================================================== */

  const controls = document.createElement("div");
  controls.id = "scenesCameraControls";

  controls.innerHTML = `
    <button
      type="button"
      id="scenesCameraPrev"
      aria-label="Cena anterior">◀</button>

    <span
      id="scenesCameraCounter"
      aria-live="polite">0 / 0</span>

    <button
      type="button"
      id="scenesCameraNext"
      aria-label="Próxima cena">▶</button>

    <button
      type="button"
      id="scenesCameraClose"
      aria-label="Fechar apresentação">✕</button>
  `;

  app.appendChild(controls);

  /* =====================================================
     SELETOR DE APRESENTAÇÕES
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

  /* =====================================================
     REFERÊNCIAS
     ===================================================== */

  const prev = controls.querySelector(
    "#scenesCameraPrev"
  );

  const next = controls.querySelector(
    "#scenesCameraNext"
  );

  const close = controls.querySelector(
    "#scenesCameraClose"
  );

  const counter = controls.querySelector(
    "#scenesCameraCounter"
  );

  const list = dialog.querySelector(
    "#scenesCameraList"
  );

  const status = dialog.querySelector(
    "#scenesCameraStatus"
  );

  const dismiss = dialog.querySelector(
    "#scenesCameraDismiss"
  );

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
     ATUALIZAÇÃO DOS CONTROLES
     ===================================================== */

  function updateControls() {

    const state = Player.getState();
    const visible = state.active;

    canvas.style.display = visible
      ? "block"
      : "none";

    controls.style.display = visible
      ? "flex"
      : "none";

    counter.textContent =
      `${state.sceneNumber} / ${state.sceneCount}`;

    prev.disabled = !state.hasPrevious;
    next.disabled = !state.hasNext;
  }

  /* =====================================================
     ABRIR E FECHAR SELETOR
     ===================================================== */

  function hideDialog() {
    dialog.style.display = "none";
  }

  async function showDialog() {

    const generation = ++selectionGeneration;

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
     CARREGAR APRESENTAÇÃO
     ===================================================== */

  async function openPresentation(id) {

    if (opening) {
      return;
    }

    opening = true;

    status.textContent =
      "Preparando apresentação…";

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
     EVENTOS DO MENU
     ===================================================== */

  menuButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      menu.classList.remove("open");

      menu.setAttribute(
        "aria-hidden",
        "true"
      );

      showDialog();
    }
  );

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

  close.addEventListener(
    "click",
    () => Player.closePresentation()
  );

  Player.on(
    "scenechange",
    updateControls
  );

  Player.on(
    "closed",
    updateControls
  );

  Player.on(
    "loaded",
    updateControls
  );

  /* =====================================================
     REDIMENSIONAMENTO DA TELA
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

  updateControls();

  window.ScenesCamera = Object.freeze({
    openSelector: showDialog
  });

})();
