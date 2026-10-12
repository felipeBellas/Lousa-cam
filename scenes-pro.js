"use strict";
/* CENAS PRO — painel isolado; estilos aplicados ao objeto de texto inteiro. */
(() => {
  const $ = id => document.getElementById(id);
  const bridge = window.ScenesProBridge;
  const root = $("scenesProToolbar");
  if (!bridge || !root) return;
  const ids = ["spFont", "spSize", "spColor", "spBold", "spItalic", "spUnderline", "spAlign", "spLine", "spSpacing", "spCase", "spPadding"];
  const controls = ids.map($).filter(Boolean);
  const validNumber = (v, min, max, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  function sync() {
    const e = bridge.getSelected();
    const active = e?.type === "text";
    controls.forEach(c => c.disabled = !active);
    $("scenesProHint").textContent = active ? "Formatação do objeto de texto selecionado" : "Selecione um texto para formatar";
    if (!active) return;
    const values = {
      spFont: e.fontFamily || "Arial, sans-serif", spSize: e.fontSize || 48,
      spColor: e.color || "#ffffff", spAlign: e.align || "left",
      spLine: e.lineHeight || 1.15, spSpacing: e.letterSpacing || 0,
      spCase: e.textTransform || "none", spPadding: e.padding || 0
    };
    for (const [id, value] of Object.entries(values)) {
      const c = $(id);
      if (c && document.activeElement !== c) c.value = String(value);
    }
    const activeButtons = {
      spBold: e.fontWeight === "bold", spItalic: e.fontStyle === "italic",
      spUnderline: e.textDecoration === "underline"
    };
    for (const [id, on] of Object.entries(activeButtons)) {
      $(id).classList.toggle("active", on);
      $(id).setAttribute("aria-pressed", String(on));
    }
  }
  function set(key, value) { bridge.setProperties({ [key]: value }); }
  const bindings = {
    spFont: ["fontFamily", v => v], spSize: ["fontSize", v => validNumber(v, 8, 300, 48)],
    spColor: ["color", v => v], spAlign: ["align", v => v],
    spLine: ["lineHeight", v => validNumber(v, .7, 3, 1.15)],
    spSpacing: ["letterSpacing", v => validNumber(v, -5, 30, 0)],
    spCase: ["textTransform", v => v], spPadding: ["padding", v => validNumber(v, 0, 100, 0)]
  };
  for (const [id, [key, convert]] of Object.entries(bindings)) {
    $(id).addEventListener("change", e => set(key, convert(e.target.value)));
  }
  [["spBold", "fontWeight", "bold", "normal"], ["spItalic", "fontStyle", "italic", "normal"], ["spUnderline", "textDecoration", "underline", "none"]].forEach(([id, key, yes, no]) => {
    $(id).addEventListener("click", () => {
      const e = bridge.getSelected();
      if (e?.type !== "text") return;
      set(key, e[key] === yes ? no : yes);
    });
  });
  // Seleção original é gerenciada por scenes.js; consulta após eventos, sem interceptá-los.
  $("scenesStage")?.addEventListener("pointerup", () => requestAnimationFrame(sync));
  $("scenesSlideList")?.addEventListener("click", () => requestAnimationFrame(sync));
  $("scenesDeleteElementButton")?.addEventListener("click", () => requestAnimationFrame(sync));
  document.addEventListener("scenespro:change", sync);
  document.addEventListener("click", e => {
    if (e.target.closest(".scenes-element, .scenes-slide-item, #scenesSelectTool, #scenesTextTool")) requestAnimationFrame(sync);
  });
  sync();
})();
