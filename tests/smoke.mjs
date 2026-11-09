#!/usr/bin/env node
/* =====================================================================================================
   tests/smoke.mjs — Prueba de humo real en navegador (Chrome/Edge headless).

   Abre cada aplicación construida, la deja arrancar, ejecuta acciones (trazar ruta, cambiar de pestaña)
   y comprueba invariantes del DOM y que no hubo errores de JavaScript. No necesita instalar nada:
   usa el Chrome o Edge ya presentes en el sistema.

   Uso:  node tests/smoke.mjs [--app explorador|lab] [--verbose]
   Requiere haber construido antes:  node scripts/build.mjs
   ===================================================================================================== */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RAIZ = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const solo = args.find((a) => a === "explorador" || a === "lab") || (args.includes("--app") ? args[args.indexOf("--app") + 1] : null);
const verbose = args.includes("--verbose");

const CANDIDATOS = [
  path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
  path.join(process.env.PROGRAMFILES || "", "Google/Chrome/Application/chrome.exe"),
  path.join(process.env["PROGRAMFILES(X86)"] || "", "Google/Chrome/Application/chrome.exe"),
  path.join(process.env.PROGRAMFILES || "", "Microsoft/Edge/Application/msedge.exe"),
  path.join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft/Edge/Application/msedge.exe"),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
];
const NAVEGADOR = CANDIDATOS.find((p) => p && fs.existsSync(p));

const APPS = {
  explorador: {
    html: path.join(RAIZ, "apps/explorador-redes-3d/index.html"),
    acciones: `document.querySelector('#tab-protocolos').click();
               document.querySelectorAll('.proto')[5].click();
               var detalle = (document.querySelector('#proto-detalle') || {}).textContent || '';`,
    comprobaciones: (m) => [
      ["arranca sin errores", m.errores.length === 0, m.errores.join(" | ")],
      ["pinta la topología", m.nodos === 17, "nodos=" + m.nodos],
      ["pinta los enlaces", m.enlaces >= 12, "enlaces=" + m.enlaces],
      ["5 pestañas", m.pestanas === 5, "pestañas=" + m.pestanas],
      ["KPIs con datos", m.kpis.length > 10, "kpis='" + m.kpis + "'"],
      ["tabla de VLANs completa", m.filasVlan === 9, "filas=" + m.filasVlan],
      ["detalle de protocolo visible", /TCP/.test(m.detalle), "detalle='" + m.detalle.slice(0, 40) + "'"]
    ]
  },
  lab: {
    html: path.join(RAIZ, "apps/lab-redes-3d/index.html"),
    acciones: `document.querySelector('#btn-trazar').click();`,
    comprobaciones: (m) => [
      ["arranca sin errores", m.errores.length === 0, m.errores.join(" | ")],
      ["escena de ejemplo cargada", m.nodos >= 10, "nodos=" + m.nodos],
      ["enlaces del .drawio", m.enlaces >= 10, "enlaces=" + m.enlaces],
      ["zonas detectadas", m.zonas >= 2, "zonas=" + m.zonas],
      ["documento analizado", m.documentos >= 1, "documentos=" + m.documentos],
      ["ruta simulada con saltos", m.saltos >= 2, "saltos=" + m.saltos],
      ["evidencias con IPs", m.ips >= 5, "ips=" + m.ips]
    ]
  }
};

function arnes(app) {
  return `<script>
window.__errores = [];
window.addEventListener("error", function (ev) { window.__errores.push(ev.message + " @" + ev.lineno); });
window.addEventListener("unhandledrejection", function (ev) { window.__errores.push("promesa: " + ev.reason); });
window.addEventListener("load", function () {
  setTimeout(function () {
    try { ${app.acciones} } catch (e) { window.__errores.push("accion: " + e.message); }
    setTimeout(function () {
      var q = function (s) { return document.querySelectorAll(s).length; };
      var datos = {
        errores: window.__errores,
        nodos: q(".m3-n"),
        enlaces: q(".m3-hit"),
        zonas: q("text.m3-zona-txt"),
        pestanas: q("[role=tab]"),
        kpis: (document.querySelector("#hud-kpis") || {}).textContent || "",
        filasVlan: q("#tabla-vlans tr"),
        saltos: q("#sim-ruta .salto"),
        documentos: (function () { var t = document.querySelector("#lista-docs"); return t ? q("#lista-docs details") : 0; })(),
        ips: (function () { var t = document.querySelector("#inv-ips"); return t ? q("#inv-ips tr") : 0; })(),
        detalle: (document.querySelector("#proto-detalle") || {}).textContent || ""
      };
      document.title = "QA:" + JSON.stringify(datos);
    }, 900);
  }, 1100);
});
</script>`;
}

if (!NAVEGADOR) {
  console.error("No se encontró Chrome ni Edge. Instala uno o ejecuta las pruebas unitarias: node tests/*.test.mjs");
  process.exit(1);
}

let fallos = 0, total = 0;
for (const [clave, app] of Object.entries(APPS)) {
  if (solo && solo !== clave) continue;
  if (!fs.existsSync(app.html)) {
    console.error(`✗ ${clave}: falta ${path.relative(RAIZ, app.html)} (ejecuta node scripts/build.mjs)`);
    fallos++;
    continue;
  }
  const html = fs.readFileSync(app.html, "utf8").replace("<head>", "<head>" + arnes(app));
  const tmp = path.join(os.tmpdir(), `smoke-${clave}-${Date.now()}.html`);
  fs.writeFileSync(tmp, html, "utf8");
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-perfil-"));
  const r = spawnSync(NAVEGADOR, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox", "--no-first-run",
    `--user-data-dir=${perfil}`, "--window-size=1440,900",
    "--virtual-time-budget=6500", "--dump-dom",
    "file:///" + tmp.replace(/\\/g, "/")
  ], { encoding: "utf8", maxBuffer: 96 * 1024 * 1024 });
  fs.rmSync(perfil, { recursive: true, force: true });
  fs.rmSync(tmp, { force: true });

  const m = /<title>QA:([\s\S]*?)<\/title>/.exec(r.stdout || "");
  if (!m) {
    console.error(`✗ ${clave}: la aplicación no llegó a ejecutar el arnés (¿error de sintaxis?)`);
    if (verbose) console.error((r.stdout || "").slice(0, 600), r.stderr);
    fallos++;
    continue;
  }
  let datos;
  try { datos = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")); }
  catch (e) { console.error(`✗ ${clave}: no se pudo leer el resultado (${e.message})`); fallos++; continue; }

  console.log(`\n${clave}`);
  for (const [nombre, ok, detalle] of app.comprobaciones(datos)) {
    total++;
    if (ok) console.log(`  ✓ ${nombre}${detalle && verbose ? " — " + detalle : ""}`);
    else { console.log(`  ✗ ${nombre} — ${detalle}`); fallos++; }
  }
}

console.log(`\nPrueba de humo: ${total - fallos}/${total} correctas`);
process.exit(fallos ? 1 : 0);
