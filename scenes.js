"use strict";

 

/* =========================================================

   LOUSA CAM 2.0 — CENAS

   SCENES.JS — ETAPA 8

 

   Editor independente.

 

   CORREÇÕES:

   - Arrastar elementos com mouse e toque

   - Redimensionar elementos

   - Girar elementos

   - Seleção sem interromper o movimento

   - Persistência de imagens Blob

   - Salvamento automático controlado

   - Visualização de apresentações

   - Compatibilidade com scenes-storage.js

 

   Não modifica o aplicativo principal.

   ========================================================= */

 

(() => {

 

  const $ = id => document.getElementById(id);

  const Storage = window.ScenesStorage;

 

  // Dimensões lógicas da apresentação ativa.

  const BASE_WIDTH_LANDSCAPE = 1280;

  const BASE_HEIGHT_LANDSCAPE = 720;

  const BASE_WIDTH_PORTRAIT = 720;

  const BASE_HEIGHT_PORTRAIT = 1280;

 

  const isPortrait = () => presentation?.aspectRatio === "9:16";

  const getBaseWidth = () => isPortrait() ? BASE_WIDTH_PORTRAIT : BASE_WIDTH_LANDSCAPE;

  const getBaseHeight = () => isPortrait() ? BASE_HEIGHT_PORTRAIT : BASE_HEIGHT_LANDSCAPE;

 

  const MAX_IMAGE_SIZE = 12 * 1024 * 1024;

 

  let presentation = null;

  let currentSceneIndex = 0;

  let selectedElementId = null;

 

  let dirty = false;

  let revision = 0;

  let saving = false;

  let saveTimer = null;

  let savePromise = null;

 

  let drag = null;

  let previewIndex = 0;

  let confirmCallback = null;

  

  /* =====================================================

     EDIÇÃO DE TEXTO — DUPLO TOQUE

     ===================================================== */

 

  let lastTextTap = {

    id: null,

    time: 0,

    x: 0,

    y: 0

  };

 

  function shouldEditText(event, element) {

 

    if (!element || element.type !== "text") {

      return false;

    }

 

    if (

      event.pointerType === "mouse" &&

      event.button !== 0

    ) {

      return false;

    }

 

    const now = performance.now();

 

    const sameElement =

      lastTextTap.id === element.id;

 

    const withinTime =

      now - lastTextTap.time < 350;

 

    const withinDistance =

      Math.hypot(

        event.clientX - lastTextTap.x,

        event.clientY - lastTextTap.y

      ) < 28;

 

    const isDoubleTap =

      sameElement &&

      withinTime &&

      withinDistance;

 

    if (isDoubleTap) {

 

      lastTextTap = {

        id: null,

        time: 0,

        x: 0,

        y: 0

      };

 

      return true;

 

    }

 

    lastTextTap = {

      id: element.id,

      time: now,

      x: event.clientX,

      y: event.clientY

    };

 

    return false;

 

  }

 

  

  function openTextEditor(elementId) {

 

    const scene = currentScene();

 

    const element = scene?.elements.find(

      item => item.id === elementId

    );

 

    if (!element || element.type !== "text") {

      return;

    }

 

    selectedElementId = elementId;

 

    updateSelectionStyles();

    renderProperties();

 

    const node = Array.from(

      document.querySelectorAll(

        "#scenesStageElements .scenes-element"

      )

    ).find(item => item.dataset.id === elementId);

 

    if (!node) return;

 

    const previous = document.getElementById(

      "scenesInlineTextEditor"

    );

 

    if (previous) {

      previous.remove();

    }

 

    const rect = node.getBoundingClientRect();

 

    const editor = document.createElement("textarea");

 

    editor.id = "scenesInlineTextEditor";

    editor.value = element.text || "";

    editor.setAttribute(

      "aria-label",

      "Editar texto da cena"

    );

 

   

    Object.assign(editor.style, {

 

      // A caixa acompanha a cena, não a tela.

      position: "absolute",

 

      // Mesma posição do elemento original.

      left: node.style.left,

      top: node.style.top,

 

      // Mesmas dimensões do elemento.

      width: node.style.width,

      height: node.style.height,

 

      zIndex: "100",

 

      boxSizing: "border-box",

      margin: "0",

      padding: "4px",

 

      border: "2px solid #3287ff",

      borderRadius: "4px",

 

      background: "#172033",

      color: element.color || "#ffffff",

 

      fontSize: `${Math.max(

        16,

        (element.fontSize || 48) *

        $("scenesStage").getBoundingClientRect().width /

        getBaseWidth()

      )}px`,

 

      lineHeight: "1.15",

 

      resize: "none",

      outline: "none",

 

      touchAction: "auto",

      userSelect: "text",

      WebkitUserSelect: "text",

 

      transform: node.style.transform,

      transformOrigin: "center center"

 

    });

 

 

    [

      "pointerdown",

      "pointermove",

      "pointerup",

      "click"

    ].forEach(type => {

 

      editor.addEventListener(type, event => {

        event.stopPropagation();

      });

 

    });

 

    editor.addEventListener("input", () => {

 

      const current = currentScene()?.elements.find(

        item => item.id === elementId

      );

 

      if (!current) return;

 

      current.text = editor.value;

 

      const field = $("scenesElementText");

 

      if (field) {

        field.value = editor.value;

      }

 

      markDirty();

      renderStage();

 

    });

 

    editor.addEventListener("blur", () => {

      editor.remove();

    });

 

    $("scenesStage").appendChild(editor);

 

    editor.focus();

 

    try {

      const end = editor.value.length;

      editor.setSelectionRange(end, end);

    } catch (error) {

      // Mantém a edição normalmente.

    }

 

  }

 

 

  let zoom = 100;

  let toastTimer = null;

 

  const imageURLs = new Map();

 

  /* =====================================================

     UTILITÁRIOS

     ===================================================== */

 

  function uid(prefix) {

    return Storage.createId(prefix);

  }

 

  function clone(value) {

    return structuredClone(value);

  }

 

  function clamp(value, min, max) {

    return Math.min(max, Math.max(min, value));

  }

 

  function number(value, fallback = 0) {

    const n = Number(value);

    return Number.isFinite(n) ? n : fallback;

  }

 

  function setText(id, value) {

    const node = $(id);

    if (node) node.textContent = value;

  }

 

  function setStatus(value) {

    setText("scenesSaveStatus", value);

  }

 

  function toast(message) {

 

    const node = $("scenesToast");

    if (!node) return;

 

    node.textContent = message;

    node.classList.add("show");

 

    clearTimeout(toastTimer);

 

    toastTimer = setTimeout(() => {

      node.classList.remove("show");

    }, 2600);

 

  }

 

  function currentScene() {

 

    if (!presentation) return null;

 

    return presentation.scenes[currentSceneIndex] || null;

 

  }

 

  function selectedElement() {

 

    const scene = currentScene();

 

    if (!scene || !selectedElementId) return null;

 

    return scene.elements.find(

      element => element.id === selectedElementId

    ) || null;

 

  }

 

  function createScene(number) {

 

    return {

      id: uid("scene"),

      title: `Cena ${number}`,

      background: {

        type: "transparent",

        color: "#ffffff"

      },

      elements: []

    };

 

  }

 

  /* =====================================================

     IMAGENS — URL TEMPORÁRIA

     ===================================================== */

 

  function getImageURL(blob) {

 

    if (!(blob instanceof Blob)) return "";

 

    let url = imageURLs.get(blob);

 

    if (!url) {

      url = URL.createObjectURL(blob);

      imageURLs.set(blob, url);

    }

 

    return url;

 

  }

 

  function releaseImageURLs() {

 

    for (const url of imageURLs.values()) {

      URL.revokeObjectURL(url);

    }

 

    imageURLs.clear();

 

  }

 

  /* =====================================================

     SALVAMENTO

     ===================================================== */

 

  function markDirty() {

 

    if (!presentation) return;

 

    dirty = true;

    revision++;

 

    setStatus("Não salvo");

 

    clearTimeout(saveTimer);

 

    saveTimer = setTimeout(() => {

      savePresentation().catch(error => {

        toast(error.message);

      });

    }, 1000);

 

  }

 

  async function savePresentation() {

 

    if (!presentation || !dirty) {

      return savePromise;

    }

 

    if (saving) {

      return savePromise;

    }

 

    clearTimeout(saveTimer);

 

    saving = true;

 

    const savedRevision = revision;

    const savedId = presentation.id;

    const snapshot = clone(presentation);

 

    setStatus("Salvando...");

 

    savePromise = (async () => {

 

      try {

 

        const saved = await Storage.savePresentation(snapshot);

 

        if (

          presentation &&

          presentation.id === savedId

        ) {

 

          presentation.createdAt = saved.createdAt;

          presentation.updatedAt = saved.updatedAt;

 

          if (revision === savedRevision) {

            dirty = false;

            setStatus("Salvo");

          }

 

        }

 

      } catch (error) {

 

        setStatus("Erro ao salvar");

        throw error;

 

      } finally {

 

        saving = false;

 

        if (

          dirty &&

          presentation &&

          presentation.id === savedId &&

          revision !== savedRevision

        ) {

 

          clearTimeout(saveTimer);

 

          saveTimer = setTimeout(() => {

            savePresentation().catch(error => {

              toast(error.message);

            });

          }, 700);

 

        }

 

      }

 

    })();

 

    return savePromise;

 

  }

 

  async function flushSave() {

 

    clearTimeout(saveTimer);

 

    if (savePromise && saving) {

      await savePromise;

    }

 

    if (dirty) {

      await savePresentation();

    }

 

    if (dirty) {

      throw new Error(

        "Ainda existem alterações não salvas."

      );

    }

 

  }

 

  /* =====================================================

     BIBLIOTECA

     ===================================================== */

 

  async function renderLibrary() {

 

    const items = await Storage.getPresentations();

 

    const query = $("scenesSearchInput")

      .value.trim().toLocaleLowerCase("pt-BR");

 

    const filtered = items.filter(item =>

      item.title.toLocaleLowerCase("pt-BR").includes(query)

    );

 

    const grid = $("scenesPresentationGrid");

    grid.replaceChildren();

 

    $("scenesLibraryEmpty").hidden = filtered.length > 0;

 

    for (const item of filtered) {

 

      const card = document.createElement("article");

      card.className = "scenes-presentation-card";

 

      const thumbnail = document.createElement("div");

      thumbnail.className = "scenes-presentation-thumbnail";

 

      const symbol = document.createElement("span");

      symbol.className = "scenes-thumbnail-placeholder";

      symbol.textContent = "▧";

 

      thumbnail.appendChild(symbol);

 

      const info = document.createElement("div");

      info.className = "scenes-presentation-info";

 

      const title = document.createElement("h2");

      title.className = "scenes-presentation-title";

      title.textContent = item.title;

 

      const meta = document.createElement("p");

      meta.className = "scenes-presentation-meta";

      meta.textContent = `${item.scenes.length} cena(s)`;

 

      const actions = document.createElement("div");

      actions.className = "scenes-presentation-actions";

 

      function addButton(label, callback, extra = "") {

 

        const button = document.createElement("button");

 

        button.type = "button";

        button.className = `scenes-button ${extra}`;

        button.textContent = label;

 

        button.addEventListener("click", callback);

 

        actions.appendChild(button);

 

      }

 

      addButton(

        "Abrir",

        () => openPresentation(item.id),

        "scenes-button-primary"

      );

 

      addButton("Duplicar", async () => {

 

        try {

          await Storage.duplicatePresentation(item.id);

          await renderLibrary();

          toast("Apresentação duplicada.");

        } catch (error) {

          toast(error.message);

        }

 

      });

 

      addButton("Excluir", () => {

 

        askConfirmation(

          "Excluir apresentação",

          `Excluir "${item.title}" permanentemente?`,

          async () => {

 

            await Storage.deletePresentation(item.id);

            await renderLibrary();

 

            toast("Apresentação excluída.");

 

          }

        );

 

      });

 

      info.append(title, meta, actions);

      card.append(thumbnail, info);

 

      grid.appendChild(card);

 

    }

 

  }

 

  async function createPresentation() {

 

    try {

 

      const created = await Storage.createPresentation({

        title: "Nova apresentação",

        aspectRatio: "16:9",

        scenes: [createScene(1)]

      });

 

      await openPresentation(created.id);

 

    } catch (error) {

      toast(error.message);

    }

 

  }

 

  async function openPresentation(id) {

 

    try {

 

      if (presentation) {

        await flushSave();

      }

 

      releaseImageURLs();

 

      const loaded = await Storage.getPresentation(id);

 

      if (!loaded) {

        throw new Error("Apresentação não encontrada.");

      }

 

      presentation = loaded;

      currentSceneIndex = 0;

      selectedElementId = null;

 

      dirty = false;

      revision = 0;

 

      $("scenesLibraryView").hidden = true;

      $("scenesEditorView").hidden = false;

 

      $("scenesSaveButton").disabled = false;

 

      $("scenesPresentationTitle").value =

        presentation.title;

 

      setStatus("Salvo");

 

      renderEditor();

 

    } catch (error) {

      toast(error.message);

    }

 

  }

 

  async function showLibrary() {

 

    try {

 

      await flushSave();

 

      releaseImageURLs();

 

      presentation = null;

      selectedElementId = null;

      drag = null;

 

      $("scenesEditorView").hidden = true;

      $("scenesLibraryView").hidden = false;

 

      $("scenesSaveButton").disabled = true;

 

      await renderLibrary();

 

    } catch (error) {

      toast(error.message);

    }

 

  }

 

  /* =====================================================

     CENAS

     ===================================================== */

 

  function addScene() {

 

    if (!presentation) return;

 

    presentation.scenes.push(

      createScene(presentation.scenes.length + 1)

    );

 

    currentSceneIndex = presentation.scenes.length - 1;

    selectedElementId = null;

 

    markDirty();

    renderEditor();

 

  }

 

  function selectScene(index) {

 

    if (!presentation) return;

 

    if (

      index < 0 ||

      index >= presentation.scenes.length

    ) {

      return;

    }

 

    currentSceneIndex = index;

    selectedElementId = null;

 

    renderEditor();

 

  }

 

  function duplicateScene() {

 

    const scene = currentScene();

    if (!scene) return;

 

    const copy = clone(scene);

 

    copy.id = uid("scene");

    copy.title = `${scene.title} (cópia)`;

 

    copy.elements = copy.elements.map(element => ({

      ...element,

      id: uid("element")

    }));

 

    presentation.scenes.splice(

      currentSceneIndex + 1,

      0,

      copy

    );

 

    currentSceneIndex++;

    selectedElementId = null;

 

    markDirty();

    renderEditor();

 

  }

 

  function deleteScene() {

 

    if (!presentation) return;

 

    askConfirmation(

      "Excluir cena",

      "Deseja excluir a cena selecionada?",

      () => {

 

        presentation.scenes.splice(currentSceneIndex, 1);

 

        if (!presentation.scenes.length) {

          presentation.scenes.push(createScene(1));

        }

 

        currentSceneIndex = Math.min(

          currentSceneIndex,

          presentation.scenes.length - 1

        );

 

        selectedElementId = null;

 

        markDirty();

        renderEditor();

 

      }

    );

 

  }

 

  /* =====================================================

     ELEMENTOS

     ===================================================== */

 

  function addElement(type, properties = {}) {

 

    const scene = currentScene();

    if (!scene) return;

 

    const element = {

      id: uid("element"),

      type,

      x: 350,

      y: 220,

      width: 550,

      height: 180,

      rotation: 0,

      opacity: 1,

      ...properties

    };

 

    scene.elements.push(element);

    selectedElementId = element.id;

 

    markDirty();

    renderEditor();

 

  }

 

  function selectElement(id) {

 

    selectedElementId = id;

 

    renderStage();

    renderProperties();

 

  }

 

  function duplicateElement() {

 

    const element = selectedElement();

    if (!element) return;

 

    const copy = clone(element);

 

    copy.id = uid("element");

    copy.x += 30;

    copy.y += 30;

 

    currentScene().elements.push(copy);

 

    selectedElementId = copy.id;

 

    markDirty();

    renderEditor();

 

  }

 

  function deleteElement() {

 

    const scene = currentScene();

 

    if (!scene || !selectedElementId) return;

 

    scene.elements = scene.elements.filter(

      element => element.id !== selectedElementId

    );

 

    selectedElementId = null;

 

    markDirty();

    renderEditor();

 

  }

 

  async function insertImage(file) {

 

    if (!file) return;

 

    const allowed = [

      "image/png",

      "image/jpeg",

      "image/webp",

      "image/gif"

    ];

 

    if (!allowed.includes(file.type)) {

      toast("Formato de imagem não suportado.");

      return;

    }

 

    if (file.size > MAX_IMAGE_SIZE) {

      toast("Imagem acima de 12 MB.");

      return;

    }

 

    addElement("image", {

      blob: file,

      x: 400,

      y: 200,

      width: 480,

      height: 300

    });

 

  }

 

  /* =====================================================

     FUNDO

     ===================================================== */

 

  function applyBackground(node, scene) {

 

    if (scene.background?.type === "solid") {

 

      node.style.background =

        scene.background.color || "#ffffff";

 

    } else {

 

      node.style.background = "transparent";

 

    }

 

  }

 

  /* =====================================================

     ELEMENTOS VISUAIS

     ===================================================== */

 

  function createElementNode(

    element,

    editable,

    stageWidth

  ) {

 

    const node = document.createElement("div");

 

    node.className = "scenes-element";

    node.dataset.id = element.id;

 

    node.style.left =

      `${element.x / getBaseWidth() * 100}%`;

 

    node.style.top =

      `${element.y / getBaseHeight() * 100}%`;

 

    node.style.width =

      `${element.width / getBaseWidth() * 100}%`;

 

    node.style.height =

      `${element.height / getBaseHeight() * 100}%`;

 

    node.style.transform =

      `rotate(${element.rotation || 0}deg)`;

 

    node.style.opacity =

      String(element.opacity ?? 1);

 

    if (

      editable &&

      element.id === selectedElementId

    ) {

      node.classList.add("selected");

    }

 

    if (element.type === "text") {

 

      const content = document.createElement("div");

 

      content.className = "scenes-element-text";

      content.textContent = element.text || "";

 

      content.style.color =

        element.color || "#ffffff";

 

      content.style.fontSize =

        `${(element.fontSize || 48) *

          stageWidth / getBaseWidth()}px`;

 

      node.appendChild(content);

 

    }

 

    if (element.type === "image") {

 

      const image = document.createElement("img");

 

      image.className = "scenes-element-image";

      image.alt = "";

 

      if (element.blob instanceof Blob) {

        image.src = getImageURL(element.blob);

      }

 

      node.appendChild(image);

 

    }

 

    if (element.type === "shape") {

 

      

      // Linha reta e seta: desenho vetorial.

      // Mantém os controles originais de movimento,

      // redimensionamento, rotação e opacidade.

 

      if (

        element.shape === "line" ||

        element.shape === "arrow"

      ) {

 

        const svgNS = "http://www.w3.org/2000/svg";

 

        const graphic = document.createElementNS(

          svgNS,

          "svg"

        );

 

        graphic.setAttribute("viewBox", "0 0 100 100");

        graphic.setAttribute("preserveAspectRatio", "none");

        graphic.setAttribute("width", "100%");

        graphic.setAttribute("height", "100%");

 

        graphic.style.display = "block";

        graphic.style.overflow = "visible";

        graphic.style.pointerEvents = "none";

 

        const color = element.color || "#3287ff";

 

        const line = document.createElementNS(

          svgNS,

          "line"

        );

 

        line.setAttribute("x1", "2");

        line.setAttribute("y1", "50");

        line.setAttribute(

          "x2",

          element.shape === "arrow" ? "88" : "98"

        );

        line.setAttribute("y2", "50");

        line.setAttribute("stroke", color);

        line.setAttribute(

        "stroke-width",

        String(clamp(number(element.strokeWidth, 5), 1, 20))

        );

        line.setAttribute("stroke-linecap", "round");

 

        graphic.appendChild(line);

 

        if (element.shape === "arrow") {

 

          const tip = document.createElementNS(

            svgNS,

            "polygon"

          );

 

          const thickness = clamp(

         number(element.strokeWidth, 5),

         1,

         20

         );

 

         const halfTipHeight = Math.min(

         30,

         10 + thickness * 0.6

         );

 

        tip.setAttribute(

        "points",

        `100,50 82,${50 - halfTipHeight} 82,${50 + halfTipHeight}`

         );

 

          tip.setAttribute("fill", color);

 

          graphic.appendChild(tip);

 

        }

 

        node.appendChild(graphic);

 

      } else {

 

 

      const shape = document.createElement("div");

 

      shape.className = "scenes-element-shape";

 

      shape.style.backgroundColor =

        element.color || "#3287ff";

 

      if (element.shape === "ellipse") {

        shape.style.borderRadius = "50%";

      }

 

      if (element.shape === "triangle") {

        shape.style.clipPath =

          "polygon(50% 0%, 100% 100%, 0% 100%)";

      }

 

     node.appendChild(shape);

 

      } // Fecha o else das formas existentes.

 

    } // Fecha o bloco de elementos shape.

 

    if (editable) {

 

      

      

      node.addEventListener("pointerdown", event => {

 

        if (

          event.target.closest(

            ".scenes-element-resize, .scenes-element-rotate"

          )

        ) {

          return;

        }

 

        // Segundo toque em um texto:

        // abre imediatamente o campo editável.

        if (shouldEditText(event, element)) {

 

          event.preventDefault();

          event.stopPropagation();

 

          // Não inicia o arraste.

          // Não aguarda pointerup.

          openTextEditor(element.id);

 

          return;

 

        }

 

        // Comportamento original:

        // selecionar e movimentar.

        startDrag(event, element.id, "move");

 

      });

 

 

      if (element.id === selectedElementId) {

 

        const resize = document.createElement("span");

        resize.className = "scenes-element-resize";

 

        resize.addEventListener("pointerdown", event => {

          startDrag(event, element.id, "resize");

        });

 

        const rotate = document.createElement("span");

        rotate.className = "scenes-element-rotate";

 

        rotate.addEventListener("pointerdown", event => {

          startDrag(event, element.id, "rotate");

        });

 

        node.append(resize, rotate);

 

      }

 

    }

 

    return node;

 

  }

 

  /* =====================================================

     RENDERIZAÇÃO DO PALCO

     ===================================================== */

 

  function renderStage() {

 

    const scene = currentScene();

    if (!scene) return;

 

    const stage = $("scenesStage");

    const layer = $("scenesStageElements");

 

    applyBackground($("scenesStageBackground"), scene);

 

    layer.replaceChildren();

 

    const stageWidth =

      stage.getBoundingClientRect().width;

 

    for (const element of scene.elements) {

 

      layer.appendChild(

        createElementNode(element, true, stageWidth)

      );

 

    }

 

    $("scenesStageEmpty").hidden = true;

 

    setText("scenesCurrentSceneLabel", scene.title);

 

  }

 

  function renderSlides() {

 

    const list = $("scenesSlideList");

    list.replaceChildren();

 

    presentation.scenes.forEach((scene, index) => {

 

      const button = document.createElement("button");

 

      button.type = "button";

      button.className = "scenes-slide-item";

 

      if (index === currentSceneIndex) {

        button.classList.add("active");

      }

 

      const thumbnail = document.createElement("div");

      thumbnail.className = "scenes-slide-thumbnail";

 

      const name = document.createElement("div");

      name.className = "scenes-slide-name";

 

      name.textContent =

        `${index + 1}. ${scene.title}`;

 

      button.append(thumbnail, name);

 

      button.onclick = () => selectScene(index);

 

      list.appendChild(button);

 

    });

 

    setText("scenesCount", presentation.scenes.length);

 

  }

 

  function renderProperties() {

 

    const scene = currentScene();

    if (!scene) return;

 

    $("scenesSceneTitle").value = scene.title;

 

    $("scenesBackgroundType").value =

      scene.background?.type || "transparent";

 

    $("scenesBackgroundColor").value =

      scene.background?.color || "#ffffff";

 

    $("scenesBackgroundColor").disabled =

      scene.background?.type !== "solid";

 

    const element = selectedElement();

 

    $("scenesElementProperties").hidden = !element;

 

    if (!element) return;

 

    $("scenesElementText").parentElement.hidden =

      element.type !== "text";

 

    $("scenesElementColor").parentElement.hidden =

      element.type === "image";

 

    $("scenesElementFontSize").parentElement.hidden =

      element.type !== "text";

 

    $("scenesElementText").value =

      element.text || "";

 

    $("scenesElementColor").value =

      element.color || "#ffffff";

 

    $("scenesElementFontSize").value =

      element.fontSize || 48;

 

    $("scenesElementOpacity").value =

      Math.round((element.opacity ?? 1) * 100);

 

    $("scenesElementRotation").value =

      element.rotation || 0;

 

  }

 

  function syncOrientation() {

    const portrait = isPortrait();

    const stage = $("scenesStage");

    const preview = $("scenesPreviewStage");

    const button = $("scenesOrientationButton");

    if (stage) {

      stage.classList.toggle("scenes-portrait", portrait);

      stage.style.width = portrait

        ? `min(${zoom}%, calc(60dvh * 9 / 16))`

        : `${zoom}%`;

    }

    if (preview) preview.classList.toggle("scenes-portrait", portrait);

    document.querySelectorAll(".scenes-slide-thumbnail").forEach(node => {

      node.classList.toggle("scenes-portrait", portrait);

    });

    if (button) {

      button.textContent = portrait ? "▯" : "▭";

      button.title = portrait ? "Cena vertical (9:16). Alternar" : "Cena horizontal (16:9). Alternar";

      button.setAttribute("aria-label", button.title);

      button.setAttribute("aria-pressed", String(portrait));

    }

  }

 

  function toggleOrientation() {

    if (!presentation) return;

    const oldWidth = getBaseWidth();

    const oldHeight = getBaseHeight();

    presentation.aspectRatio = isPortrait() ? "16:9" : "9:16";

    const scaleX = getBaseWidth() / oldWidth;

    const scaleY = getBaseHeight() / oldHeight;

    for (const scene of presentation.scenes) {

      for (const element of scene.elements) {

        element.x *= scaleX;

        element.width *= scaleX;

        element.y *= scaleY;

        element.height *= scaleY;

        // A fonte acompanha a largura lógica do palco.

        if (element.type === "text" && Number.isFinite(element.fontSize)) {

          element.fontSize *= scaleX;

        }

      }

    }

    drag = null;

    markDirty();

    renderEditor();

  }

 

  document.addEventListener("scenes:toggle-orientation", toggleOrientation);

 

  function renderEditor() {

 

    if (!presentation) return;

 

    syncOrientation();

    renderSlides();

    renderStage();

    renderProperties();

 

  }

 

  /* =====================================================

     COORDENADAS

     ===================================================== */

 

  function pointerPosition(event) {

 

    const rect =

      $("scenesStage").getBoundingClientRect();

 

    return {

      x:

        (event.clientX - rect.left) /

        rect.width * getBaseWidth(),

 

      y:

        (event.clientY - rect.top) /

        rect.height * getBaseHeight()

    };

 

  }

 

  /* =====================================================

     MOVIMENTAÇÃO CORRIGIDA

     ===================================================== */

 

  function startDrag(event, elementId, mode) {

 

    if (

      event.pointerType === "mouse" &&

      event.button !== 0

    ) {

      return;

    }

 

    const scene = currentScene();

 

    const element = scene?.elements.find(

      item => item.id === elementId

    );

 

    if (!element) return;

 

    event.preventDefault();

    event.stopPropagation();

 

    selectedElementId = elementId;

 

    const position = pointerPosition(event);

 

    const original = {

      x: element.x,

      y: element.y,

      width: element.width,

      height: element.height,

      rotation: element.rotation || 0

    };

 

    const centerX =

      original.x + original.width / 2;

 

    const centerY =

      original.y + original.height / 2;

 

    const startAngle = Math.atan2(

      position.y - centerY,

      position.x - centerX

    );

 

    drag = {

      elementId,

      pointerId: event.pointerId,

      mode,

      startX: position.x,

      startY: position.y,

      startAngle,

      original

    };

 

    $("scenesStage").setPointerCapture(

      event.pointerId

    );

 

    // Atualiza apenas a seleção visual.

    // Não reconstrói o elemento neste momento.

    updateSelectionStyles();

 

    renderProperties();

 

  }

 

  function updateSelectionStyles() {

 

    document.querySelectorAll(

      "#scenesStageElements .scenes-element"

    ).forEach(node => {

 

      node.classList.toggle(

        "selected",

        node.dataset.id === selectedElementId

      );

 

    });

 

  }

 

  function updateDrag(event) {

 

    if (!drag) return;

 

    if (event.pointerId !== drag.pointerId) {

      return;

    }

 

    const scene = currentScene();

 

    const element = scene?.elements.find(

      item => item.id === drag.elementId

    );

 

    if (!element) return;

 

    const position = pointerPosition(event);

 

    const dx = position.x - drag.startX;

    const dy = position.y - drag.startY;

 

    const original = drag.original;

 

    if (drag.mode === "move") {

 

      element.x = clamp(

        original.x + dx,

        -element.width + 20,

        getBaseWidth() - 20

      );

 

      element.y = clamp(

        original.y + dy,

        -element.height + 20,

        getBaseHeight() - 20

      );

 

    }

 

    if (drag.mode === "resize") {

 

      element.width = clamp(

        original.width + dx,

        20,

        getBaseWidth() * 2

      );

 

      element.height = clamp(

        original.height + dy,

        20,

        getBaseHeight() * 2

      );

 

    }

 

    if (drag.mode === "rotate") {

 

      const centerX =

        original.x + original.width / 2;

 

      const centerY =

        original.y + original.height / 2;

 

      const angle = Math.atan2(

        position.y - centerY,

        position.x - centerX

      );

 

      element.rotation =

        original.rotation +

        (angle - drag.startAngle) *

        180 / Math.PI;

 

    }

 

    const node = document.querySelector(

      `#scenesStageElements [data-id="${element.id}"]`

    );

 

    if (node) {

 

      node.style.left =

        `${element.x / getBaseWidth() * 100}%`;

 

      node.style.top =

        `${element.y / getBaseHeight() * 100}%`;

 

      node.style.width =

        `${element.width / getBaseWidth() * 100}%`;

 

      node.style.height =

        `${element.height / getBaseHeight() * 100}%`;

 

      node.style.transform =

        `rotate(${element.rotation || 0}deg)`;

 

    }

 

    markDirty();

 

  }

 

  function stopDrag(event) {

 

    if (!drag) return;

 

    if (event.pointerId !== drag.pointerId) {

      return;

    }

 

    drag = null;

 

    renderStage();

    renderProperties();

 

  }

 

  /* =====================================================

     VISUALIZAÇÃO

     ===================================================== */

 

  function openPreview() {

 

    if (!presentation) return;

 

    previewIndex = currentSceneIndex;

 

    $("scenesPreviewOverlay").hidden = false;

 

    renderPreview();

 

  }

 

  function renderPreview() {

 

    const scene =

      presentation?.scenes[previewIndex];

 

    if (!scene) return;

 

    const stage = $("scenesPreviewStage");

 

    syncOrientation();

    stage.replaceChildren();

 

    applyBackground(stage, scene);

 

    const width =

      stage.getBoundingClientRect().width;

 

    for (const element of scene.elements) {

 

      stage.appendChild(

        createElementNode(element, false, width)

      );

 

    }

 

    setText("scenesPreviewTitle", scene.title);

 

    setText(

      "scenesPreviewCounter",

      `${previewIndex + 1} / ${presentation.scenes.length}`

    );

 

    $("scenesPreviousPreviewButton").disabled =

      previewIndex === 0;

 

    $("scenesNextPreviewButton").disabled =

      previewIndex === presentation.scenes.length - 1;

 

  }

 

  function closePreview() {

 

    $("scenesPreviewOverlay").hidden = true;

 

    renderStage();

 

  }

 

  /* =====================================================

     CONFIRMAÇÕES

     ===================================================== */

 

  function askConfirmation(title, message, callback) {

 

    setText("scenesConfirmTitle", title);

    setText("scenesConfirmMessage", message);

 

    confirmCallback = callback;

 

    $("scenesConfirmOverlay").hidden = false;

 

  }

 

  function closeConfirmation() {

 

    $("scenesConfirmOverlay").hidden = true;

    confirmCallback = null;

 

  }

 

   

  /* =====================================================

     ESPESSURA DE LINHAS E SETAS

     Comunicação com a interface compacta.

     ===================================================== */

 

  document.addEventListener(

    "scenes:stroke-width",

    event => {

 

      const element = selectedElement();

 

      if (

        !element ||

        element.type !== "shape" ||

        !["line", "arrow"].includes(element.shape)

      ) {

        return;

      }

 

      const thickness = clamp(

        number(event.detail?.value, 5),

        1,

        20

      );

 

      changeElementProperty(

        "strokeWidth",

        thickness

      );

 

    }

  );

 

  document.addEventListener(

    "scenes:get-stroke-width",

    event => {

 

      const element = selectedElement();

 

      const valid = Boolean(

        element &&

        element.type === "shape" &&

        ["line", "arrow"].includes(element.shape)

      );

 

      if (typeof event.detail?.respond === "function") {

        event.detail.respond({

          valid,

          value: valid

            ? clamp(number(element.strokeWidth, 5), 1, 20)

            : 5

        });

      }

 

    }

  );

 

 

  /* =====================================================

     PROPRIEDADES

     ===================================================== */

 

  function changeElementProperty(property, value) {

 

    const element = selectedElement();

 

    if (!element) return;

 

    element[property] = value;

 

    markDirty();

    renderStage();

 

  }

 

  /* =====================================================

     ZOOM

     ===================================================== */

 

  function applyZoom() {

 

    $("scenesStage").style.width = isPortrait()

      ? `min(${zoom}%, calc(60dvh * 9 / 16))`

      : `${zoom}%`;

 

    setText("scenesZoomLabel", `${zoom}%`);

 

    renderStage();

 

  }

 

  /* =====================================================

     EVENTOS

     ===================================================== */

 

  function bindEvents() {

 

    $("scenesNewPresentationButton").onclick =

      createPresentation;

 

    $("scenesSearchInput").oninput = () => {

      renderLibrary().catch(error => toast(error.message));

    };

 

    $("scenesLibraryButton").onclick = showLibrary;

 

    $("scenesSaveButton").onclick = () => {

      savePresentation().catch(error => toast(error.message));

    };

 

    $("scenesPresentationTitle").oninput = event => {

 

      if (!presentation) return;

 

      presentation.title = event.target.value;

      markDirty();

 

    };

 

    $("scenesAddSceneButton").onclick = addScene;

 

    $("scenesDuplicateSceneButton").onclick =

      duplicateScene;

 

    $("scenesDeleteSceneButton").onclick =

      deleteScene;

 

    $("scenesSceneTitle").oninput = event => {

 

      const scene = currentScene();

      if (!scene) return;

 

      scene.title = event.target.value;

 

      markDirty();

      renderSlides();

 

      setText("scenesCurrentSceneLabel", scene.title);

 

    };

 

    $("scenesBackgroundType").onchange = event => {

 

      const scene = currentScene();

      if (!scene) return;

 

      scene.background.type = event.target.value;

 

      markDirty();

      renderStage();

      renderProperties();

 

    };

 

    $("scenesBackgroundColor").oninput = event => {

 

      const scene = currentScene();

      if (!scene) return;

 

      scene.background.color = event.target.value;

 

      markDirty();

      renderStage();

 

    };

 

    $("scenesTextTool").onclick = () => {

 

      addElement("text", {

        text: "Novo texto",

        color: "#ffffff",

        fontSize: 48

      });

 

    };

 

    $("scenesImageTool").onclick = () => {

      $("scenesImageInput").click();

    };

 

    $("scenesImageInput").onchange = async event => {

 

      await insertImage(event.target.files?.[0]);

 

      event.target.value = "";

 

    };

 

 

    // Mantém o comportamento original como alternativa.

    $("scenesShapeTool").onclick = () => {

 

      addElement("shape", {

        shape: "rectangle",

        color: "#3287ff",

        width: 350,

        height: 220

      });

 

    };

 

    // Permite ao menu compacto adicionar outras formas.

    document.addEventListener("scenes:add-shape", event => {

 

      const shape = event.detail?.shape;

 

      if (![

  "rectangle",

  "ellipse",

  "triangle",

  "line",

  "arrow"

  ].includes(shape)) {

        return;

      }

 

      

      const isLinear =

        shape === "line" ||

        shape === "arrow";

 

      addElement("shape", {

        shape,

        color: "#3287ff",

        width: isLinear

          ? 400

          : shape === "ellipse" ? 240 : 350,

        height: isLinear

          ? 60

          : shape === "ellipse" ? 240 : 220

      });

 

 

    });

 

 

    $("scenesSelectTool").onclick = () => {

      selectElement(null);

    };

 

    $("scenesDuplicateElementButton").onclick =

      duplicateElement;

 

    $("scenesDeleteElementButton").onclick =

      deleteElement;

 

    $("scenesElementText").oninput = event => {

      changeElementProperty("text", event.target.value);

    };

 

    $("scenesElementColor").oninput = event => {

      changeElementProperty("color", event.target.value);

    };

 

    $("scenesElementFontSize").oninput = event => {

 

      changeElementProperty(

        "fontSize",

        clamp(number(event.target.value, 48), 8, 300)

      );

 

    };

 

    $("scenesElementOpacity").oninput = event => {

 

      changeElementProperty(

        "opacity",

        number(event.target.value, 100) / 100

      );

 

    };

 

    $("scenesElementRotation").oninput = event => {

 

      changeElementProperty(

        "rotation",

        number(event.target.value, 0)

      );

 

    };

 

    const stage = $("scenesStage");

 

    stage.addEventListener("pointerdown", event => {

 

      if (

        event.target === stage ||

        event.target === $("scenesStageBackground") ||

        event.target === $("scenesStageElements")

      ) {

        selectElement(null);

      }

 

    });

 

    stage.addEventListener("pointermove", updateDrag);

    stage.addEventListener("pointerup", stopDrag);

    stage.addEventListener("pointercancel", stopDrag);

    stage.addEventListener("lostpointercapture", () => {

      drag = null;

    });

 

    $("scenesPreviewButton").onclick = openPreview;

 

    $("scenesClosePreviewButton").onclick =

      closePreview;

 

    $("scenesPreviousPreviewButton").onclick = () => {

 

      if (previewIndex > 0) {

        previewIndex--;

        renderPreview();

      }

 

    };

 

    $("scenesNextPreviewButton").onclick = () => {

 

      if (

        presentation &&

        previewIndex < presentation.scenes.length - 1

      ) {

        previewIndex++;

        renderPreview();

      }

 

    };

 

    $("scenesConfirmCancel").onclick =

      closeConfirmation;

 

    $("scenesConfirmAccept").onclick = async () => {

 

      const callback = confirmCallback;

      closeConfirmation();

 

      try {

        if (callback) await callback();

      } catch (error) {

        toast(error.message);

      }

 

    };

 

    $("scenesZoomInButton").onclick = () => {

 

      zoom = clamp(zoom + 10, 50, 150);

      applyZoom();

 

    };

 

    $("scenesZoomOutButton").onclick = () => {

 

      zoom = clamp(zoom - 10, 50, 150);

      applyZoom();

 

    };

 

    window.addEventListener("keydown", event => {

 

      if (!$("scenesPreviewOverlay").hidden) {

 

        if (event.key === "Escape") {

          closePreview();

        }

 

        if (

          event.key === "ArrowRight" &&

          presentation &&

          previewIndex < presentation.scenes.length - 1

        ) {

          previewIndex++;

          renderPreview();

        }

 

        if (

          event.key === "ArrowLeft" &&

          previewIndex > 0

        ) {

          previewIndex--;

          renderPreview();

        }

 

        return;

 

      }

 

      if (!presentation) return;

 

      const tag = document.activeElement?.tagName;

 

      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {

        return;

      }

 

      if (

        event.key === "Delete" ||

        event.key === "Backspace"

      ) {

        deleteElement();

      }

 

    });

 

    window.addEventListener("resize", () => {

 

      if (presentation) {

        renderStage();

      }

 

    });

 

    window.addEventListener("beforeunload", event => {

 

      if (!dirty) return;

 

      event.preventDefault();

      event.returnValue = "";

 

    });

 

  }

 

  /* =====================================================

     INICIALIZAÇÃO

     ===================================================== */

 

  async function initialize() {

 

    if (!Storage) {

      console.error(

        "[Cenas] scenes-storage.js não carregado."

      );

      return;

    }

 

    bindEvents();

 

    $("scenesSaveButton").disabled = true;

 

    try {

 

      await renderLibrary();

 

    } catch (error) {

 

      toast(`Erro ao iniciar: ${error.message}`);

 

    }

 

  }

 

  if (document.readyState === "loading") {

 

    document.addEventListener(

      "DOMContentLoaded",

      initialize

    );

 

  } else {

 

    initialize();

 

  }

 

})();


