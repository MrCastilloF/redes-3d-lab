#!/usr/bin/env node
/* =====================================================================================================
   build.mjs — Empaqueta cada aplicación del skill en UN archivo index.html autocontenido y prepara
   el repositorio listo para GitHub Pages (Pages workflow + .nojekyll + README).

   Uso:
     node scripts/build.mjs              → construye ambas aplicaciones en ./apps
     node scripts/build.mjs explorador   → sólo la aplicación 1
     node scripts/build.mjs lab          → sólo la aplicación 2
     node scripts/build.mjs --out RUTA   → cambia el destino

   No hay dependencias: sólo Node 18+.
   ===================================================================================================== */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { execFileSync } from "node:child_process";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ASSETS = path.join(RAIZ, "assets");

const APPS = {
  explorador: {
    dir: "app-explorador",
    repo: "explorador-redes-3d",
    readme: "README-explorador.md",
    titulo: "Explorador de Redes 3D"
  },
  lab: {
    dir: "app-labs",
    repo: "lab-redes-3d",
    readme: "README-lab.md",
    titulo: "Lab de Redes 3D"
  }
};

/* ------------------------------------------------------------------ utilidades */
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const DESTINO = path.resolve(outIdx >= 0 ? args[outIdx + 1] : path.join(RAIZ, "apps"));
const solo = args.find((a) => APPS[a]);
const elegidos = solo ? [solo] : Object.keys(APPS);

const MARCA = /\/\* @@INLINE:([^*]+?)@@ \*\//g;

function inlinear(html, appDir) {
  let faltantes = [];
  const limpiar = (s) => s.replace(/^\uFEFF/, "");   // un BOM al inicio rompe la primera regla CSS
  const salida = html.replace(MARCA, (_m, rel) => {
    const p = path.join(ASSETS, rel.trim());
    if (!fs.existsSync(p)) { faltantes.push(rel.trim()); return ""; }
    return limpiar(fs.readFileSync(p, "utf8"));
  });
  if (faltantes.length) throw new Error("Faltan recursos: " + faltantes.join(", "));
  return limpiar(salida);
}

function verificarJS(html, nombre) {
  const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const tmp = path.join(os.tmpdir(), `r3-${nombre}-${Date.now()}.js`);
  fs.writeFileSync(tmp, bloques.join("\n;\n"), "utf8");
  try {
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
  } catch (e) {
    throw new Error(`JavaScript inválido en ${nombre}:\n${e.stderr ? e.stderr.toString() : e.message}`);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  return bloques.join("\n").split("\n").length;
}

function verificarAutocontenido(html, nombre) {
  const problemas = [];
  if (/@@INLINE:/.test(html)) problemas.push("quedan marcadores @@INLINE sin resolver");
  const externos = [...html.matchAll(/(?:src|href)\s*=\s*"(https?:)?\/\/[^"]+"/gi)].map((m) => m[0]);
  if (externos.length) problemas.push("recursos externos: " + externos.slice(0, 4).join(" | "));
  if (/@import\s+url\(/.test(html)) problemas.push("@import de CSS externo");
  if (/<link[^>]+rel=["']stylesheet["']/i.test(html)) problemas.push("hoja de estilos externa");
  if (problemas.length) throw new Error(`La aplicación ${nombre} no es autocontenida: ${problemas.join("; ")}`);
  return true;
}

/* ------------------------------------------------------------------- construcción */
const informe = [];

for (const clave of elegidos) {
  const app = APPS[clave];
  const plantilla = path.join(ASSETS, app.dir, "template.html");
  if (!fs.existsSync(plantilla)) {
    console.warn(`· ${clave}: sin plantilla todavía (${path.relative(RAIZ, plantilla)}), se omite.`);
    continue;
  }
  const bruto = fs.readFileSync(plantilla, "utf8");
  const html = inlinear(bruto, app.dir);

  const lineasJS = verificarJS(html, clave);
  verificarAutocontenido(html, clave);

  const dirApp = path.join(DESTINO, app.repo);
  fs.mkdirSync(path.join(dirApp, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(dirApp, "index.html"), html, "utf8");
  fs.writeFileSync(path.join(dirApp, ".nojekyll"), "", "utf8");
  fs.copyFileSync(path.join(ASSETS, "deploy", "pages.yml"), path.join(dirApp, ".github", "workflows", "pages.yml"));
  const readme = path.join(ASSETS, "deploy", app.readme);
  if (fs.existsSync(readme)) fs.copyFileSync(readme, path.join(dirApp, "README.md"));
  const licencia = path.join(ASSETS, "deploy", "LICENSE");
  if (fs.existsSync(licencia)) fs.copyFileSync(licencia, path.join(dirApp, "LICENSE"));
  const aviso = path.join(ASSETS, "deploy", "NOTICE");
  if (fs.existsSync(aviso)) fs.copyFileSync(aviso, path.join(dirApp, "NOTICE"));

  const kb = (fs.statSync(path.join(dirApp, "index.html")).size / 1024).toFixed(1);
  const sha = crypto.createHash("sha256").update(html).digest("hex").slice(0, 16);
  informe.push({ app: clave, repo: app.repo, archivo: path.join(dirApp, "index.html"), kb, sha, lineasJS });
  console.log(`✓ ${clave} → apps/${app.repo}/index.html  (${kb} KB, ${lineasJS} líneas de JS, sha256:${sha})`);
}

if (!informe.length) {
  console.error("No se construyó ninguna aplicación.");
  process.exit(1);
}
fs.writeFileSync(path.join(DESTINO, "build-info.json"), JSON.stringify({
  generado: new Date().toISOString(), node: process.version, apps: informe
}, null, 2));
console.log(`\nDestino: ${DESTINO}`);
