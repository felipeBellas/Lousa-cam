
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — CENAS
   SCENES-EDITOR-UI.JS

   Melhorias independentes da interface:
   - Fundo de edição claro, cinza e escuro
   - Ícones profissionais na barra de ferramentas
   - Acesso à cor do elemento selecionado
   - Compatibilidade com iPhone e desktop

   Não modifica as apresentações salvas.
   Não altera o fundo real das cenas.
   Não interfere na câmera ou na gravação.
   ========================================================= */

(() => {

  const $ = id => document.getElementById(id);

  const STORAGE_KEY = "lousa-cam-scenes-editor-tone";

  const TONES = {
    light: "#e5e5e5",
    medium: "#858585",
    dark: "#383838"
  };

  const ICONS = {

    select: `
      <path d="M5 3l13 9-6 1-3 6-4-16z"/>
    `,

    text: `
      <path d="M4 6h16"/>
      <path d="M12 6v14"/>
      <path d="M8 20h8"/>
      <path d="M6 6v3"/>
      <path d="M18 6v3"/>
    `,

    image: `
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    `,

    shape: `
      <rect x="3" y="3" width="9" height="9" rx="1"/>
      <circle cx="17" cy="17" r="4"/>
      <path d="M3 21l5-7 5 7z"/>
    `,

    duplicate: `
      <rect x="8" y="8" width="12" height="12" rx="2"/>
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
    `,

    delete: `
      <path d="M4 7h16"/>
      <path d="M10 3h4"/>
      <path d="M6 7l1 14h10l1-14"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
    `,

    palette: `
      <circle cx="12" cy="12" r="9"/>
      <circle cx="7.5" cy="11" r="1"/>
      <circle cx="11" cy="7" r="1"/>
      <circle cx="16" cy="8" r="1"/>
      <path d="M17 15c-2 0-3 1-3 2.5 0 1 .7 1.5 1.5 1.5"/>
    `,

    tone: `
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3a9 9 0 0 1 0 18z"/>
    `

  };

  function svg(name) {

    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="21"
        height="21"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        ${ICONS[name]}
      </svg>
    `;

  }

  function injectStyles() {

    if ($("scenesEditorUIStyles")) return;

    const style = document.createElement("style");

    style.id = "scenesEditorUIStyles";

    style.textContent = `

      /* ===============================================
         FUNDO AUXILIAR DE EDIÇÃO
         =============================================== */

      #scenesStage[data-edit-tone="light"] {
        background: #e5e5e5 !important;
      }

      #scenesStage[data-edit-tone="medium"] {
        background: #858585 !important;
      }

      #scenesStage[data-edit-tone="dark"] {
        background: #383838 !important;
      }

      /*
         A camada #scenesStageBackground permanece
         controlada pelo scenes.js.

         Cena transparente:
         a camada deixa aparecer o cinza auxiliar.

         Cena sólida:
         a camada mostra a cor real da apresentação.
      */

      /* ===============================================
         BARRA DE FERRAMENTAS
         =============================================== */

      .scenes-tools {
        display: flex;
        align-items: center;
        gap: 6px;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
      }

      .scenes-tools .scenes-tool-button {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;

        width: 44px;
        min-width: 44px;
        height: 44px;

        padding: 0;
        border-radius: 9px;
      }

      .scenes-tools .scenes-tool-button svg {
        display: block;
        pointer-events: none;
      }

      .scenes-tools .scenes-tool-button:focus-visible {
        outline: 2px solid #66a8ff;
        outline-offset: 2px;
      }

      .scenes-editor-ui-extra {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 6px;
      }

      .scenes-editor-ui-color {
        color: #f4f7fc;
      }

      .scenes-editor-ui-tone {
        color: #f4f7fc;
      }

      .scenes-editor-ui-tone-menu {
        display: inline-flex;
        align-items: center;
        gap: 4px;

        padding: 3px;
        border: 1px solid #344155;
        border-radius: 9px;

        background: #101824;
      }

      .scenes-editor-ui-tone-menu button {
        width: 29px;
        height: 29px;

        flex: 0 0 29px;
        padding: 0;

        border: 2px solid transparent;
        border-radius: 7px;

        cursor: pointer;
      }

      .scenes-editor-ui-tone-menu button[aria-pressed="true"] {
        border-color: #3287ff;
        outline: 1px solid #ffffff;
        outline-offset: -4px;
      }

      .scenes-editor-ui-tone-menu button:focus-visible {
        outline: 2px solid #ffffff;
      }

      @media (max-width: 600px) {

        .scenes-tools {
          gap: 5px;
          padding: 8px;
        }

        .scenes-tools .scenes-tool-button {
          width: 42px;
          min-width: 42px;
          height: 42px;
        }

      }

    `;

    document.head.appendChild(style);

  }

  function replaceButtonContent(id, iconName, label) {

    const button = $(id);

    if (!button) return;

    // Preserva o próprio botão, ID e eventos originais.
    button.innerHTML = svg(iconName);

    button.title = label;
    button.setAttribute("aria-label", label);

  }

  function createToolButton(id, iconName, label) {

    const button = document.createElement("button");

    button.type = "button";
    button.id = id;
    button.className = "scenes-tool-button";

    button.title = label;
    button.setAttribute("aria-label", label);

    button.innerHTML = svg(iconName);

    return button;

  }

  function readSavedTone() {

    try {

      const saved = localStorage.getItem(STORAGE_KEY);

      return Object.hasOwn(TONES, saved)
        ? saved
        : "medium";

    } catch (error) {

      return "medium";

    }

  }

  let currentTone = readSavedTone();

  
  function setTone(tone) {

    if (!Object.hasOwn(TONES, tone)) return;

    currentTone = tone;

    const stage = $("scenesStage");

    if (stage) {
      stage.dataset.editTone = tone;
    }

    const button = $("scenesEditorUIToneButton");

    if (button) {

      const names = {
        light: "claro",
        medium: "cinza",
        dark: "escuro"
      };

      button.title =
        `Contraste de edição: ${names[tone]}`;

      button.setAttribute(
        "aria-label",
        `Contraste ${names[tone]}. Toque para alternar`
      );

      button.style.backgroundColor = TONES[tone];

      button.style.color =
        tone === "dark" ? "#ffffff" : "#172033";

      button.style.borderColor = "#62738d";

    }

    try {
      localStorage.setItem(STORAGE_KEY, tone);
    } catch (error) {
      // Mantém o controle ativo nesta sessão.
    }

  }


 
  function createToneControls() {

    const wrapper = document.createElement("span");

    wrapper.className = "scenes-editor-ui-extra";

    const button = document.createElement("button");

    button.type = "button";
    button.id = "scenesEditorUIToneButton";

    button.className = "scenes-editor-ui-tone-toggle";

    button.title = "Alternar contraste da edição";

    button.setAttribute(
      "aria-label",
      "Alternar fundo auxiliar de edição"
    );

    button.style.width = "38px";
    button.style.height = "38px";
    button.style.minWidth = "38px";
    button.style.borderRadius = "9px";
    button.style.border = "1px solid #62738d";
    button.style.cursor = "pointer";
    button.style.flexShrink = "0";

    const sequence = [
      "light",
      "medium",
      "dark"
    ];

    function updateButton() {

      button.style.backgroundColor =
        TONES[currentTone];

      button.style.color =
        currentTone === "dark"
          ? "#ffffff"
          : "#172033";

      button.textContent = "◐";

    }

    button.addEventListener("click", () => {

      const index = sequence.indexOf(currentTone);

      const nextTone =
        sequence[(index + 1) % sequence.length];

      setTone(nextTone);

      updateButton();

    });

    updateButton();

    wrapper.appendChild(button);

    return wrapper;

  }


  function openElementColor() {

    const input = $("scenesElementColor");

    if (!input) {
      return;
    }

    /*
       Utiliza o seletor original do editor.
       Assim, a alteração continua sendo feita
       e salva pelo scenes.js.
    */

    if (input.disabled) {
      return;
    }

    try {

      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.click();
      }

    } catch (error) {

      // Alternativa para navegadores que não
      // permitem showPicker neste contexto.
      input.click();

    }

  }

   
  /* =====================================================
     CONTROLES DE TAMANHO DA FONTE
     ===================================================== */

  function changeFontSize(step) {

    const input = $("scenesElementFontSize");
    const properties = $("scenesElementProperties");

    // Só permite alterar texto selecionado.
    if (
      !input ||
      !properties ||
      properties.hidden ||
      input.parentElement?.hidden
    ) {
      return;
    }

    const current = Number(input.value) || 48;

    const next = Math.max(
      8,
      Math.min(300, current + step)
    );

    if (next === current) return;

    // Usa o mecanismo original do scenes.js.
    input.value = String(next);

    input.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );

  }

  function createFontControls() {

    const wrapper = document.createElement("span");

    wrapper.className = "scenes-editor-ui-extra";
    wrapper.id = "scenesEditorUIFontControls";

    const decrease = document.createElement("button");

    decrease.type = "button";
    decrease.className = "scenes-tool-button";
    decrease.textContent = "A−";
    decrease.title = "Diminuir tamanho da fonte";
    decrease.setAttribute(
      "aria-label",
      "Diminuir tamanho da fonte"
    );

    decrease.style.fontWeight = "700";
    decrease.style.fontSize = "16px";

    decrease.addEventListener("click", () => {
      changeFontSize(-2);
    });

    const increase = document.createElement("button");

    increase.type = "button";
    increase.className = "scenes-tool-button";
    increase.textContent = "A+";
    increase.title = "Aumentar tamanho da fonte";
    increase.setAttribute(
      "aria-label",
      "Aumentar tamanho da fonte"
    );

    increase.style.fontWeight = "700";
    increase.style.fontSize = "16px";

    increase.addEventListener("click", () => {
      changeFontSize(2);
    });

    wrapper.append(decrease, increase);

    return wrapper;

  }


  function initialize() {

    const toolbar = document.querySelector(".scenes-tools");
    const stage = $("scenesStage");

    if (!toolbar || !stage) {
      return;
    }

    if ($("scenesEditorUIExtra")) {
      return;
    }

    injectStyles();

    /* -----------------------------------------------
       ÍCONES DOS BOTÕES EXISTENTES
       ----------------------------------------------- */

    replaceButtonContent(
      "scenesSelectTool",
      "select",
      "Selecionar e mover"
    );

    replaceButtonContent(
      "scenesTextTool",
      "text",
      "Adicionar texto"
    );

    replaceButtonContent(
      "scenesImageTool",
      "image",
      "Adicionar imagem"
    );

    replaceButtonContent(
      "scenesShapeTool",
      "shape",
      "Adicionar forma"
    );

    replaceButtonContent(
      "scenesDuplicateElementButton",
      "duplicate",
      "Duplicar elemento"
    );

    replaceButtonContent(
      "scenesDeleteElementButton",
      "delete",
      "Excluir elemento"
    );

    /* -----------------------------------------------
       NOVOS CONTROLES VISUAIS
       ----------------------------------------------- */

    const extra = document.createElement("span");

    extra.id = "scenesEditorUIExtra";
    extra.className = "scenes-editor-ui-extra";

    const colorButton = createToolButton(
      "scenesEditorUIColorButton",
      "palette",
      "Cor do elemento selecionado"
    );

    colorButton.classList.add(
      "scenes-editor-ui-color"
    );

    colorButton.addEventListener(
      "click",
      openElementColor
    );

    extra.appendChild(colorButton);

    const toneControls = createToneControls();

    
    extra.appendChild(toneControls);

    // Botões de tamanho da fonte.
    const fontControls = createFontControls();

    extra.appendChild(fontControls);

    toolbar.appendChild(extra);

    /* -----------------------------------------------
       FUNDO INICIAL
       ----------------------------------------------- */

    setTone(currentTone);

  }

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );

  } else {

    initialize();

  }

})();