scenes-editor-ui.js

 

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


scenes.css

 

/* =========================================================

   LOUSA CAM 2.0 — CENAS

   SCENES.CSS — ETAPA 3

 

   Interface independente do aplicativo principal.

   Responsiva para desktop, tablet e iPhone.

 

   Não modifica o CSS original do Lousa Cam.

   ========================================================= */

 

:root {

  color-scheme: dark;

 

  --scenes-bg: #10151f;

  --scenes-panel: #171e2a;

  --scenes-panel-alt: #1d2635;

  --scenes-panel-hover: #263247;

 

  --scenes-border: #344155;

  --scenes-text: #f4f7fc;

  --scenes-muted: #a5b2c5;

 

  --scenes-primary: #3287ff;

  --scenes-primary-hover: #579dff;

  --scenes-danger: #e45868;

 

  --scenes-radius: 12px;

  --scenes-header-height: 68px;

 

  --scenes-safe-top: env(safe-area-inset-top, 0px);

  --scenes-safe-bottom: env(safe-area-inset-bottom, 0px);

  --scenes-safe-left: env(safe-area-inset-left, 0px);

  --scenes-safe-right: env(safe-area-inset-right, 0px);

}

 

/* =========================================================

   BASE

   ========================================================= */

 

* {

  box-sizing: border-box;

}

 

