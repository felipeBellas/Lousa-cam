"use strict";
/* LOUSA CAM — Barra integrada | ETAPA 1
   Apenas organização visual; eventos originais permanecem em scenes.js e scenes-pro.js. */
(() => {
  const editor = document.getElementById("scenesEditorView");
  const toolbar = document.getElementById("scenesProToolbar");
  const hint = document.getElementById("scenesProHint");
  const bridge = window.ScenesProBridge;
  if (!editor || !toolbar || !bridge) return;

  const heading = toolbar.querySelector(".scenes-pro-head strong");
  if (heading) heading.textContent = "Texto";

  const update = () => {
    if (editor.hidden) return;
    const selected = bridge.getSelected();
    const isText = selected?.type === "text";
    toolbar.hidden = !isText;
    if (hint && isText) hint.textContent = "Formatação";
  };

  // O editor original é responsável pela seleção e pelas alterações.
  document.addEventListener("scenespro:change", update);
  const stage = document.getElementById("scenesStage");
  stage?.addEventListener("pointerup", () => requestAnimationFrame(update));
  stage?.addEventListener("click", () => requestAnimationFrame(update));
  document.getElementById("scenesSlideList")?.addEventListener("click", () => requestAnimationFrame(update));
  document.querySelector(".scenes-tools")?.addEventListener("click", () => requestAnimationFrame(update));
  document.getElementById("scenesDeleteElementButton")?.addEventListener("click", () => requestAnimationFrame(update));
  new MutationObserver(update).observe(editor, {attributes:true, attributeFilter:["hidden"]});
  update();
})();
