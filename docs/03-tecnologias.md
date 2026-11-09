# Tecnologías: decisiones y justificación

Criterio de evaluación para cada pieza: **¿mantiene el artefacto autocontenido y desplegable en GitHub
Pages sin backend?** Si una tecnología añade un servidor, un paso de compilación obligatorio o una
petición externa en tiempo de ejecución, se descarta o se documenta como alternativa.

## 1. Visualización 3D

| Opción | Veredicto | Motivo |
|---|---|---|
| **Motor propio en SVG (elegido)** | ✅ | Sin dependencias, texto nítido, clics por DOM, accesible, ~1 000 líneas auditables. Suficiente para 12–300 elementos. |
| Three.js / react-three-fiber | ❌ | ~600 KB (o vendorizar) dentro de un archivo único; post-proceso (bloom) exige más código que el resto de la app junta; selección por raycasting; texto por SDF. |
| Babylon.js | ❌ | Igual que Three.js y con API aún mayor. |
| Cytoscape.js / vis-network | ❌ | 2D (o 2.5D); no dan la sensación de profundidad de las referencias. |
| 3d-force-graph | ❌ | Está construido sobre Three.js y depende de CDN. |
| CSS 3D transforms | ❌ | Sin orden por profundidad correcto ni cámara real; los planos se cruzan mal. |
| Canvas 2D con motor propio | ⚠️ | Válido, pero se pierden accesibilidad, texto nítido y selección por DOM. Se anota como plan B si se superan ~300 elementos. |

**Referencias visuales:** las dos URLs del enunciado se usaron como faro de calidad (composición limpia,
tipografía cuidada, escena oscura con acentos, animación contenida). Ver *supuestos* en
`06-informe-ejecutivo.md`: no se copió ningún activo ni se verificó su código.

## 2. Procesamiento de archivos

| Necesidad | Opción elegida | Alternativas y motivo del descarte |
|---|---|---|
| Descompresión | **inflate propio** (RFC 1951) + zlib | `pako`/`fflate` (~45 KB) obligarían a vendorizar; `DecompressionStream('deflate-raw')` es nativo y **existe en Chrome/Edge/Firefox/Safari 16.4+**, pero no en navegadores antiguos y no permite leer ZIP a bajo nivel con el control que hace falta aquí. Se puede usar como acelerador futuro con *fallback* al propio. |
| ZIP | **Lector propio** del directorio central | `JSZip` (~100 KB). El ZIP que necesitamos (`.docx`) usa solo *stored* y *deflate*. |
| `.drawio` | Parser propio por expresiones regulares sobre el XML | `DOMParser` es nativo pero no está en Node, y las pruebas se ejecutan en Node; el XML de drawio es regular y el parser es verificable. |
| PDF | **Extractor heurístico propio** (FlateDecode + `ToUnicode`) | `pdf.js` (~1 MB, workers, CORS con workers en `file://`) rompe el requisito de archivo único y de funcionamiento sin servidor. El coste es el límite declarado: PDF sin capa de texto o sin `ToUnicode` puede fallar. |
| `.docx` | ZIP + limpieza de `word/document.xml` | `mammoth` (~200 KB) convierte a HTML semántico; aquí solo se necesita texto plano para evidencias. |
| Imágenes | `FileReader` → *data URL* | No hay OCR: se declara como límite (Tesseract.js pesa ~2 MB + modelos). |

Todos los parsers viven en `codec.js` / `ingesta.js` y se prueban en Node sin DOM, lo que permite
verificar el comportamiento real (`tests/codec.test.mjs`, `tests/ingesta.test.mjs`).

## 3. Framework e interfaz

| Opción | Veredicto | Motivo |
|---|---|---|
| **Vanilla JS + plantillas HTML propias (elegido)** | ✅ | Cero dependencias, sin build obligatorio, arranque instantáneo, compatible con `file://`. La interfaz es de un solo estado por vista: no hay reconciliación compleja que justifique un framework. |
| React (con Vite) | ⚠️ solo si el equipo lo exige | Añade `node_modules`, bundler y ~45 KB de runtime; el despliegue deja de ser «sube un archivo». Si se adoptara: Vite + React 18 + `react-three-fiber` para el 3D, y el build tendría que *inline* todo en un único HTML (plugin de inline) para conservar el requisito. Documentado como ruta de migración, **no implementado**. |
| Svelte / Vue / Lit | ⚠️ | Mismo trade-off que React con menos peso; no aportan nada que el DOM directo no resuelva aquí. |
| Tailwind | ❌ | Obliga a un paso de compilación o a un CDN. El sistema visual propio son ~450 líneas de CSS con variables. |
| TypeScript | ❌ | Añade compilación sin comprar seguridad real en un proyecto de este tamaño; JSDoc + pruebas cubren el contrato. |

**Accesibilidad:** pestañas con `role="tablist"`/`role="tab"`/`role="tabpanel"`, navegación con flechas,
`aria-live` en el panel de detalles, `role="application"` con `aria-label` en la escena, foco visible,
`prefers-reduced-motion` y `prefers-color-scheme`.

## 4. Empaquetado y despliegue

| Pieza | Elección | Motivo |
|---|---|---|
| Build | **script Node propio** (`scripts/build.mjs`) con marcadores `/* @@INLINE:ruta@@ */` | Sin `node_modules`, reproducible, y permite inyectar CSS+JS en un único archivo. Verifica sintaxis JS (`node --check`) y ausencia de recursos externos. |
| Pruebas | Node puro + Chrome/Edge headless vía `--dump-dom` | No requiere Playwright/Puppeteer (que descargarían un navegador). |
| Hosting | **GitHub Pages** (rama `main` o GitHub Actions) | Estático puro, gratis, HTTPS, URL `usuario.github.io/repo/`. |
| Backend | **Ninguno** | Todo el procesamiento es local; no hay datos que custodiar ni costes de servidor. |
| Analítica / cookies | **Ninguna** | No se envía nada a ningún servidor; coherente con el contexto educativo. |
| Persistencia | `localStorage` solo para el tema | La sesión de insumos no se persiste: cada carga es explícita. La exportación a JSON cubre el «guardar». |

## 5. Por qué no hay backend (y qué se pierde)

- **Se gana:** privacidad (los informes del colegio no salen del equipo), coste cero, disponibilidad
  (Pages), despliegue de un archivo, sin mantenimiento de servidor ni de dependencias.
- **Se pierde:** OCR de PDF escaneados, conversión de `.doc`/`.xlsx`, colaboración en tiempo real y
  almacenamiento compartido. Todas quedan **declaradas como límites**, no simuladas.
- Si en el futuro hiciera falta OCR: `tesseract.js` puede cargarse bajo demanda desde el propio repositorio
  (no CDN) y quedaría como una función opcional de la app 2; hoy no se incluye para no romper el tamaño ni
  la promesa de «sin dependencias».

## 6. Stack final

```
Navegador: HTML5 + CSS3 (variables, grid, backdrop-filter) + JavaScript ES2019
Datos:      File API · TextEncoder/TextDecoder · URL.createObjectURL · localStorage
3D:         SVG + matemáticas propias (cámara orbital, proyección perspectiva)
Archivos:   inflate/zlib/ZIP propios · parser drawio · lector docx · extractor PDF
Pruebas:    Node 18+ · zlib nativo como oráculo · Chrome/Edge headless
Build:      Node 18+ sin dependencias
Hosting:    GitHub Pages
```