html,

body {

  width: 100%;

  min-height: 100%;

  margin: 0;

  padding: 0;

  background: var(--scenes-bg);

  color: var(--scenes-text);

  font-family:

    -apple-system,

    BlinkMacSystemFont,

    "Segoe UI",

    Roboto,

    Arial,

    sans-serif;

}

 

body {

  overflow-x: hidden;

}

 

button,

input,

select,

textarea {

  font: inherit;

}

 

button {

  cursor: pointer;

  -webkit-tap-highlight-color: transparent;

}

 

button:disabled {

  opacity: 0.45;

  cursor: not-allowed;

}

 

button,

a,

input,

select,

textarea {

  touch-action: manipulation;

}

 

input,

select,

textarea {

  width: 100%;

  min-width: 0;

  padding: 10px 12px;

  border: 1px solid var(--scenes-border);

  border-radius: 9px;

  background: #111824;

  color: var(--scenes-text);

  outline: none;

}

 

input:focus,

select:focus,

textarea:focus {

  border-color: var(--scenes-primary);

  box-shadow: 0 0 0 2px rgba(50, 135, 255, 0.16);

}

 

textarea {

  resize: vertical;

}

 

[hidden] {

  display: none !important;

}

 

.scenes-app {

  display: flex;

  flex-direction: column;

  width: 100%;

  min-height: 100vh;

  min-height: 100dvh;

}

 

