---
name: redes-3d-lab
description: Construye, mejora, verifica y publica aplicaciones web de redes en 3D autocontenidas (un solo index.html, sin backend, GitHub Pages). Úsalo cuando el usuario quiera (1) una versión 3D de alto impacto visual de un explorador de topologías, (2) convertir archivos .drawio, PDF, Word, texto o imágenes en un escenario de red 3D navegable, o (3) crear un repositorio nuevo a partir de esas aplicaciones. Incluye motor 3D propio en SVG, códecs DEFLATE/ZIP, parsers de .drawio/.docx/.pdf, pruebas automatizadas y despliegue en Pages.
---

# Skill `redes-3d-lab`

Dos aplicaciones, un motor y un pipeline de ingesta, todo **sin backend, sin dependencias y sin paso de
compilación obligatorio**: cada aplicación se publica como un único `index.html`.

| Aplicación | Repositorio | Qué resuelve |
|---|---|---|
| Explorador de Redes 3D | `explorador-redes-3d` | Mejora visual 3D del explorador dellabs_redes_test: topología, direccionamiento, protocolos, simulación y glosario. Mismos datos que la versión anterior. |
| Lab de Redes 3D | `lab-redes-3d` | Convierte `.drawio`, `.pdf`, `.docx`, texto e imágenes en un escenario 3D navegable con evidencias citadas y simulación. |

## Cuándo usar este skill

- «Mejora el explorador de redes / hazlo 3D / que se vea como robotips o protocol-explorer».
- «Tengo un `.drawio` y quiero verlo en 3D con su informe al lado».
- «Necesito publicarlo en GitHub Pages del usuario `MrCastilloF`».
- «Quiero otra sede / otro cliente con la misma aplicación» → `scaffold.mjs`.

## Mapa del skill

```
redes-3d-lab/
├─ SKILL.md                  ← este contrato
├─ skill.json                ← metadatos y comandos
├─ README.md                 ← instalación y uso
├─ scripts/
│  ├─ build.mjs              ← empaqueta cada app en UN index.html + repo listo para Pages
│  ├─ verify.mjs             ← autocontenido, accesibilidad, completitud, tamaño
│  └─ scaffold.mjs           ← crea un repositorio nuevo desde una de las apps
├─ assets/
│  ├─ core/                  ← motor3d.js · codec.js (inflate/ZIP) · ingesta.js · ui.js
│  ├─ theme/base.css         ← sistema visual compartido (tema claro/oscuro)
│  ├─ app-explorador/        ← template.html · app.js · datos.js · app1.css
│  ├─ app-labs/              ← template.html · app.js · ejemplo.js · lab.css
│  └─ deploy/                ← pages.yml · README de cada repositorio
├─ tests/                    ← codec.test.mjs · ingesta.test.mjs · smoke.mjs (Chrome headless)
├─ examples/                 ← .drawio plano, .drawio comprimido, informe .txt
└─ docs/                     ← arquitectura, repos, flujo, tecnologías, Pages, criterios, informe, manual
```

## Comandos (desde la raíz del skill)

```bash
node scripts/build.mjs                  # construye las dos apps en ./apps/<repo>/index.html
node scripts/build.mjs lab              # sólo una
node scripts/build.mjs --out ../salida  # otro destino
node scripts/verify.mjs --verbose       # comprueba autocontenido, a11y, tamaño y completitud
node tests/codec.test.mjs               # 34 pruebas de inflate/zlib/ZIP
node tests/ingesta.test.mjs             # 10 pruebas de .drawio/.docx/.pdf/JSON/inventario
node tests/smoke.mjs --verbose          # 14 comprobaciones en navegador real (Chrome/Edge headless)
node scripts/scaffold.mjs <repo> --base lab --titulo "…"   # repositorio nuevo listo para Pages
```

Orden recomendado antes de entregar: `build` → `codec.test` → `ingesta.test` → `smoke` → `verify`.
Si algo falla, **no se publica**: las pruebas de humo detectan errores de JavaScript en el navegador.

## Reglas no negociables

1. **Autocontenido:** cero peticiones externas. Nada de CDN, fuentes remotas ni `<link rel=stylesheet>`.
   `verify.mjs` falla si aparece un `src`/`href` absoluto o un `@import`.
2. **Sin backend:** todo el procesamiento ocurre en el navegador (File API + códecs propios).
   Los archivos del usuario nunca salen de su equipo.
3. **Un solo archivo por aplicación:** el build inserta CSS y JS en la plantilla. `apps/<repo>/index.html`
   es el artefacto publicable; el código fuente vive en `assets/`.
4. **Nada de datos inventados:** la topología proviene del `.drawio`; los documentos solo aportan
   evidencias. Si no hay topología declarada, se genera una escena de inventario **y se avisa**.
5. **Accesibilidad:** pestañas con `role="tab"`, escena con `role="application"`, `aria-label` en la
   navegación, foco visible y respeto a `prefers-reduced-motion` y `prefers-color-scheme`.
6. **Español:** textos de interfaz, documentación y mensajes de commit.

## Cómo extenderlo

| Necesidad | Dónde tocar |
|---|---|
| Nuevo tipo de dispositivo (icono, altura, color) | `assets/core/motor3d.js` → `ICONOS` y `ALTURA_TIPO` |
| Nuevo campo en la ficha de un nodo | `assets/app-explorador/app.js` → `panelNodo()` |
| Otro formato de insumo | `assets/core/ingesta.js` → `tipoDeArchivo()` + una función `leerX()` + `tests/ingesta.test.mjs` |
| Cambiar colores, radios o tipografía | `assets/theme/base.css` (variables en `:root`) |
| Nuevo escenario del colegio | `assets/app-explorador/datos.js` (bloque `DATOS.escenarios`) |
| Otra sede con la misma app | `node scripts/scaffold.mjs <repo> --base lab` |

Después de cualquier cambio: `node scripts/build.mjs && node tests/smoke.mjs`.

## Contrato de datos de una escena (lo que consume el motor)

```js
{
  nodos:   [{ id, nombre, tipo, x, z, y?, color?, etiqueta?, sub?, estadoColor?, escala? }],
  enlaces: [{ id, a, b, color?, grosor?, tipo?, rotulo? }],
  zonas:   [{ nombre, x0, z0, x1, z1, color? }]
}
```

`Motor3D.setDatos(escena)` + `encuadrar()` es todo lo necesario para dibujar. El motor añade altura por
tipo (`ALTURA_TIPO`), ordena por profundidad, coloca las tarjetas sin solaparse y anima paquetes con
`setFlujo([ids], {color, velocidad})`.

## Despliegue

Cada carpeta de `apps/` es un repositorio publicable (`index.html`, `.nojekyll`, `README.md` y
`.github/workflows/pages.yml`). Estado actual, verificado:

| Repositorio | URL |
|---|---|
| `MrCastilloF/explorador-redes-3d` | https://mrcastillof.github.io/explorador-redes-3d/ |
| `MrCastilloF/lab-redes-3d` | https://mrcastillof.github.io/lab-redes-3d/ |

Ambos con Pages en modo **GitHub Actions** y el HTML servido idéntico al build local. Pasos, permisos del
token y problemas típicos en `docs/04-despliegue-github-pages.md`.
