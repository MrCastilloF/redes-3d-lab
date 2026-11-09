# Estructura de repositorios

El proyecto se organiza en **tres repositorios** bajo la cuenta `MrCastilloF`: uno para el skill (el
taller) y uno por aplicación (el producto publicable).

## 1. Repositorio del skill — `redes-3d-lab`

Es la fuente: contiene plantillas, motor, códecs, pruebas y documentación. **No se publica en Pages**
(no es una aplicación), pero sí puede ser privado o público como biblioteca.

```
redes-3d-lab/
├─ SKILL.md                       contrato operativo para un agente o una persona
├─ skill.json                     metadatos, comandos y aplicaciones
├─ README.md                      instalación y arranque rápido
├─ scripts/
│  ├─ build.mjs                   plantilla + assets → apps/<repo>/index.html + repo Pages
│  ├─ verify.mjs                  autocontenido · accesibilidad · completitud · tamaño
│  └─ scaffold.mjs                nuevo repositorio desde una base
├─ assets/
│  ├─ core/
│  │  ├─ motor3d.js               cámara, proyección, capas, tarjetas, paquetes, eventos
│  │  ├─ codec.js                 inflate (RFC1951), zlib, lector ZIP
│  │  ├─ ingesta.js               .drawio · .docx · .pdf · texto · JSON · imágenes
│  │  └─ ui.js                    toasts, pestañas ARIA, tema, descargas, fichas
│  ├─ theme/base.css              sistema visual compartido (tema claro y oscuro)
│  ├─ app-explorador/
│  │  ├─ template.html            esqueleto de la app 1 (marcadores @@INLINE@@)
│  │  ├─ app1.css                 estilos propios
│  │  ├─ app.js                   lógica de las 5 pestañas
│  │  └─ datos.js                 DATOS de la red (extraído de la versión anterior, sin cambios)
│  ├─ app-labs/
│  │  ├─ template.html
│  │  ├─ lab.css
│  │  ├─ app.js                   escenario + insumos + evidencias + simulación
│  │  └─ ejemplo.js               .drawio y documento de demostración
│  └─ deploy/
│     ├─ pages.yml                workflow oficial de GitHub Pages
│     ├─ README-explorador.md     README que se copia al repo de la app 1
│     └─ README-lab.md            README que se copia al repo de la app 2
├─ tests/
│  ├─ codec.test.mjs              34 comprobaciones contra zlib de Node
│  ├─ ingesta.test.mjs            10 comprobaciones con archivos reales generados
│  └─ smoke.mjs                   navegador headless: 14 invariantes de DOM
├─ examples/
│  ├─ ejemplo-campus.drawio       XML plano
│  ├─ ejemplo-comprimido.drawio   base64 + deflate (formato real de diagrams.net)
│  └─ informe-ejemplo.txt         documento con IPs y VLANs
└─ docs/
   ├─ 00-arquitectura.md
   ├─ 01-repositorios.md          ← este documento
   ├─ 02-flujo-insumos.md
   ├─ 03-tecnologias.md
   ├─ 04-despliegue-github-pages.md
   ├─ 05-criterios-aceptacion.md
   ├─ 06-informe-ejecutivo.md
   └─ 07-manual-uso.md
```

## 2. Repositorio de la aplicación 1 — `explorador-redes-3d`

Es el artefacto publicable, generado por `build.mjs`. No se edita a mano: se regenera.

```
explorador-redes-3d/
├─ index.html                     ← aplicación completa (1 archivo, ~156 KB)
├─ .nojekyll
├─ README.md
└─ .github/
   └─ workflows/
      └─ pages.yml
```

- URL: `https://mrcastillof.github.io/explorador-redes-3d/`
- Contenido: 4 escenarios (situación actual + 3 propuestas), 17 dispositivos, 16 enlaces, 9 VLANs,
  16 protocolos, 37 términos de glosario, 5 pestañas.
- Relación con el repositorio anterior `explorador-de-redes`: **no lo modifica ni lo sustituye**; es una
  versión nueva en repositorio propio, con el mismo modelo de datos.

## 3. Repositorio de la aplicación 2 — `lab-redes-3d`

```
lab-redes-3d/
├─ index.html                     ← aplicación completa (~156 KB)
├─ .nojekyll
├─ README.md
└─ .github/workflows/pages.yml
```

- URL: `https://mrcastillof.github.io/lab-redes-3d/`
- Escena de demostración incluida (12 dispositivos, 11 enlaces, 2 zonas) y documento de ejemplo para que
  la aplicación sea útil **sin cargar nada**.

## 4. Convenciones

| Elemento | Convención |
|---|---|
| Nombres de repo | `kebab-case`, sin prefijos redundantes |
| Rama de publicación | `main` |
| Publicación | GitHub Actions (`pages.yml`) o *Deploy from a branch → / (root)* |
| Un solo artefacto | `index.html` en la raíz del repo de la app |
| Versión | `skill.json` → `version`; el README de cada app se genera con fecha |
| Commits | `feat:`, `fix:`, `docs:`, `test:`, `chore:` en español |

## 5. Relación entre repositorios

```
redes-3d-lab (skill)
   │  build.mjs
   ├──► apps/explorador-redes-3d   ──► repo MrCastilloF/explorador-redes-3d   ──► Pages
   └──► apps/lab-redes-3d          ──► repo MrCastilloF/lab-redes-3d          ──► Pages
```

Los repos de aplicación **no dependen** del skill en tiempo de ejecución: son archivos estáticos
autosuficientes. El skill solo se necesita para cambiar y volver a construir.

## 6. Estado de publicación (verificado)

Ambos repositorios existen y están publicados en la cuenta `MrCastilloF`:

| Repositorio | URL de la aplicación | Modo de Pages | Estado |
|---|---|---|---|
| `explorador-redes-3d` | https://mrcastillof.github.io/explorador-redes-3d/ | GitHub Actions | ✅ HTTP 200 · sha256 del HTML idéntico al build local |
| `lab-redes-3d` | https://mrcastillof.github.io/lab-redes-3d/ | GitHub Actions | ✅ HTTP 200 · sha256 del HTML idéntico al build local |
| `redes-3d-lab` | — (no es un sitio) | — | ✅ público, con CI que ejecuta build + 4 suites en cada push |

El repositorio del skill puede publicarse igual (sin Pages, porque no es un sitio). Pasos y permisos
necesarios en `04-despliegue-github-pages.md` §1.