/* =========================================================

   BOTÕES

   ========================================================= */

 

.scenes-button {

  display: inline-flex;

  justify-content: center;

  align-items: center;

  gap: 8px;

 

  min-height: 40px;

  padding: 9px 15px;

 

  border: 1px solid var(--scenes-border);

  border-radius: 9px;

 

  background: var(--scenes-panel-alt);

  color: var(--scenes-text);

 

  font-size: 13px;

  font-weight: 600;

  text-decoration: none;

  white-space: nowrap;

 

  transition:

    background 0.15s ease,

    border-color 0.15s ease,

    transform 0.15s ease;

}

 

.scenes-button:hover:not(:disabled) {

  background: var(--scenes-panel-hover);

  border-color: #51647f;

}

 

.scenes-button:active:not(:disabled) {

  transform: scale(0.98);

}

 

.scenes-button-primary {

  background: var(--scenes-primary);

  border-color: var(--scenes-primary);

  color: #fff;

}

 

.scenes-button-primary:hover:not(:disabled) {

  background: var(--scenes-primary-hover);

  border-color: var(--scenes-primary-hover);

}

 

.scenes-button-danger {

  color: #ffb8c0;

  border-color: rgba(228, 88, 104, 0.45);

  background: rgba(228, 88, 104, 0.12);

}

 

