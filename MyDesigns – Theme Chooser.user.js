// ==UserScript==
// @name         MyDesigns – Theme Chooser + Color Picker (Full, Fixed Custom)
// @namespace    ldd.mydesigns.theme.chooser.palette.picker.full
// @version      1.2
// @description  Floating theme chooser with presets + custom color/gradient picker (saved + applies instantly)
// @match        https://*.mydesigns.io/*
// @grant        GM_addStyle
// ==/UserScript==

(() => {
  const LS_KEY = "ldd_md_theme_key_v2";
  const LS_CUSTOM_1 = "ldd_md_theme_custom_1";
  const LS_CUSTOM_2 = "ldd_md_theme_custom_2";
  const LS_CUSTOM_MODE = "ldd_md_theme_custom_mode"; // "solid" | "gradient"

  const DEFAULT_CUSTOM_1 = "#3b82f6"; // blue
  const DEFAULT_CUSTOM_2 = "#a855f7"; // purple

  // Helper: build a “white UI + accent gradient” theme
  const buildAccentTheme = ({ name, a1, a2, a3 }) => ({
    name,
    css: `
:root{
  --a1:${a1};
  --a2:${a2};
  --a3:${a3};

  --page-bg:#f7f8ff;
  --card:#ffffff;
  --border: rgba(15,23,42,.10);

  --text:#334155;
  --muted:#64748b;
}

/* Page */
body{
  background: linear-gradient(180deg,#ffffff 0%, var(--page-bg) 100%) !important;
  color: var(--text) !important;
}

/* Default text on light surfaces */
body, div, span, p, label, small{ color: var(--text) !important; }
.text-gray-400,.text-gray-500,.text-gray-600{ color: var(--muted) !important; }
::placeholder{ color:#94a3b8 !important; }

/* Gradient bars -> white text */
header,
div[class*="border-b"]{
  background: linear-gradient(90deg,var(--a1),var(--a2),var(--a3)) !important;
  color: rgba(255,255,255,.95) !important;
}
header *, div[class*="border-b"] *{
  color: rgba(255,255,255,.95) !important;
}

/* Cards / panels (keep readable) */
div[class*="bg-gray"],
div[class*="bg-slate"],
div[class*="bg-neutral"]{
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  box-shadow: 0 10px 34px rgba(2,6,23,.08) !important;
  border-radius: 16px !important;
  color: var(--text) !important;
}
div[class*="bg-gray"] *,
div[class*="bg-slate"] *,
div[class*="bg-neutral"] *{
  color: var(--text) !important;
}

/* Buttons */
button{
  background: linear-gradient(135deg,var(--a1),var(--a2),var(--a3)) !important;
  color:#fff !important;
  border-radius: 12px !important;
  border:none !important;
  font-weight: 800 !important;
}
button:hover{
  filter: brightness(1.06);
  box-shadow: 0 0 0 3px rgba(0,0,0,.06), 0 0 0 6px rgba(255,255,255,.10);
}

/* Inputs readable */
input, textarea, select{
  background:#fff !important;
  border: 1px solid rgba(99,102,241,.22) !important;
  border-radius: 12px !important;
  color: var(--text) !important;
}
input:focus, textarea:focus, select:focus{
  outline:none !important;
  box-shadow: 0 0 0 3px rgba(0,0,0,.06), 0 0 0 6px rgba(99,102,241,.18) !important;
}

/* Dialogs */
div[role="dialog"]{
  background: linear-gradient(180deg,#ffffff, rgba(99,102,241,.06)) !important;
  border: 1px solid rgba(99,102,241,.18) !important;
  border-radius: 20px !important;
}

/* Sidebar areas */
aside, nav{
  background: linear-gradient(180deg,#f8fafc, rgba(99,102,241,.06)) !important;
}

/* Scrollbar */
::-webkit-scrollbar{ width:10px; }
::-webkit-scrollbar-thumb{
  background: linear-gradient(var(--a1),var(--a3));
  border-radius: 10px;
}
    `,
  });

  // Read persisted custom colors (or defaults)
  const getCustom1 = () => localStorage.getItem(LS_CUSTOM_1) || DEFAULT_CUSTOM_1;
  const getCustom2 = () => localStorage.getItem(LS_CUSTOM_2) || DEFAULT_CUSTOM_2;
  const getCustomMode = () => localStorage.getItem(LS_CUSTOM_MODE) || "gradient";

  // Style tag we swap
  const STYLE_ID = "ldd_md_theme_style";
  function ensureStyle() {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.documentElement.appendChild(el);
    }
    return el;
  }

  // Apply custom instantly using current picker values (no re-read timing issues)
  function applyCustomNow(c1, c2, mode) {
    const a1 = c1;
    const a2 = mode === "solid" ? c1 : c2;
    const a3 = mode === "solid" ? c1 : c2;

    const theme = buildAccentTheme({ name: "Custom", a1, a2, a3 });
    ensureStyle().textContent = theme.css || "";
    localStorage.setItem(LS_KEY, "custom");
    syncUI("custom");
  }

  const THEMES = {
    greenWhite: buildAccentTheme({
      name: "Green + White",
      a1: "#22c55e",
      a2: "#16a34a",
      a3: "#10b981",
    }),

    blue: buildAccentTheme({
      name: "Blue",
      a1: "#3b82f6",
      a2: "#2563eb",
      a3: "#60a5fa",
    }),

    bluePurple: buildAccentTheme({
      name: "Blue → Purple",
      a1: "#3b82f6",
      a2: "#6366f1",
      a3: "#a855f7",
    }),

    purpleWhite: buildAccentTheme({
      name: "Purple + White",
      a1: "#a855f7",
      a2: "#c084fc",
      a3: "#ede9fe",
    }),

    red: buildAccentTheme({
      name: "Red",
      a1: "#ef4444",
      a2: "#dc2626",
      a3: "#fb7185",
    }),

    pink: buildAccentTheme({
      name: "Pink",
      a1: "#ec4899",
      a2: "#db2777",
      a3: "#f472b6",
    }),

    off: { name: "Off (Default)", css: `` },
  };

  function applyTheme(key) {
    if (key === "custom") {
      // Apply using saved values (still instant)
      applyCustomNow(getCustom1(), getCustom2(), getCustomMode());
      return;
    }

    const theme = THEMES[key] || THEMES.greenWhite;
    ensureStyle().textContent = theme.css || "";
    localStorage.setItem(LS_KEY, key);
    syncUI(key);
  }

  // UI CSS
  GM_addStyle(`
#lddThemeFab{
  position: fixed; z-index: 999999;
  right: 16px; bottom: 16px;
  width: 46px; height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,.12);
  background: linear-gradient(135deg,#22c55e,#3b82f6,#ec4899);
  color: white;
  font: 900 16px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  box-shadow: 0 16px 50px rgba(0,0,0,.22);
  cursor: pointer;
}
#lddThemePanel{
  position: fixed; z-index: 999999;
  right: 16px; bottom: 72px;
  width: 280px;
  border-radius: 18px;
  border: 1px solid rgba(0,0,0,.12);
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
  overflow: hidden;
  display: none;
}
#lddThemePanel .hdr{
  padding: 12px 14px;
  display: flex; align-items: center; gap: 10px;
  font: 900 13px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  border-bottom: 1px solid rgba(0,0,0,.08);
}
#lddThemePanel .hdr .x{
  margin-left: auto;
  opacity: .7;
  font-weight: 900;
  cursor: pointer;
}
#lddThemePanel .body{
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lddOpt{
  display:flex; align-items:center; justify-content:space-between;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,.10);
  cursor:pointer;
  user-select:none;
  font: 800 13px/1.1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
.lddOpt .sw{
  width: 44px; height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,.10);
  overflow:hidden;
}
.lddOpt.active{
  outline: 3px solid rgba(59,130,246,.20);
}
.lddRow{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px dashed rgba(0,0,0,.16);
  font: 800 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
.lddRow .right{
  display:flex; align-items:center; gap:10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.lddRow input[type="color"]{
  width: 44px; height: 28px;
  padding:0; border:none; background: transparent;
  cursor:pointer;
}
.lddSeg{
  display:flex; align-items:center; gap:6px;
}
.lddSeg button{
  padding: 8px 10px !important;
  border-radius: 10px !important;
  font-weight: 900 !important;
  border: 1px solid rgba(0,0,0,.10) !important;
  background: #ffffff !important;
  color: #111827 !important;
}
.lddSeg button.active{
  background: linear-gradient(135deg, rgba(59,130,246,.18), rgba(168,85,247,.18)) !important;
}
#lddApplyCustom{
  padding: 8px 10px !important;
  border-radius: 10px !important;
  font-weight: 900 !important;
  border: 1px solid rgba(0,0,0,.10) !important;
  background: #ffffff !important;
  color: #111827 !important;
}
  `);

  function createUI() {
    if (document.getElementById("lddThemeFab")) return;

    const fab = document.createElement("button");
    fab.id = "lddThemeFab";
    fab.type = "button";
    fab.textContent = "🎨";

    const panel = document.createElement("div");
    panel.id = "lddThemePanel";
    panel.innerHTML = `
      <div class="hdr">
        <div>Theme</div>
        <div class="x" id="lddThemeClose">Close</div>
      </div>
      <div class="body" id="lddThemeBody"></div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    const body = panel.querySelector("#lddThemeBody");

    const makeOpt = (key, label, swStyle) => {
      const el = document.createElement("div");
      el.className = "lddOpt";
      el.dataset.key = key;
      el.innerHTML = `
        <div>${label}</div>
        <div class="sw" style="${swStyle}"></div>
      `;
      el.addEventListener("click", () => applyTheme(key));
      body.appendChild(el);
    };

    // Presets
    makeOpt("greenWhite", "Green + White", `background:linear-gradient(90deg,#22c55e,#10b981);`);
    makeOpt("blue", "Blue", `background:linear-gradient(90deg,#3b82f6,#60a5fa);`);
    makeOpt("bluePurple", "Blue → Purple", `background:linear-gradient(90deg,#3b82f6,#6366f1,#a855f7);`);
    makeOpt("purpleWhite", "Purple + White", `background:linear-gradient(90deg,#a855f7,#c084fc,#ede9fe);`);
    makeOpt("red", "Red", `background:linear-gradient(90deg,#ef4444,#fb7185);`);
    makeOpt("pink", "Pink", `background:linear-gradient(90deg,#ec4899,#f472b6);`);

    // Custom option (clicking it applies current picker values)
    const customOpt = document.createElement("div");
    customOpt.className = "lddOpt";
    customOpt.dataset.key = "custom";
    customOpt.innerHTML = `
      <div>Custom (Picker)</div>
      <div class="sw" id="lddCustomSw"></div>
    `;
    body.appendChild(customOpt);

    // Custom row (color picker controls)
    const customRow = document.createElement("div");
    customRow.className = "lddRow";
    customRow.innerHTML = `
      <div>Pick</div>
      <div class="right">
        <input id="lddC1" type="color" title="Primary color" />
        <input id="lddC2" type="color" title="Secondary color" />
        <div class="lddSeg">
          <button id="lddModeSolid" type="button">Solid</button>
          <button id="lddModeGrad" type="button">Grad</button>
        </div>
        <button id="lddApplyCustom" type="button">Apply</button>
      </div>
    `;
    body.appendChild(customRow);

    // Off
    makeOpt("off", "Off (Default)", `background:linear-gradient(90deg,#e5e7eb,#f3f4f6);`);

    // Wire controls
    const c1 = customRow.querySelector("#lddC1");
    const c2 = customRow.querySelector("#lddC2");
    const solidBtn = customRow.querySelector("#lddModeSolid");
    const gradBtn = customRow.querySelector("#lddModeGrad");
    const applyBtn = customRow.querySelector("#lddApplyCustom");

    c1.value = getCustom1();
    c2.value = getCustom2();

    const customSw = customOpt.querySelector("#lddCustomSw");

    function syncModeButtons() {
      const mode = getCustomMode();
      solidBtn.classList.toggle("active", mode === "solid");
      gradBtn.classList.toggle("active", mode === "gradient");
      c2.style.opacity = mode === "solid" ? "0.35" : "1";
      c2.style.pointerEvents = mode === "solid" ? "none" : "auto";
    }

    function updateCustomSwatch() {
      const mode = getCustomMode();
      const v1 = c1.value || getCustom1();
      const v2 = c2.value || getCustom2();
      customSw.style.background =
        mode === "solid"
          ? `linear-gradient(90deg, ${v1}, ${v1})`
          : `linear-gradient(90deg, ${v1}, ${v2})`;
    }

    solidBtn.addEventListener("click", () => {
      localStorage.setItem(LS_CUSTOM_MODE, "solid");
      syncModeButtons();
      updateCustomSwatch();
    });

    gradBtn.addEventListener("click", () => {
      localStorage.setItem(LS_CUSTOM_MODE, "gradient");
      syncModeButtons();
      updateCustomSwatch();
    });

    // Clicking the custom option applies current picker values immediately
    customOpt.addEventListener("click", () => {
      const v1 = c1.value || getCustom1();
      const v2 = c2.value || getCustom2();
      applyCustomNow(v1, v2, getCustomMode());
    });

    // Apply button saves + applies instantly
    applyBtn.addEventListener("click", () => {
      const v1 = c1.value || DEFAULT_CUSTOM_1;
      const v2 = c2.value || DEFAULT_CUSTOM_2;
      const mode = getCustomMode();

      localStorage.setItem(LS_CUSTOM_1, v1);
      localStorage.setItem(LS_CUSTOM_2, v2);

      updateCustomSwatch();
      applyCustomNow(v1, v2, mode);
    });

    // Live swatch updates as you pick
    c1.addEventListener("input", updateCustomSwatch);
    c2.addEventListener("input", updateCustomSwatch);

    // Panel controls
    fab.addEventListener("click", () => {
      panel.style.display = (panel.style.display === "block") ? "none" : "block";
      syncUI(localStorage.getItem(LS_KEY) || "greenWhite");
      updateCustomSwatch();
    });

    panel.querySelector("#lddThemeClose").addEventListener("click", () => {
      panel.style.display = "none";
    });

    // close when clicking outside
    document.addEventListener("mousedown", (e) => {
      if (!panel.contains(e.target) && e.target !== fab) panel.style.display = "none";
    });

    // Init
    syncModeButtons();
    updateCustomSwatch();
    syncUI(localStorage.getItem(LS_KEY) || "greenWhite");
  }

  function syncUI(activeKey) {
    const panel = document.getElementById("lddThemePanel");
    if (!panel) return;
    panel.querySelectorAll(".lddOpt").forEach((el) => {
      el.classList.toggle("active", el.dataset.key === activeKey);
    });
  }

  // Boot
  const saved = localStorage.getItem(LS_KEY) || "greenWhite";
  applyTheme(saved);

  if (document.body) createUI();
  else new MutationObserver(() => document.body && createUI())
    .observe(document.documentElement, { childList: true, subtree: true });
})();
