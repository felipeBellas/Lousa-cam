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

        "Editar",

        () => openPresentation(item.id),

        "scenes-button-primary"

      );

      addButton("Apresentar", () => {
        const url = new URL("./index.html", window.location.href);
        url.searchParams.set("camera", "1");
        url.searchParams.set("presentation", item.id);
        window.location.assign(url.href);
      });

 

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

 

    $("scenesSaveButton").onclick = async () => {

      const button = $("scenesSaveButton");
      button.disabled = true;

      try {
        // Aguarda inclusive o salvamento automático em andamento.
        await flushSave();
        // Retorna à biblioteca após a gravação no IndexedDB.
        await showLibrary();
        toast("Apresentação salva com sucesso.");
      } catch (error) {
        toast("Erro ao salvar: " + error.message);
      } finally {
        button.disabled = !presentation;
      }

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