.scenes-button-danger:hover:not(:disabled) {

  background: rgba(228, 88, 104, 0.22);

}

 

.scenes-icon-button {

  display: inline-flex;

  justify-content: center;

  align-items: center;

 

  width: 40px;

  height: 40px;

  flex-shrink: 0;

 

  border: 1px solid var(--scenes-border);

  border-radius: 10px;

 

  background: var(--scenes-panel-alt);

  color: var(--scenes-text);

 

  font-size: 22px;

  text-decoration: none;

}

 

.scenes-icon-button:hover {

  background: var(--scenes-panel-hover);

}

 

/* =========================================================

   CABEÇALHO

   ========================================================= */

 

.scenes-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 12px;

 

  min-height: calc(

    var(--scenes-header-height) + var(--scenes-safe-top)

  );

 

  padding:

    calc(12px + var(--scenes-safe-top))

    calc(20px + var(--scenes-safe-right))

    12px

    calc(20px + var(--scenes-safe-left));

 

  background: #141b27;

  border-bottom: 1px solid var(--scenes-border);

  z-index: 10;

}

 

.scenes-header-left,

.scenes-header-right {

  display: flex;

  align-items: center;

  gap: 12px;

}

 

.scenes-brand {

  display: flex;

  flex-direction: column;

  gap: 2px;

}

 

