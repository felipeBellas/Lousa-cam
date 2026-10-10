
"use strict";

/* =========================================================
   LOUSA CAM 2.0 — CENAS
   SCENES.JS — ETAPA 4

   Editor independente de apresentações.
   Integração com ScenesStorage.

   Não interfere na câmera, Pencil ou gravação.
   ========================================================= */

(() => {

  const $ = id => document.getElementById(id);

  const Storage = window.ScenesStorage;

  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 720;

  let presentation = null;
  let currentSceneIndex = 0;
  let selectedElementId = null;

  let dirty = false;
  let saveTimer = null;
  let saving = false;
  let revision = 0;

  let dragging = null;
  let previewIndex = 0;
  let confirmCallback = null;

  let zoom = 100;

  const objectURLs = [];

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

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent = value;
    }
  }

  function toast(message) {

    const element = $("scenesToast");

    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      element.classList.remove("show");
    }, 2500);

  }

  function setStatus(message) {
    setText("scenesSaveStatus", message);
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

  function newScene(number) {

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

  function releaseObjectURLs() {

    while (objectURLs.length) {
      URL.revokeObjectURL(objectURLs.pop());
    }

  }

  /* =====================================================
     SALVAMENTO
     ===================================================== */

  function markDirty() {

    if (!presentation) return;

    dirty = true;
    revision++;

    setStatus("Alterações não salvas");

    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
      savePresentation();
    }, 1200);

  }

  async function savePresentation() {

    if (!presentation || !dirty || saving) return;

    clearTimeout(saveTimer);

    saving = true;

    const savedRevision = revision;
    const savedId = presentation.id;
    const snapshot = clone(presentation);

    setStatus("Salvando...");

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
      toast(error.message);

    } finally {

      saving = false;

      if (dirty && presentation?.id === savedId) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(savePresentation, 700);
      }

    }

  }

  async function flushSave() {

    clearTimeout(saveTimer);

    while (saving) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (dirty) {

      await savePresentation();

      while (saving) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (dirty) {
        throw new Error("Não foi possível salvar as alterações.");
      }

    }

  }

  /* =====================================================
     BIBLIOTECA DE APRESENTAÇÕES
     ===================================================== */

  async function showLibrary() {

    if (presentation) {
      await flushSave();
    }

    presentation = null;
    selectedElementId = null;
    dirty = false;

    $("scenesEditorView").hidden = true;
    $("scenesLibraryView").hidden = false;

    $("scenesSaveButton").disabled = true;

    await renderLibrary();

  }

  async function renderLibrary() {

    const presentations = await Storage.getPresentations();

    const query = $("scenesSearchInput")
      .value
      .trim()
      .toLocaleLowerCase("pt-BR");

    const filtered = presentations.filter(item =>
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

      function button(label, callback, extraClass = "") {

        const element = document.createElement("button");

        element.type = "button";
        element.className = `scenes-button ${extraClass}`;
        element.textContent = label;

        element.addEventListener("click", callback);

        actions.appendChild(element);

      }

      button(
        "Abrir",
        () => openPresentation(item.id),
        "scenes-button-primary"
      );

      button("Duplicar", async () => {

        try {
          await Storage.duplicatePresentation(item.id);
          await renderLibrary();
          toast("Apresentação duplicada.");
        } catch (error) {
          toast(error.message);
        }

      });

      button("Excluir", () => {

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
        scenes: [newScene(1)]
      });

      await openPresentation(created.id);

    } catch (error) {
      toast(error.message);
    }

  }

  async function openPresentation(id) {

    try {

      const loaded = await Storage.getPresentation(id);

      if (!loaded) {
        throw new Error("Apresentação não encontrada.");
      }

      presentation = loaded;
      currentSceneIndex = 0;
      selectedElementId = null;

      dirty = false;

      $("scenesLibraryView").hidden = true;
      $("scenesEditorView").hidden = false;

      $("scenesSaveButton").disabled = false;
      $("scenesPresentationTitle").value = loaded.title;

      setStatus("Salvo");

      renderEditor();

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
      newScene(presentation.scenes.length + 1)
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
          presentation.scenes.push(newScene(1));
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

    if (file.size > 12 * 1024 * 1024) {
      toast("Imagem acima do limite de 12 MB.");
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
     RENDERIZAÇÃO VISUAL
     ===================================================== */

  function applyBackground(node, scene) {

    if (scene.background?.type === "solid") {
      node.style.backgroundColor =
        scene.background.color || "#ffffff";
    } else {
      node.style.backgroundColor = "transparent";
    }

  }

  function createElementNode(element, editable, stageWidth) {

    const node = document.createElement("div");

    node.className = "scenes-element";
    node.dataset.id = element.id;

    node.style.left =
      `${element.x / BASE_WIDTH * 100}%`;

    node.style.top =
      `${element.y / BASE_HEIGHT * 100}%`;

    node.style.width =
      `${element.width / BASE_WIDTH * 100}%`;

    node.style.height =
      `${element.height / BASE_HEIGHT * 100}%`;

    node.style.transform =
      `rotate(${element.rotation || 0}deg)`;

    node.style.opacity = String(element.opacity ?? 1);

    if (editable && element.id === selectedElementId) {
      node.classList.add("selected");
    }

    if (element.type === "text") {

      const content = document.createElement("div");

      content.className = "scenes-element-text";
      content.textContent = element.text || "";

      content.style.color = element.color || "#ffffff";

      content.style.fontSize =
        `${(element.fontSize || 48) * stageWidth / BASE_WIDTH}px`;

      node.appendChild(content);

    }

    if (element.type === "image") {

      const image = document.createElement("img");

      image.className = "scenes-element-image";
      image.alt = "";

      if (element.blob instanceof Blob) {

        const url = URL.createObjectURL(element.blob);

        objectURLs.push(url);
        image.src = url;

      }

      node.appendChild(image);

    }

    if (element.type === "shape") {

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

    }

    if (editable) {

      node.addEventListener("pointerdown", event => {
        startDrag(event, element, "move");
      });

      if (element.id === selectedElementId) {

        const resize = document.createElement("span");
        resize.className = "scenes-element-resize";

        resize.addEventListener("pointerdown", event => {
          startDrag(event, element, "resize");
        });

        const rotate = document.createElement("span");
        rotate.className = "scenes-element-rotate";

        rotate.addEventListener("pointerdown", event => {
          startDrag(event, element, "rotate");
        });

        node.append(resize, rotate);

      }

    }

    return node;

  }

  function renderStage() {

    const scene = currentScene();

    if (!scene) return;

    releaseObjectURLs();

    const stage = $("scenesStage");
    const layer = $("scenesStageElements");

    applyBackground($("scenesStageBackground"), scene);

    layer.replaceChildren();

    const stageWidth = stage.getBoundingClientRect().width;

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

      name.textContent = `${index + 1}. ${scene.title}`;

      button.append(thumbnail, name);

      button.addEventListener("click", () => {
        selectScene(index);
      });

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

  function renderEditor() {

    if (!presentation) return;

    renderSlides();
    renderStage();
    renderProperties();

  }

  /* =====================================================
     MOVIMENTAÇÃO, REDIMENSIONAMENTO E ROTAÇÃO
     ===================================================== */

  function pointerPosition(event) {

    const rect = $("scenesStage").getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) /
        rect.width * BASE_WIDTH,

      y: (event.clientY - rect.top) /
        rect.height * BASE_HEIGHT
    };

  }

  function startDrag(event, element, mode) {

    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (selectedElementId !== element.id) {
      selectElement(element.id);
    }

    const position = pointerPosition(event);

    dragging = {
      id: element.id,
      pointerId: event.pointerId,
      mode,
      startX: position.x,
      startY: position.y,
      original: { ...element }
    };

    $("scenesStage").setPointerCapture(event.pointerId);

  }

  function updateDrag(event) {

    if (!dragging) return;

    if (event.pointerId !== dragging.pointerId) return;

    const element = selectedElement();

    if (!element || element.id !== dragging.id) return;

    const position = pointerPosition(event);

    const dx = position.x - dragging.startX;
    const dy = position.y - dragging.startY;

    const original = dragging.original;

    if (dragging.mode === "move") {

      element.x = clamp(
        original.x + dx,
        -element.width + 20,
        BASE_WIDTH - 20
      );

      element.y = clamp(
        original.y + dy,
        -element.height + 20,
        BASE_HEIGHT - 20
      );

    }

    if (dragging.mode === "resize") {

      element.width = clamp(
        original.width + dx,
        20,
        BASE_WIDTH * 2
      );

      element.height = clamp(
        original.height + dy,
        20,
        BASE_HEIGHT * 2
      );

    }

    if (dragging.mode === "rotate") {

      const centerX =
        original.x + original.width / 2;

      const centerY =
        original.y + original.height / 2;

      element.rotation = Math.round(
        Math.atan2(
          position.y - centerY,
          position.x - centerX
        ) * 180 / Math.PI + 90
      );

    }

    markDirty();
    renderStage();

  }

  function stopDrag(event) {

    if (!dragging) return;

    if (event.pointerId !== dragging.pointerId) return;

    dragging = null;

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

    if (!presentation) return;

    const scene = presentation.scenes[previewIndex];

    if (!scene) return;

    releaseObjectURLs();

    const stage = $("scenesPreviewStage");

    stage.replaceChildren();

    applyBackground(stage, scene);

    const width = stage.getBoundingClientRect().width;

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
     PROPRIEDADES DOS ELEMENTOS
     ===================================================== */

  function changeElementProperty(property, value) {

    const element = selectedElement();

    if (!element) return;

    element[property] = value;

    markDirty();
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

    $("scenesLibraryButton").onclick = () => {
      showLibrary().catch(error => toast(error.message));
    };

    $("scenesSaveButton").onclick = savePresentation;

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

    $("scenesShapeTool").onclick = () => {

      addElement("shape", {
        shape: "rectangle",
        color: "#3287ff",
        width: 350,
        height: 220
      });

    };

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
        clamp(Number(event.target.value) || 48, 8, 300)
      );

    };

    $("scenesElementOpacity").oninput = event => {

      changeElementProperty(
        "opacity",
        Number(event.target.value) / 100
      );

    };

    $("scenesElementRotation").oninput = event => {

      changeElementProperty(
        "rotation",
        Number(event.target.value) || 0
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

    $("scenesPreviewButton").onclick = openPreview;

    $("scenesClosePreviewButton").onclick = closePreview;

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

    $("scenesConfirmCancel").onclick = closeConfirmation;

    $("scenesConfirmAccept").onclick = async () => {

      const callback = confirmCallback;

      closeConfirmation();

      try {

        if (callback) {
          await callback();
        }

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

  }

  /* =====================================================
     ZOOM
     ===================================================== */

  function applyZoom() {

    $("scenesStage").style.width = `${zoom}%`;

    setText("scenesZoomLabel", `${zoom}%`);

    renderStage();

  }

  /* =====================================================
     INICIALIZAÇÃO
     ===================================================== */

  async function initialize() {

    if (!Storage) {

      toast("Erro: scenes-storage.js não foi carregado.");

      return;

    }

    bindEvents();

    $("scenesSaveButton").disabled = true;

    try {

      await renderLibrary();

    } catch (error) {

      toast(`Erro ao iniciar Cenas: ${error.message}`);

    }

  }

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );

})();
