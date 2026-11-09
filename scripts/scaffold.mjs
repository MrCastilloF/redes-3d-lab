#!/usr/bin/env node
/* =====================================================================================================
   scripts/scaffold.mjs — Crea un repositorio nuevo listo para GitHub Pages a partir de una de las
   aplicaciones del skill. Sirve para publicar variantes (otro colegio, otro cliente) sin bifurcar código.

   Uso:
     node scripts/scaffold.mjs <nombre-del-repo> [--base explorador|lab] [--titulo "Mi aplicación"]
                                [--destino <carpeta>]

   Ejemplo:
     node scripts/scaffold.mjs lab-redes-sede-norte --base lab --titulo "Lab de Redes · Sede Norte"
   ===================================================================================================== */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RAIZ = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const nombre = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--base" && args[args.indexOf(a) - 1] !== "--titulo" && args[args.indexOf(a) - 1] !== "--destino");
const opcion = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};

if (!nombre) {
  console.error("Falta el nombre del repositorio.\n  node scripts/scaffold.mjs <nombre> [--base explorador|lab] [--titulo \"…\"]");
  process.exit(1);
}
const slug = nombre.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
const base = (opcion("base", "lab") || "lab").toLowerCase();
if (!["explorador", "lab"].includes(base)) {
  console.error("--base debe ser 'explorador' o 'lab'");
  process.exit(1);
}
const titulo = opcion("titulo", base === "explorador" ? "Explorador de Redes 3D" : "Lab de Redes 3D");
const destino = path.resolve(opcion("destino", process.cwd()));
const caja = fs.mkdtempSync(path.join(os.tmpdir(), "r3-scaffold-"));

/* 1. Construir la base en un directorio temporal */
const build = spawnSync(process.execPath, [path.join(RAIZ, "scripts", "build.mjs"), base, "--out", caja], { encoding: "utf8" });
if (build.status !== 0) {
  console.error("Falló la construcción base:\n" + (build.stderr || build.stdout));
  process.exit(1);
}
const origen = path.join(caja, base === "explorador" ? "explorador-redes-3d" : "lab-redes-3d");
if (!fs.existsSync(origen)) {
  console.error("La construcción base no generó el directorio esperado.");
  process.exit(1);
}

/* 2. Copiar al destino con el nombre pedido */
const final = path.join(destino, slug);
if (fs.existsSync(final)) {
  console.error(`Ya existe ${final}. Elige otro nombre o borra esa carpeta.`);
  process.exit(1);
}
fs.mkdirSync(final, { recursive: true });
for (const e of fs.readdirSync(origen, { withFileTypes: true })) {
  fs.cpSync(path.join(origen, e.name), path.join(final, e.name), { recursive: true });
}

/* 3. README propio del repositorio nuevo */
fs.writeFileSync(path.join(final, "README.md"), `# ${titulo}

Aplicación web autocontenida generada con el skill \`redes-3d-lab\` (base: **${base}**).

- **Un solo archivo:** \`index.html\` — sin backend, sin dependencias, sin compilación.
- **Publicación:** https://mrcastillof.github.io/${slug}/

## Cómo publicarlo

\`\`\`bash
git init -b main
git add .
git commit -m "feat: ${titulo}"
git remote add origin https://github.com/MrCastilloF/${slug}.git
git push -u origin main
\`\`\`

Después, en GitHub: **Settings → Pages → Source: GitHub Actions** (el workflow incluido publica en cada
\`push\` a \`main\`) o **Deploy from a branch → main → / (root)**.

También con la CLI de GitHub:

\`\`\`bash
gh repo create MrCastilloF/${slug} --public --source=. --push
gh api -X POST repos/MrCastilloF/${slug}/pages -f build_type=workflow
\`\`\`

## Personalización

El contenido de esta aplicación se edita en el propio \`index.html\`. Para cambios de fondo (motor 3D,
ingesta de archivos, estilos) edita el skill \`redes-3d-lab\` y vuelve a construir con
\`node scripts/scaffold.mjs\`.

Generado: ${new Date().toISOString()}
`, "utf8");

fs.rmSync(caja, { recursive: true, force: true });

console.log(`✓ Creado ${path.relative(process.cwd(), final) || final}`);
console.log(`  base: ${base} · título: ${titulo}`);
console.log(`  index.html: ${(fs.statSync(path.join(final, "index.html")).size / 1024).toFixed(1)} KB`);
console.log("\nSiguiente paso:");
console.log(`  cd ${slug}`);
console.log("  git init -b main && git add . && git commit -m \"feat: primera versión\"");
console.log(`  gh repo create MrCastilloF/${slug} --public --source=. --push`);