.scenes-brand strong {

  font-size: 18px;

  letter-spacing: -0.3px;

}

 

.scenes-brand small {

  font-size: 11px;

  color: var(--scenes-muted);

}

 

.scenes-save-status {

  font-size: 12px;

  color: var(--scenes-muted);

}

 

/* =========================================================

   BIBLIOTECA

   ========================================================= */

 

.scenes-library-view {

  width: 100%;

  max-width: 1400px;

  margin: 0 auto;

  padding: 30px 28px 50px;

}

 

.scenes-library-heading {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 20px;

  margin-bottom: 26px;

}

 

.scenes-library-heading h1 {

  margin: 0 0 8px;

  font-size: clamp(23px, 3vw, 32px);

  letter-spacing: -0.5px;

}

 

.scenes-library-heading p {

  margin: 0;

  color: var(--scenes-muted);

  font-size: 14px;

  line-height: 1.5;

}

 

.scenes-library-toolbar {

  max-width: 460px;

  margin-bottom: 25px;

}

 

.scenes-library-toolbar label {

  display: block;

  margin-bottom: 8px;

  color: var(--scenes-muted);

  font-size: 12px;

}

 

.scenes-presentation-grid {

  display: grid;

  grid-template-columns:

    repeat(auto-fill, minmax(245px, 1fr));

  gap: 18px;

}

 

.scenes-presentation-card {

  overflow: hidden;

  border: 1px solid var(--scenes-border);

  border-radius: var(--scenes-radius);

  background: var(--scenes-panel);

 

  transition:

    transform 0.15s ease,

    border-color 0.15s ease;

}

 

.scenes-presentation-card:hover {

  transform: translateY(-2px);

  border-color: var(--scenes-primary);

}

 

