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

 

    

/* =====================================================

   LOUSA CAM — PAINEL DE PROPRIEDADES COMPACTO

   Mantém os campos e eventos no DOM.

   ===================================================== */

 

.scenes-properties {

  position: absolute !important;

  width: 1px !important;

  height: 1px !important;

  overflow: hidden !important;

  opacity: 0 !important;

  pointer-events: none !important;

  clip-path: inset(50%) !important;

}

 

 

    /* Oculta a régua original de opacidade.

   O novo botão continua utilizando seu valor. */

 

#scenesElementOpacity {

  display: none !important;

}

 

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

 

 

 

  function createColorControl() {

 

    const wrapper = document.createElement("span");

 

    wrapper.className = "scenes-editor-ui-extra";

 

    Object.assign(wrapper.style, {

      position: "relative",

      display: "inline-flex",

      flexShrink: "0"

    });

 

    const button = createToolButton(

      "scenesEditorUIColorButton",

      "palette",

      "Cor do elemento selecionado"

    );

 

    button.classList.add("scenes-editor-ui-color");

 

    // Seletor nativo diretamente sobre o ícone.

    const picker = document.createElement("input");

 

    picker.type = "color";

    picker.value = "#ffffff";

 

    picker.setAttribute(

      "aria-label",

      "Escolher cor do elemento"

    );

 

    

    Object.assign(picker.style, {

      position: "absolute",

      inset: "0",

      width: "100%",

      height: "100%",

      opacity: "0",

      cursor: "pointer",

      zIndex: "2",

      margin: "0",

      padding: "0",

      border: "0",

      appearance: "none",

      WebkitAppearance: "none"

    });

 

 

    // Sincroniza a cor antes da abertura nativa.

    picker.addEventListener("pointerdown", () => {

 

      const original = $("scenesElementColor");

 

      if (original) {

        picker.value = original.value || "#ffffff";

      }

 

    });

 

 

    picker.addEventListener("input", () => {

 

      const original = $("scenesElementColor");

      const properties = $("scenesElementProperties");

 

      if (

        !original ||

        !properties ||

        properties.hidden ||

        original.parentElement?.hidden

      ) {

        return;

      }

 

      original.value = picker.value;

 

      original.dispatchEvent(

        new Event("input", {

          bubbles: true

        })

      );

 

    });

 

    wrapper.append(button, picker);

 

    return wrapper;

 

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

 

   

  /* =====================================================

     LOUSA CAM 2.0 — CONTROLE DE OPACIDADE

     Acesso compacto ao controle original.

     ===================================================== */

 

  function createOpacityControl() {

 

    const wrapper = document.createElement("span");

 

    wrapper.id = "scenesEditorUIOpacity";

    wrapper.className = "scenes-editor-ui-extra";

 

    Object.assign(wrapper.style, {

      position: "relative",

      display: "inline-flex",

      alignItems: "center",

      flexShrink: "0"

    });

 

    const button = document.createElement("button");

 

    button.type = "button";

    button.className = "scenes-tool-button";

    button.textContent = "◐";

    button.title = "Opacidade do elemento";

    button.setAttribute(

      "aria-label",

      "Ajustar opacidade do elemento"

    );

    button.setAttribute("aria-expanded", "false");

 

    Object.assign(button.style, {

      minWidth: "38px",

      minHeight: "38px",

      fontSize: "23px",

      fontWeight: "600"

    });

 

    const panel = document.createElement("div");

 

    panel.hidden = true;

 

    

    Object.assign(panel.style, {

      position: "fixed",

      top: "auto",

      left: "auto",

      right: "12px",

      bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",

      zIndex: "99999",

      width: "240px",

      maxWidth: "calc(100vw - 24px)",

      padding: "14px",

      border: "1px solid #44546b",

      borderRadius: "12px",

      background: "#192333",

      boxShadow: "0 10px 28px rgba(0,0,0,.45)",

      color: "#ffffff"

    });

 

 

    const heading = document.createElement("div");

 

    heading.style.display = "flex";

    heading.style.justifyContent = "space-between";

    heading.style.marginBottom = "12px";

    heading.style.fontSize = "13px";

 

    const label = document.createElement("span");

    label.textContent = "Opacidade";

 

    const value = document.createElement("strong");

    value.textContent = "100%";

 

    heading.append(label, value);

 

    const slider = document.createElement("input");

 

    slider.type = "range";

    slider.min = "0";

    slider.max = "100";

    slider.step = "1";

    slider.value = "100";

 

    Object.assign(slider.style, {

      width: "100%",

      margin: "0",

      padding: "0",

      accentColor: "#3287ff",

      touchAction: "auto"

    });

 

    function getOriginalInput() {

 

      return document.getElementById(

        "scenesElementOpacity"

      );

 

    }

 

    function hasSelection() {

 

      const properties = document.getElementById(

        "scenesElementProperties"

      );

 

      return Boolean(

        properties &&

        !properties.hidden &&

        getOriginalInput()

      );

 

    }

 

    function synchronize() {

 

      const original = getOriginalInput();

 

      if (!original) return;

 

      const opacity = Math.max(

        0,

        Math.min(100, Number(original.value) || 0)

      );

 

      slider.value = String(opacity);

      value.textContent = `${opacity}%`;

 

    }

 

       

    button.addEventListener("click", event => {

 

      event.stopPropagation();

 

      if (!hasSelection()) {

        panel.hidden = true;

        button.setAttribute("aria-expanded", "false");

        return;

      }

 

      const opening = panel.hidden;

 

      if (opening) {

        synchronize();

 

        const rect = button.getBoundingClientRect();

 

        const panelWidth = 240;

        const margin = 12;

 

        const left = Math.max(

          margin,

          Math.min(

            rect.left,

            window.innerWidth - panelWidth - margin

          )

        );

 

        panel.style.left = `${left}px`;

        panel.style.right = "auto";

        panel.style.top = `${rect.bottom + 8}px`;

        panel.style.bottom = "auto";

      }

 

      panel.hidden = !opening;

 

      button.setAttribute(

        "aria-expanded",

        String(opening)

      );

 

    });

 

 

    slider.addEventListener("input", () => {

       

      const original = getOriginalInput();

 

      if (!original || !hasSelection()) {

        return;

      }

 

      value.textContent = `${slider.value}%`;

 

      // Aproveita o evento original do scenes.js.

      original.value = slider.value;

 

      original.dispatchEvent(

        new Event("input", {

          bubbles: true

        })

      );

 

    });

 

    // Impede que o toque na régua feche o painel.

    panel.addEventListener("click", event => {

      event.stopPropagation();

    });

 

    // Fecha ao tocar fora.

    document.addEventListener("pointerdown", event => {

 

     if (

  !panel.hidden &&

  !wrapper.contains(event.target) &&

  !panel.contains(event.target)

) {

        panel.hidden = true;

 

        button.setAttribute(

          "aria-expanded",

          "false"

        );

 

      }

 

    });

 

    // Fecha com Escape no computador.

    document.addEventListener("keydown", event => {

 

      if (event.key === "Escape") {

 

        panel.hidden = true;

 

        button.setAttribute(

          "aria-expanded",

          "false"

        );

 

      }

 

    });

 

   panel.append(heading, slider);

 

wrapper.appendChild(button);

 

document.body.appendChild(panel);

 

return wrapper;

 

  }

  /* =====================================================

     LOUSA CAM 2.0 — AÇÕES COMPACTAS DA CENA

     Duplicar e excluir ao lado do zoom.

     Preserva os botões e eventos originais.

     ===================================================== */

 

  function createCompactSceneActions() {

 

    const zoomControls = document.querySelector(

      ".scenes-zoom-controls"

    );

 

    const duplicateButton = $(

      "scenesDuplicateSceneButton"

    );

 

    const deleteButton = $(

      "scenesDeleteSceneButton"

    );

 

    if (

      !zoomControls ||

      !duplicateButton ||

      !deleteButton

    ) {

      return;

    }

 

    // Evita instalar os controles duas vezes.

    if ($("scenesCompactSceneActions")) {

      return;

    }

 

    const wrapper = document.createElement("span");

 

    wrapper.id = "scenesCompactSceneActions";

 

    Object.assign(wrapper.style, {

      display: "inline-flex",

      alignItems: "center",

      gap: "6px",

      marginLeft: "8px",

      paddingLeft: "8px",

      borderLeft: "1px solid #44546b",

      flexShrink: "0"

    });

 

    function compactButton(button, iconName, label) {

 

      // Preserva o botão original e seu evento onclick.

      button.innerHTML = svg(iconName);

 

      button.className = "scenes-tool-button";

 

      button.type = "button";

      button.title = label;

 

      button.setAttribute(

        "aria-label",

        label

      );

 

      Object.assign(button.style, {

        display: "inline-flex",

        alignItems: "center",

        justifyContent: "center",

        width: "34px",

        minWidth: "34px",

        height: "34px",

        padding: "0",

        margin: "0",

        border: "1px solid #44546b",

        borderRadius: "8px",

        background: "#192333",

        color: "#f4f7fc",

        cursor: "pointer",

        flexShrink: "0"

      });

 

    }

 

    compactButton(

      duplicateButton,

      "duplicate",

      "Duplicar cena"

    );

 

    compactButton(

      deleteButton,

      "delete",

      "Excluir cena"

    );

 

    deleteButton.style.color = "#f4a6b3";

 

    wrapper.append(

      duplicateButton,

      deleteButton

    );

 

    zoomControls.appendChild(wrapper);

 

  }

 

 

   

  /* =====================================================

     LOUSA CAM 2.0 — MENU DE FORMAS

     Retângulo, círculo/elipse e triângulo.

     ===================================================== */

 

  function createShapesMenu() {

 

    const shapeButton = $("scenesShapeTool");

 

    if (!shapeButton || $("scenesShapesMenu")) {

      return;

    }

 

    const panel = document.createElement("div");

 

    panel.id = "scenesShapesMenu";

    panel.hidden = true;

 

    Object.assign(panel.style, {

      position: "fixed",

      zIndex: "99999",

      display: "none",

      flexDirection: "column",

      gap: "5px",

      width: "174px",

      padding: "8px",

      border: "1px solid #44546b",

      borderRadius: "11px",

      background: "#192333",

      boxShadow: "0 10px 28px rgba(0,0,0,.45)"

    });

 

    function closeMenu() {

      panel.hidden = true;

      panel.style.display = "none";

      shapeButton.setAttribute("aria-expanded", "false");

    }

 

    function addOption(symbol, label, shape) {

 

      const option = document.createElement("button");

 

      option.type = "button";

      option.textContent = `${symbol}  ${label}`;

 

      Object.assign(option.style, {

        display: "flex",

        alignItems: "center",

        width: "100%",

        minHeight: "38px",

        padding: "8px 10px",

        border: "1px solid #44546b",

        borderRadius: "7px",

        background: "#253247",

        color: "#ffffff",

        fontSize: "14px",

        textAlign: "left",

        cursor: "pointer",

        touchAction: "manipulation"

      });

 

      option.addEventListener("click", event => {

 

        event.stopPropagation();

 

        closeMenu();

 

        document.dispatchEvent(

          new CustomEvent("scenes:add-shape", {

            detail: { shape }

          })

        );

 

      });

 

      panel.appendChild(option);

 

    }

 

    

    addOption("▭", "Retângulo", "rectangle");

    addOption("◯", "Círculo / elipse", "ellipse");

    addOption("△", "Triângulo", "triangle");

    addOption("─", "Linha reta", "line");

    addOption("➜", "Seta", "arrow");

 

    // Substitui apenas a ação do botão de formas.

    shapeButton.onclick = null;

 

    shapeButton.setAttribute("aria-haspopup", "true");

    shapeButton.setAttribute("aria-expanded", "false");

 

    shapeButton.addEventListener("click", event => {

 

      event.stopPropagation();

 

      if (!panel.hidden) {

        closeMenu();

        return;

      }

 

      const rect = shapeButton.getBoundingClientRect();

 

      const panelWidth = 174;

      const margin = 8;

 

      const left = Math.max(

        margin,

        Math.min(

          rect.left,

          window.innerWidth - panelWidth - margin

        )

      );

 

      panel.style.left = `${left}px`;

      panel.style.top = `${rect.bottom + 8}px`;

      panel.style.display = "flex";

      panel.hidden = false;

 

      shapeButton.setAttribute("aria-expanded", "true");

 

    });

 

    document.addEventListener("pointerdown", event => {

 

      if (

        !panel.hidden &&

        !panel.contains(event.target) &&

        !shapeButton.contains(event.target)

      ) {

        closeMenu();

      }

 

    });

 

    document.addEventListener("keydown", event => {

 

      if (event.key === "Escape") {

        closeMenu();

      }

 

    });

 

    window.addEventListener("resize", closeMenu);

 

    document.body.appendChild(panel);

 

  }

 

   

  /* =====================================================

     LOUSA CAM 2.0 — ESPESSURA DE LINHA E SETA

     Controle compacto independente.

     ===================================================== */

 

  function createStrokeWidthControl() {

 

    const wrapper = document.createElement("span");

 

    wrapper.id = "scenesEditorUIStroke";

    wrapper.className = "scenes-editor-ui-extra";

 

    const button = document.createElement("button");

 

    button.type = "button";

    button.className = "scenes-tool-button";

    button.textContent = "☰";

    button.title = "Espessura da linha ou seta";

 

    button.setAttribute(

      "aria-label",

      "Ajustar espessura da linha ou seta"

    );

 

    button.setAttribute("aria-expanded", "false");

 

    button.style.fontSize = "21px";

    button.style.fontWeight = "700";

 

    const panel = document.createElement("div");

 

    panel.id = "scenesStrokeWidthPanel";

    panel.hidden = true;

 

    Object.assign(panel.style, {

      position: "fixed",

      zIndex: "99999",

      width: "240px",

      maxWidth: "calc(100vw - 24px)",

      padding: "14px",

      border: "1px solid #44546b",

      borderRadius: "12px",

      background: "#192333",

      color: "#ffffff",

      boxShadow: "0 10px 28px rgba(0,0,0,.45)"

    });

 

    const heading = document.createElement("div");

 

    Object.assign(heading.style, {

      display: "flex",

      justifyContent: "space-between",

      alignItems: "center",

      marginBottom: "12px",

      fontSize: "13px"

    });

 

    const label = document.createElement("span");

    label.textContent = "Espessura";

 

    const value = document.createElement("strong");

    value.textContent = "5";

 

    heading.append(label, value);

 

    const slider = document.createElement("input");

 

    slider.type = "range";

    slider.min = "1";

    slider.max = "20";

    slider.step = "1";

    slider.value = "5";

 

    Object.assign(slider.style, {

      width: "100%",

      margin: "0",

      padding: "0",

      accentColor: "#3287ff",

      touchAction: "auto"

    });

 

    function getSelectedStroke() {

 

      let result = {

        valid: false,

        value: 5

      };

 

      document.dispatchEvent(

        new CustomEvent("scenes:get-stroke-width", {

          detail: {

            respond(data) {

              result = data;

            }

          }

        })

      );

 

      return result;

    }

 

    function closePanel() {

 

      panel.hidden = true;

 

      button.setAttribute(

        "aria-expanded",

        "false"

      );

 

    }

 

    button.addEventListener("click", event => {

 

      event.stopPropagation();

 

      if (!panel.hidden) {

        closePanel();

        return;

      }

 

      const selection = getSelectedStroke();

 

      if (!selection.valid) {

        closePanel();

        return;

      }

 

      slider.value = String(selection.value);

      value.textContent = String(selection.value);

 

      const rect = button.getBoundingClientRect();

 

      const panelWidth = 240;

      const margin = 12;

 

      const left = Math.max(

        margin,

        Math.min(

          rect.left,

          window.innerWidth - panelWidth - margin

        )

      );

 

      panel.style.left = `${left}px`;

      panel.style.right = "auto";

 

      const panelHeight = 105;

 

      const top = Math.min(

        rect.bottom + 8,

        window.innerHeight - panelHeight - margin

      );

 

      panel.style.top = `${Math.max(margin, top)}px`;

      panel.style.bottom = "auto";

 

      panel.hidden = false;

 

      button.setAttribute(

        "aria-expanded",

        "true"

      );

 

    });

 

    slider.addEventListener("input", () => {

 

      const selection = getSelectedStroke();

 

      if (!selection.valid) {

        closePanel();

        return;

      }

 

      value.textContent = slider.value;

 

      document.dispatchEvent(

        new CustomEvent("scenes:stroke-width", {

          detail: {

            value: Number(slider.value)

          }

        })

      );

 

    });

 

    panel.addEventListener("pointerdown", event => {

      event.stopPropagation();

    });

 

    document.addEventListener("pointerdown", event => {

 

      if (

        !panel.hidden &&

        !panel.contains(event.target) &&

        !wrapper.contains(event.target)

      ) {

        closePanel();

      }

 

    });

 

    document.addEventListener("keydown", event => {

 

      if (event.key === "Escape") {

        closePanel();

      }

 

    });

 

    wrapper.appendChild(button);

    panel.append(heading, slider);

 

    document.body.appendChild(panel);

 

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

 

     // Ativa o menu compacto de formas geométricas.

    createShapesMenu();

 

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

 

 

    const colorControl = createColorControl();

 

    extra.appendChild(colorControl);

 

 

    const toneControls = createToneControls();

 

    

    extra.appendChild(toneControls);

 

    // Botões de tamanho da fonte.

    const fontControls = createFontControls();

 

    extra.appendChild(fontControls);

    

    // Controle compacto de opacidade.

    const opacityControl = createOpacityControl();

 

    extra.appendChild(opacityControl);

 

    // Controle compacto da espessura de linhas e setas.

    const strokeWidthControl = createStrokeWidthControl();

 

    extra.appendChild(strokeWidthControl);

 

 

    toolbar.appendChild(extra);

 

     // Botões compactos de duplicar e excluir cena.

    createCompactSceneActions();

 

    // Botão independente: o scenes.js mantém os dados e o salvamento.

    const zoomBar = document.querySelector(".scenes-zoom-controls");

    if (zoomBar && !$("scenesOrientationButton")) {

      const orientationButton = document.createElement("button");

      orientationButton.type = "button";

      orientationButton.id = "scenesOrientationButton";

      orientationButton.textContent = "▭";

      orientationButton.title = "Alternar orientação da cena";

      orientationButton.setAttribute("aria-label", orientationButton.title);

      orientationButton.style.cssText = "width:34px;height:34px;min-width:34px;font-size:23px;flex-shrink:0";

      orientationButton.addEventListener("click", () => {

        document.dispatchEvent(new Event("scenes:toggle-orientation"));

      });

      zoomBar.appendChild(orientationButton);

    }

 

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
