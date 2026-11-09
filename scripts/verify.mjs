#!/usr/bin/env node
/* =====================================================================================================
   scripts/verify.mjs — Verificación estructural del skill y de las aplicaciones construidas.

   Comprueba que cada aplicación es realmente autocontenida (un solo archivo, sin recursos externos),
   que no quedan marcadores de plantilla, que hay accesibilidad básica y que el skill está completo.

   Uso:  node scripts/verify.mjs [--verbose]
   ===================================================================================================== */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RAIZ = path.resolve(import.meta.dirname, "..");
const verbose = process.argv.includes("--verbose");
const salida = fs.mkdtempSync(path.join(os.tmpdir(), "r3-verify-"));

const pasos = [];
const anotar = (nombre, ok, detalle) => { pasos.push({ nombre, ok, detalle }); };

/* 1. Construir en un directorio temporal (no toca ./apps) */
const build = spawnSync(process.execPath, [path.join(RAIZ, "scripts", "build.mjs"), "--out", salida], { encoding: "utf8" });
anotar("build.mjs construye sin errores", build.status === 0, (build.status === 0 ? "" : (build.stderr || "").split("\n").slice(0, 3).join(" ")));

/* 2. Revisar cada aplicación */
const APPS = ["explorador-redes-3d", "lab-redes-3d"];
for (const repo of APPS) {
  const archivo = path.join(salida, repo, "index.html");
  if (!fs.existsSync(archivo)) { anotar(`${repo}: existe index.html`, false, "no se generó"); continue; }
  const html = fs.readFileSync(archivo, "utf8");
  const kb = fs.statSync(archivo).size / 1024;

  anotar(`${repo}: archivo único, sin recursos externos`,
    !/(?:src|href)\s*=\s*"(?:https?:)?\/\//i.test(html) && !/@import\s+url\(/.test(html) && !/<link[^>]+stylesheet/i.test(html),
    "sin CDN, sin hojas de estilo externas");
  anotar(`${repo}: sin marcadores de plantilla`, !/@@INLINE:/.test(html), "");
  anotar(`${repo}: sin BOM al inicio`, html.charCodeAt(0) !== 0xfeff, "");
  anotar(`${repo}: documento HTML5 válido`, /^<!DOCTYPE html>/i.test(html.trim()) && /<meta name="viewport"/.test(html), "");
  anotar(`${repo}: accesibilidad básica`,
    (html.match(/aria-[a-z]+=/g) || []).length >= 8 && /role="tab"/.test(html) && /role="application"/.test(html),
    `${(html.match(/aria-[a-z]+=/g) || []).length} atributos aria`);
  anotar(`${repo}: respeta prefers-reduced-motion`, /prefers-reduced-motion/.test(html), "");
  anotar(`${repo}: tema claro y oscuro`, /\[data-theme="light"\]/.test(html), "");
  anotar(`${repo}: tamaño razonable (<400 KB)`, kb < 400, `${kb.toFixed(1)} KB`);
  anotar(`${repo}: incluye Pages workflow`, fs.existsSync(path.join(salida, repo, ".github/workflows/pages.yml")), "");
  anotar(`${repo}: incluye .nojekyll`, fs.existsSync(path.join(salida, repo, ".nojekyll")), "");
  anotar(`${repo}: incluye README`, fs.existsSync(path.join(salida, repo, "README.md")), "");
  if (verbose) console.log(`· ${repo}: ${kb.toFixed(1)} KB, ${(html.match(/\n/g) || []).length} líneas`);
}

/* 3. Completitud del skill */
const OBLIGATORIOS = [
  "SKILL.md", "skill.json", "README.md",
  "assets/core/motor3d.js", "assets/core/codec.js", "assets/core/ingesta.js", "assets/core/ui.js",
  "assets/theme/base.css",
  "assets/app-explorador/template.html", "assets/app-explorador/app.js", "assets/app-explorador/datos.js",
  "assets/app-labs/template.html", "assets/app-labs/app.js", "assets/app-labs/ejemplo.js",
  "assets/deploy/pages.yml", "assets/deploy/README-explorador.md", "assets/deploy/README-lab.md",
  "scripts/build.mjs", "scripts/verify.mjs", "scripts/scaffold.mjs",
  "tests/codec.test.mjs", "tests/ingesta.test.mjs", "tests/smoke.mjs",
  "docs/00-arquitectura.md", "docs/01-repositorios.md", "docs/02-flujo-insumos.md",
  "docs/03-tecnologias.md", "docs/04-despliegue-github-pages.md",
  "docs/05-criterios-aceptacion.md", "docs/06-informe-ejecutivo.md", "docs/07-manual-uso.md",
  "examples/ejemplo-campus.drawio", "examples/informe-ejemplo.txt"
];
const faltan = OBLIGATORIOS.filter((f) => !fs.existsSync(path.join(RAIZ, f)));
anotar("skill completo (archivos obligatorios)", faltan.length === 0, faltan.slice(0, 6).join(", "));

/* 4. Informe */
let fallos = 0;
console.log("\nVerificación\n");
for (const p of pasos) {
  if (!p.ok) fallos++;
  console.log(`  ${p.ok ? "✓" : "✗"} ${p.nombre}${p.detalle && (!p.ok || verbose) ? " — " + p.detalle : ""}`);
}
fs.rmSync(salida, { recursive: true, force: true });
console.log(`\n${pasos.length - fallos}/${pasos.length} comprobaciones correctas`);
process.exit(fallos ? 1 : 0);
