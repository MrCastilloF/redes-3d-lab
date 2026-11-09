/* =====================================================================================================
   ui.js — Utilidades de interfaz compartidas (sin dependencias).
   Tema persistente, toasts, pestañas accesibles, descargas y helpers de DOM.
   ===================================================================================================== */
(function (R3) {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = R3.util.esc;

  /* ------------------------------------------------------------------- tema */
  const CLAVE_TEMA = "r3:tema";
  function aplicarTema(t) {
    document.documentElement.setAttribute("data-theme", t === "light" ? "light" : "dark");
    const b = $("#btn-tema");
    if (b) {
      b.setAttribute("aria-pressed", t === "light" ? "true" : "false");
      b.title = t === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro";
    }
    try { localStorage.setItem(CLAVE_TEMA, t); } catch (e) { /* modo privado */ }
  }
  function temaInicial() {
    let t = null;
    try { t = localStorage.getItem(CLAVE_TEMA); } catch (e) {}
    if (!t) t = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    return t;
  }
  function alternarTema() {
    aplicarTema(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
  }

  /* ------------------------------------------------------------------ toasts */
  function toast(msg, ms) {
    let c = $(".toasts");
    if (!c) { c = document.createElement("div"); c.className = "toasts"; document.body.appendChild(c); }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(6px)"; el.style.transition = "all 200ms"; }, (ms || 2600) - 200);
    setTimeout(() => el.remove(), ms || 2600);
  }

  /* ----------------------------------------------------------------- pestañas */
  function pestañas(contenedor, alCambiar) {
    const tabs = $$("[role=tab]", contenedor);
    const activar = (id) => {
      tabs.forEach((t) => {
        const on = t.id === id;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (alCambiar) alCambiar(id.replace("tab-", ""));
    };
    tabs.forEach((t) => {
      t.addEventListener("click", () => activar(t.id));
      t.addEventListener("keydown", (ev) => {
        const i = tabs.indexOf(t);
        if (ev.key === "ArrowRight") { ev.preventDefault(); const n = tabs[(i + 1) % tabs.length]; n.focus(); activar(n.id); }
        if (ev.key === "ArrowLeft") { ev.preventDefault(); const n = tabs[(i - 1 + tabs.length) % tabs.length]; n.focus(); activar(n.id); }
      });
    });
    const ini = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
    if (ini) activar(ini.id);
    return { activar };
  }

  /* ----------------------------------------------------------------- descargas */
  function descargar(nombre, contenido, tipo) {
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function bytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }

  /* Filas de ficha a partir de pares [etiqueta, valor] */
  function ficha(pares) {
    return `<dl class="ficha">${pares.filter((p) => p && p[1] != null && p[1] !== "")
      .map(([k, v]) => `<div><dt class="k">${esc(k)}</dt><dd class="v">${v}</dd></div>`).join("")}</dl>`;
  }

  function icono(tipo) { return R3.ICONO_SVG(tipo); }

  /* Exporta la escena actual como JSON descargable (autogestión sin backend) */
  function exportarJSON(nombre, objeto) {
    descargar(nombre, JSON.stringify(objeto, null, 2), "application/json");
    toast("Escena exportada: " + nombre);
  }

  R3.UI = { $, $$, esc, aplicarTema, temaInicial, alternarTema, toast, pestañas, descargar, bytes, ficha, icono, exportarJSON };
  R3.$ = $; R3.$$ = $$;
})(window.R3 = window.R3 || {});