.scenes-presentation-thumbnail {

  display: flex;

  align-items: center;

  justify-content: center;

  position: relative;

 

  width: 100%;

  aspect-ratio: 16 / 9;

 

  overflow: hidden;

  background:

    linear-gradient(45deg, #253044 25%, transparent 25%),

    linear-gradient(-45deg, #253044 25%, transparent 25%),

    linear-gradient(45deg, transparent 75%, #253044 75%),

    linear-gradient(-45deg, transparent 75%, #253044 75%);

  background-color: #1c2533;

  background-size: 24px 24px;

  background-position:

    0 0,

    0 12px,

    12px -12px,

    -12px 0;

}

 

.scenes-presentation-thumbnail img {

  width: 100%;

  height: 100%;

  object-fit: contain;

}

 

.scenes-presentation-thumbnail .scenes-thumbnail-placeholder {

  font-size: 42px;

  color: rgba(255, 255, 255, 0.55);

}

 

.scenes-presentation-info {

  padding: 15px;

}

 

.scenes-presentation-title {

  margin: 0 0 8px;

  font-size: 15px;

  font-weight: 700;

  overflow-wrap: anywhere;

}

 

.scenes-presentation-meta {

  margin: 0 0 14px;

  color: var(--scenes-muted);

  font-size: 12px;

}

 

.scenes-presentation-actions {

  display: flex;

  flex-wrap: wrap;

  gap: 8px;

}

 

.scenes-presentation-actions .scenes-button {

  flex: 1;

  min-width: 70px;

  padding: 8px;

  font-size: 12px;

}

 

/* =========================================================

   ESTADO VAZIO

   ========================================================= */

 

.scenes-empty-state {

  max-width: 480px;

  margin: 60px auto;

  padding: 40px 25px;

  text-align: center;

 

  border: 1px dashed var(--scenes-border);

  border-radius: 16px;

  background: var(--scenes-panel);

}

 

.scenes-empty-icon {

  margin-bottom: 16px;

  font-size: 48px;

  color: var(--scenes-muted);

}

 

.scenes-empty-state h2 {

  margin: 0 0 10px;

  font-size: 20px;

}

 

.scenes-empty-state p {

  margin: 0;

  color: var(--scenes-muted);

  line-height: 1.6;

  font-size: 14px;

}

 

/* =========================================================

   EDITOR

   ========================================================= */

 

.scenes-editor-view {

  display: flex;

  flex: 1;

  flex-direction: column;

  min-height: 0;

}

 

.scenes-editor-topbar {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 16px;

 

  padding: 12px 18px;

  background: var(--scenes-panel);

  border-bottom: 1px solid var(--scenes-border);

}

 

.scenes-editor-title-group,

.scenes-editor-actions {

  display: flex;

  align-items: center;

  gap: 10px;

}

 

.scenes-editor-title-group {

  min-width: 0;

  flex: 1;

}

 

.scenes-editor-title-group .scenes-field {

  width: min(100%, 380px);

}

 

.scenes-editor-title-group .scenes-field input {

  font-weight: 600;

}

 

.scenes-workspace {

  display: grid;

  grid-template-columns: 230px minmax(0, 1fr) 270px;

  flex: 1;

  min-height: 0;

  height: calc(100dvh - 150px);

}

 

/* =========================================================

   PAINÉIS

   ========================================================= */

 

.scenes-sidebar,

.scenes-properties {

  min-width: 0;

  overflow-y: auto;

  padding: 16px 12px;

 

  background: var(--scenes-panel);

}

 

.scenes-sidebar {

  border-right: 1px solid var(--scenes-border);

}

 

.scenes-properties {

  border-left: 1px solid var(--scenes-border);

}

 

.scenes-panel-heading {

  display: flex;

  justify-content: space-between;

  align-items: center;

  margin-bottom: 16px;

  padding: 0 5px;

}

 

.scenes-panel-heading h2 {

  margin: 0;

  font-size: 14px;

  font-weight: 700;

}

 

.scenes-panel-heading span {

  padding: 3px 8px;

  border-radius: 20px;

  background: var(--scenes-panel-alt);

  color: var(--scenes-muted);

  font-size: 11px;

}

 

.scenes-field {

  display: flex;

  flex-direction: column;

  gap: 7px;

  margin-bottom: 15px;

}

 

.scenes-field > span {

  color: var(--scenes-muted);

  font-size: 12px;

  font-weight: 500;

}

 

.scenes-field input[type="color"] {

  min-height: 43px;

  padding: 4px;

  cursor: pointer;

}

 

.scenes-field input[type="range"] {

  padding: 7px 0;

  accent-color: var(--scenes-primary);

}

 

.scenes-properties .scenes-button {

  width: 100%;

  margin-bottom: 9px;

}

 

.scenes-element-properties {

  margin-top: 20px;

  padding-top: 16px;

  border-top: 1px solid var(--scenes-border);

}

 

.scenes-element-properties h3 {

  margin: 0 0 18px;

  font-size: 14px;

}

 

/* =========================================================

   MINIATURAS DAS CENAS

   ========================================================= */

 

.scenes-slide-list {

  display: flex;

  flex-direction: column;

  gap: 12px;

}

 

.scenes-slide-item {

  position: relative;

  padding: 9px;

 

  border: 1px solid var(--scenes-border);

  border-radius: 11px;

  background: var(--scenes-panel-alt);

 

  cursor: pointer;

  transition: border-color 0.15s ease;

}

 

.scenes-slide-item:hover {

  border-color: #7284a0;

}

 

.scenes-slide-item.active {

  border-color: var(--scenes-primary);

  box-shadow: 0 0 0 1px var(--scenes-primary);

}

 

.scenes-slide-thumbnail {

  position: relative;

  width: 100%;

  aspect-ratio: 16 / 9;

 

  overflow: hidden;

  border-radius: 7px;

 

  background:

    linear-gradient(45deg, #354156 25%, transparent 25%),

    linear-gradient(-45deg, #354156 25%, transparent 25%),

    linear-gradient(45deg, transparent 75%, #354156 75%),

    linear-gradient(-45deg, transparent 75%, #354156 75%);

  background-color: #263144;

  background-size: 20px 20px;

  background-position:

    0 0,

    0 10px,

    10px -10px,

    -10px 0;

}

 

.scenes-slide-thumbnail img {

  width: 100%;

  height: 100%;

  object-fit: contain;

}

 

.scenes-slide-name {

  display: flex;

  align-items: center;

  gap: 7px;

  margin-top: 8px;

  color: var(--scenes-text);

  font-size: 12px;

  font-weight: 600;

  overflow-wrap: anywhere;

}

 

.scenes-slide-number {

  color: var(--scenes-muted);

}

 

/* =========================================================

   ÁREA CENTRAL

   ========================================================= */

 

.scenes-stage-section {

  display: flex;

  flex-direction: column;

  min-width: 0;

  min-height: 0;

  background: #0b1018;

}

 

.scenes-tools {

  display: flex;

  align-items: center;

  flex-wrap: wrap;

  gap: 7px;

  padding: 10px 14px;

 

  border-bottom: 1px solid var(--scenes-border);

  background: #151d2a;

}

 

.scenes-tool-button {

  display: inline-flex;

  justify-content: center;

  align-items: center;

 

  min-height: 37px;

  padding: 7px 12px;

 

  border: 1px solid transparent;

  border-radius: 8px;

 

  background: transparent;

  color: var(--scenes-text);

 

  font-size: 12px;

  font-weight: 600;

}

 

.scenes-tool-button:hover {

  background: var(--scenes-panel-hover);

}

 

.scenes-tool-button.active {

  border-color: var(--scenes-primary);

  background: rgba(50, 135, 255, 0.16);

  color: #a9cfff;

}

 

.scenes-tool-separator {

  width: 1px;

  height: 25px;

  margin: 0 4px;

  background: var(--scenes-border);

}

 

.scenes-stage-outer {

  display: flex;

  justify-content: center;

  align-items: center;

 

  flex: 1;

  min-height: 220px;

  overflow: auto;

 

  padding: 25px;

}

 

/* =========================================================

   SUPERFÍCIE DA CENA

 

   A proporção padrão é 16:9.

   O JavaScript poderá alterar essa proporção.

   ========================================================= */

 

.scenes-stage {

  position: relative;

  width: min(100%, 960px);

  aspect-ratio: 16 / 9;

 

  flex-shrink: 0;

  overflow: hidden;

 

  border: 1px solid #62738d;

  border-radius: 4px;

 

  background-color: #1c2532;

 

  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.45);

  outline: none;

 

  touch-action: none;

}

 

.scenes-stage:focus-visible {

  border-color: var(--scenes-primary);

}

 

.scenes-stage-background,

.scenes-stage-elements {

  position: absolute;

  inset: 0;

  width: 100%;

  height: 100%;

}

 

.scenes-stage-background {

  z-index: 0;

 

  background:

    linear-gradient(45deg, #263246 25%, transparent 25%),

    linear-gradient(-45deg, #263246 25%, transparent 25%),

    linear-gradient(45deg, transparent 75%, #263246 75%),

    linear-gradient(-45deg, transparent 75%, #263246 75%);

 

  background-color: #1c2532;

  background-size: 24px 24px;

  background-position:

    0 0,

    0 12px,

    12px -12px,

    -12px 0;

}

 

.scenes-stage-elements {

  z-index: 1;

  pointer-events: none;

}

 

.scenes-stage-empty {

  position: absolute;

  inset: 0;

  z-index: 2;

 

  display: flex;

  justify-content: center;

  align-items: center;

 

  color: var(--scenes-muted);

  font-size: 14px;

  pointer-events: none;

}

 

/* =========================================================

   ELEMENTOS VISUAIS

   ========================================================= */

 

.scenes-element {

  position: absolute;

  display: flex;

  align-items: center;

  justify-content: center;

 

  min-width: 10px;

  min-height: 10px;

 

  transform-origin: center center;

  overflow: visible;

 

  pointer-events: auto;

  touch-action: none;

  user-select: none;

  cursor: move;

}

 

.scenes-element.selected {

  outline: 2px solid var(--scenes-primary);

  outline-offset: 2px;

}

 

.scenes-element-text {

  width: 100%;

  height: 100%;

 

  white-space: pre-wrap;

  overflow-wrap: anywhere;

  line-height: 1.15;

 

  pointer-events: none;

}

 

.scenes-element-image {

  display: block;

  width: 100%;

  height: 100%;

  object-fit: contain;

  pointer-events: none;

}

 

.scenes-element-shape {

  width: 100%;

  height: 100%;

  pointer-events: none;

}

 

.scenes-element-resize {

  position: absolute;

  right: -8px;

  bottom: -8px;

 

  width: 16px;

  height: 16px;

 

  border: 2px solid #fff;

  border-radius: 4px;

 

  background: var(--scenes-primary);

  cursor: nwse-resize;

  pointer-events: auto;

}

 

.scenes-element-rotate {

  position: absolute;

  top: -31px;

  left: calc(50% - 9px);

 

  width: 18px;

  height: 18px;

 

  border: 2px solid #fff;

  border-radius: 50%;

 

  background: var(--scenes-primary);

  cursor: grab;

  pointer-events: auto;

}

 

/* =========================================================

   RODAPÉ DO EDITOR

   ========================================================= */

 

.scenes-stage-footer {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 12px;

 

  min-height: 49px;

  padding: 8px 16px;

 

  border-top: 1px solid var(--scenes-border);

  background: #151d2a;

 

  color: var(--scenes-muted);

  font-size: 12px;

}

 

.scenes-zoom-controls {

  display: flex;

  align-items: center;

  gap: 8px;

}

 

.scenes-zoom-controls button {

  width: 30px;

  height: 30px;

 

  border: 1px solid var(--scenes-border);

  border-radius: 7px;

 

  background: var(--scenes-panel-alt);

  color: var(--scenes-text);

  font-size: 18px;

}

 

.scenes-zoom-controls span {

  min-width: 42px;

  text-align: center;

}

 

/* =========================================================

   VISUALIZAÇÃO

   ========================================================= */

 

.scenes-preview-overlay {

  position: fixed;

  inset: 0;

  z-index: 1000;

 

  display: flex;

  flex-direction: column;

 

  padding:

    calc(12px + var(--scenes-safe-top))

    calc(12px + var(--scenes-safe-right))

    calc(12px + var(--scenes-safe-bottom))

    calc(12px + var(--scenes-safe-left));

 

  background: rgba(5, 9, 15, 0.97);

}

 

.scenes-preview-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 12px;

 

  padding: 5px 8px 15px;

  font-size: 15px;

  font-weight: 700;

}

 

.scenes-preview-stage {

  position: relative;

 

  width: min(100%, 1100px);

  aspect-ratio: 16 / 9;

 

  max-height: 75vh;

  margin: auto;

 

  overflow: hidden;

  background: transparent;

 

  border: 1px solid var(--scenes-border);

  border-radius: 5px;

}

 

.scenes-preview-controls {

  display: flex;

  justify-content: center;

  align-items: center;

  gap: 20px;

 

  padding: 15px 0 5px;

}

 

.scenes-preview-controls span {

  min-width: 65px;

  text-align: center;

  font-size: 13px;

}

 

/* =========================================================

   CONFIRMAÇÃO

   ========================================================= */

 

.scenes-confirm-overlay {

  position: fixed;

  inset: 0;

  z-index: 1200;

 

  display: flex;

  justify-content: center;

  align-items: center;

 

  padding: 20px;

  background: rgba(0, 0, 0, 0.75);

}

 

.scenes-confirm-dialog {

  width: min(100%, 420px);

  padding: 25px;

 

  border: 1px solid var(--scenes-border);

  border-radius: 15px;

 

  background: var(--scenes-panel);

  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);

}

 

.scenes-confirm-dialog h2 {

  margin: 0 0 12px;

  font-size: 19px;

}

 

.scenes-confirm-dialog p {

  margin: 0 0 22px;

  color: var(--scenes-muted);

  line-height: 1.6;

  font-size: 14px;

}

 

.scenes-confirm-actions {

  display: flex;

  justify-content: flex-end;

  gap: 10px;

}

 

/* =========================================================

   NOTIFICAÇÕES

   ========================================================= */

 

.scenes-toast {

  position: fixed;

  left: 50%;

  bottom: calc(25px + var(--scenes-safe-bottom));

  z-index: 1500;

 

  max-width: min(90vw, 420px);

  padding: 11px 18px;

 

  border: 1px solid var(--scenes-border);

  border-radius: 10px;

 

  background: #273449;

  color: #fff;

 

  font-size: 13px;

  text-align: center;

 

  opacity: 0;

  visibility: hidden;

  pointer-events: none;

 

  transform: translate(-50%, 12px);

 

  transition:

    opacity 0.2s ease,

    transform 0.2s ease,

    visibility 0.2s ease;

}

 

.scenes-toast.show {

  opacity: 1;

  visibility: visible;

  transform: translate(-50%, 0);

}

 

/* =========================================================

   TABLET

   ========================================================= */

 

@media (max-width: 1100px) {

 

  .scenes-workspace {

    grid-template-columns: 180px minmax(0, 1fr) 225px;

  }

 

  .scenes-sidebar,

  .scenes-properties {

    padding: 12px 9px;

  }

 

  .scenes-stage-outer {

    padding: 15px;

  }

 

}

 

/* =========================================================

   CELULAR / IPHONE

   ========================================================= */

 

@media (max-width: 760px) {

 

  .scenes-header {

    padding:

      calc(9px + var(--scenes-safe-top))

      calc(10px + var(--scenes-safe-right))

      9px

      calc(10px + var(--scenes-safe-left));

  }

 

  .scenes-brand strong {

    font-size: 16px;

  }

 

  .scenes-save-status {

    display: none;

  }

 

  .scenes-library-view {

    padding: 22px 14px 40px;

  }

 

  .scenes-library-heading {

    flex-direction: column;

    align-items: stretch;

    gap: 16px;

  }

 

  .scenes-library-heading .scenes-button {

    width: 100%;

  }

 

  .scenes-presentation-grid {

    grid-template-columns: repeat(

      auto-fill,

      minmax(155px, 1fr)

    );

    gap: 12px;

  }

 

  .scenes-presentation-info {

    padding: 11px;

  }

 

  .scenes-editor-topbar {

    flex-wrap: wrap;

    padding: 9px;

  }

 

  .scenes-editor-title-group {

    width: 100%;

  }

 

  .scenes-editor-actions {

    width: 100%;

    justify-content: flex-end;

  }

 

  .scenes-workspace {

    display: flex;

    flex-direction: column;

    height: auto;

    min-height: 0;

  }

 

  .scenes-sidebar {

    order: 1;

    width: 100%;

    max-height: 170px;

    overflow-x: auto;

    overflow-y: hidden;

 

    border-right: 0;

    border-bottom: 1px solid var(--scenes-border);

  }

 

  .scenes-sidebar .scenes-panel-heading {

    margin-bottom: 8px;

  }

 

  .scenes-slide-list {

    flex-direction: row;

    gap: 9px;

  }

 

  .scenes-slide-item {

    width: 145px;

    flex: 0 0 145px;

  }

 

  .scenes-stage-section {

    order: 2;

    min-height: 360px;

  }

 

  .scenes-tools {

    flex-wrap: nowrap;

    overflow-x: auto;

    padding: 8px;

  }

 

  .scenes-tool-button {

    flex: 0 0 auto;

  }

 

  .scenes-stage-outer {

    min-height: 260px;

    padding: 12px;

  }

 

  .scenes-stage {

    width: 100%;

  }

 

  .scenes-properties {

    order: 3;

    width: 100%;

    max-height: none;

 

    border-left: 0;

    border-top: 1px solid var(--scenes-border);

  }

 

  .scenes-preview-controls {

    gap: 10px;

  }

 

  .scenes-preview-controls .scenes-button {

    padding: 8px 10px;

    font-size: 12px;

  }

 

}

 

/* =========================================================

   TELAS PEQUENAS

   ========================================================= */

 

@media (max-width: 380px) {

 

  .scenes-header-right .scenes-button {

    padding: 8px 10px;

  }

 

  .scenes-brand small {

    font-size: 10px;

  }

 

  .scenes-presentation-grid {

    grid-template-columns: 1fr;

  }

 

  .scenes-editor-actions .scenes-button {

    flex: 1;

  }

 

}

 

/* =========================================================

   ACESSIBILIDADE

   ========================================================= */

 

@media (prefers-reduced-motion: reduce) {

 

  *,

  *::before,

  *::after {

    scroll-behavior: auto !important;

    transition-duration: 0.01ms !important;

    animation-duration: 0.01ms !important;

  }

 

}

 

 

/* =========================================================

   LOUSA CAM 2.0 — CENAS

   CORREÇÃO: SUPERFÍCIE VISUAL DO EDITOR

 

   - Facilita a edição de textos escuros

   - Preserva as cores originais dos elementos

   - Não modifica a transparência da cena

   - Não altera o Player nem o Renderizador

   ========================================================= */

 

/* Apenas a superfície de trabalho do editor */

.scenes-editor-view .scenes-stage {

  background-color: #ffffff;

 

  background-image:

    linear-gradient(

      45deg,

      #e5e7eb 25%,

      transparent 25%

    ),

    linear-gradient(

      -45deg,

      #e5e7eb 25%,

      transparent 25%

    ),

    linear-gradient(

      45deg,

      transparent 75%,

      #e5e7eb 75%

    ),

    linear-gradient(

      -45deg,

      transparent 75%,

      #e5e7eb 75%

    );

 

  background-size: 24px 24px;

 

  background-position:

    0 0,

    0 12px,

    12px -12px,

    -12px 0;

}

 

 

/* A camada transparente não deve esconder

   o fundo de visualização do editor. */

 

.scenes-editor-view .scenes-stage-background {

  background-color: transparent;

  background-image: none;

}

 

 

/*

   Melhora a leitura de textos brancos no editor,

   sem modificar a cor salva no elemento.

*/

.scenes-editor-view .scenes-element-text {

  text-shadow:

    0 1px 2px rgba(0, 0, 0, 0.35);

}

 

 

/* =====================================================

   LOUSA CAM 2.0 — CENAS

   AJUSTE DE ROLAGEM NO IPHONE

 

   Permite rolagem vertical quando o toque

   começa no fundo da cena.

 

   Preserva o arraste, a rotação e o

   redimensionamento dos elementos.

   ===================================================== */

 

@media (pointer: coarse) {

 

  .scenes-stage {

    touch-action: pan-y;

  }

 

  .scenes-stage-background,

  .scenes-stage-elements {

    touch-action: pan-y;

  }

 

  .scenes-element,

  .scenes-element-resize,

  .scenes-element-rotate {

    touch-action: none;

  }

 

}

 

/* =====================================================

   CENAS — FORMATO VERTICAL 9:16

   Somente palco, miniaturas e visualização.

   ===================================================== */

.scenes-stage.scenes-portrait {

  aspect-ratio: 9 / 16;

  max-width: 100%;

}

.scenes-preview-stage.scenes-portrait {

  aspect-ratio: 9 / 16;

  width: min(100%, calc(70dvh * 9 / 16));

  max-height: 70dvh;

}

.scenes-slide-thumbnail.scenes-portrait {

  aspect-ratio: 9 / 16;

  max-height: 100px;

  width: auto;

  margin: 0 auto;

}

@media (max-width: 760px) {

  .scenes-stage-outer { align-items: flex-start; }

  .scenes-stage.scenes-portrait { margin: 0 auto; }

  .scenes-zoom-controls { flex-wrap: wrap; }

}
