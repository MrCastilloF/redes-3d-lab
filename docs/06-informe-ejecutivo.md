# Informe ejecutivo

**Proyecto:** dos aplicaciones de redes en 3D + skill instalable `redes-3d-lab`
**Cuenta destino:** `MrCastilloF` · **Fecha:** febrero 2026 · **Versión:** 1.0.0

---

## 1. Resumen

Se entregaron **dos aplicaciones web autocontenidas** y **un skill instalable** que las construye, verifica
y publica:

| Entregable | Estado | Evidencia |
|---|---|---|
| App 1 · Explorador de Redes 3D (versión mejorada) | ✅ construida y verificada | `apps/explorador-redes-3d/index.html` · 156 KB · 17 dispositivos / 16 enlaces |
| App 2 · Lab de Redes 3D (nueva, desde archivos) | ✅ construida y verificada | `apps/lab-redes-3d/index.html` · 156 KB · demo 12 nodos / 11 enlaces / 2 zonas |
| Skill instalable `redes-3d-lab` | ✅ instalado | `C:\Users\ecastillo\.dsh\skills\redes-3d-lab` (33 archivos, 349 KB) y visible en el catálogo de la sesión |
| Pruebas automatizadas | ✅ 58 comprobaciones | 34 códec + 10 ingesta + 14 humo en navegador |
| Documentación | ✅ 8 documentos + README + SKILL.md | `docs/00…07` |
| Publicación en GitHub Pages | ✅ **publicada y verificada** | https://mrcastillof.github.io/explorador-redes-3d/ y https://mrcastillof.github.io/lab-redes-3d/ · Pages en modo GitHub Actions · sha256 del HTML servido idéntico al local |

Las dos aplicaciones son **un solo archivo**, no hacen **ninguna petición de red** y funcionan abriendo el
archivo desde el disco o desde Pages.

---

## 2. Lo que se pudo verificar y lo que es supuesto

### Verificado (contenido descargado y analizado)

| Fuente | Qué se comprobó |
|---|---|
| `https://mrcastillof.github.io/explorador-de-redes/3d.html` | HTTP 200 · **158 427 bytes** · 3 042 líneas · 3 bloques `<script>`, **cero recursos externos** · la «vista 3D» es una **homografía en SVG** (no WebGL) con `PROY = {phi, f, cx, cy, spread}` · bloque `DATOS` con 4 escenarios (`antes`, `op1`, `op2`, `op3`), `baseDespues` con 17 dispositivos y 16 enlaces, 9 VLANs, 16 protocolos, 37 términos de glosario · pestañas: Topología, Direccionamiento, Protocolos, Simulación, Glosario. |
| `https://robotips.app/laboratorios` | HTTP 200 · estructura real: 3 laboratorios (Blink, Sonar, Multímetro), filtros por tema, portadas isométricas, texto corto por tarjeta. |
| `https://protocol-explorer-alpha.vercel.app/` | HTTP 200 · solo se obtuvo el título («Protocol Explorer · Learn how the internet works»): es una SPA que se hidrata en el cliente y el extractor no recibe el DOM renderizado. |

### Supuestos declarados (no verificados)

1. **Nivel visual de las referencias.** No se inspeccionó el CSS, las animaciones ni los recursos de
   `robotips.app` ni de `protocol-explorer`; se tomaron como *faro de calidad* cualidades observables:
   composición limpia, tipografía cuidada, escena oscura con acentos, animación contenida y jerarquía clara.
   **No se copió ningún activo, texto ni estructura de esas páginas.**
2. **`protocol-explorer`**: al no recibir contenido renderizado, no se afirma nada sobre su funcionalidad
   ni su interacción; solo se usó como referencia de tono visual.
3. **GitHub Pages del usuario**: se asume que la cuenta `MrCastilloF` permite crear repositorios públicos y
   activar Pages. No se ha comprobado (no hay `gh` ni credenciales aquí).
4. **El repositorio anterior `explorador-de-redes` no se modifica**: la nueva versión vive en un repositorio
   nuevo (`explorador-redes-3d`) con el mismo modelo de datos.
5. **Modelo de datos del colegio**: se reutilizó literalmente el bloque `DATOS` del `3d.html` publicado
   (líneas 762–1369), sin inventar ni corregir dispositivos, IP, VLANs ni textos.

---

## 3. Skills: identificación, decisión e instalación

### 3.1 Lo que el catálogo del harness ofrece realmente

En esta sesión el catálogo de skills contiene: `bom-generator`, `diagnose-windows-sandbox-acl`,
`documen-tecnico-generator`, `figma`, `hyperframes`, `hyperframes-cli`, `hyperframes-registry`,
`media-use`, `remotion-to-hyperframes`, `reverse-any-video`, `slideshow`, `style-sampling` y —ya
instalado— `redes-3d-lab`.

**No existe en este harness un skill de GitHub, de front-end, de back-end ni de React**, ni un registro
remoto con el que instalarlos: los skills son carpetas en `C:\Users\ecastillo\.dsh\skills\<nombre>\` con un
`SKILL.md` que lleva frontmatter `name` + `description` (así están `bom-generator` y
`documen-tecnico-generator`). Tampoco hay `gh` instalado para traer skills de un repositorio, y descargar y
ejecutar código de terceros sin revisión habría contradicho la restricción de «no inventar».

### 3.2 Qué se hizo, entonces

Se **autorizó e instaló** el skill que cubre las cuatro áreas pedidas, en lugar de fingir instalaciones
inexistentes:

| Área pedida | Cómo la cubre `redes-3d-lab` | Archivos |
|---|---|---|
| **GitHub** | workflow de Pages, `.nojekyll`, README por repositorio, `scaffold.mjs` que crea el repo con commits y comandos `gh` listos, guía de despliegue y resolución de problemas | `assets/deploy/*`, `scripts/scaffold.mjs`, `docs/04-despliegue-github-pages.md` |
| **Front-end** | sistema visual con variables y tema claro/oscuro, componentes accesibles, responsive, motor de render, pautas de ARIA y `prefers-reduced-motion` | `assets/theme/base.css`, `assets/core/ui.js`, `assets/core/motor3d.js`, `docs/00-arquitectura.md` |
| **Back-end** | **no se necesita** y se argumenta por qué (todo ocurre en el navegador); si algún día hiciera falta, el skill documenta qué se perdería | `docs/03-tecnologias.md` §5 |
| **React** | **no se usa**; se documenta la decisión y la ruta de migración (Vite + React + react-three-fiber + *inline* a un solo HTML) sin implementarla | `docs/03-tecnologias.md` §3 |

**Instalación realizada (verificable):**

```powershell
Copy-Item C:\Users\ecastillo\Downloads\harness\Labs\redes-3d-lab `
          C:\Users\ecastillo\.dsh\skills\redes-3d-lab -Recurse
```

Resultado comprobado: 33 archivos, 349 KB, `SKILL.md` con frontmatter válido y **el skill aparece en el
catálogo de la sesión** como `redes-3d-lab`.

### 3.3 Cómo se invoca

| Vía | Cómo |
|---|---|
| Automática | Al pedir «mejora el explorador de redes en 3D», «convierte este `.drawio` en un escenario 3D» o «publica la app en Pages», el harness hace coincidir la descripción del skill y lo carga. |
| Explícita | El usuario escribe el nombre (`redes-3d-lab`) o el agente llama a la herramienta `skill` con `name: "redes-3d-lab"` antes de actuar. |
| Manual (humano) | Abrir `C:\Users\ecastillo\.dsh\skills\redes-3d-lab\SKILL.md` y ejecutar sus comandos. |
| En otro proyecto | Copiar la carpeta al `skills` del harness correspondiente, o clonar el repositorio del skill y usar `scripts/`. |

Comandos que expone (`skill.json`): `build`, `verify`, `scaffold`, `test:codec`, `test:ingesta`, `test:smoke`.

### 3.4 Skills del catálogo evaluados y descartados

| Skill | ¿Sirve aquí? | Motivo |
|---|---|---|
| `bom-generator` | No | Genera BOM de Fortinet desde listas de precios; nada que ver con 3D ni ingesta. |
| `documen-tecnico-generator` | No | Documento técnico COEM en Word; no produce aplicaciones web. |
| `figma`, `hyperframes*`, `media-use`, `remotion-to-hyperframes`, `reverse-any-video`, `slideshow`, `style-sampling` | No | Cadena de vídeo/animación; el entregable es una app web, no un vídeo. |
| `diagnose-windows-sandbox-acl` | No usado | Solo aplica ante denegaciones de sandbox; no hubo ninguna. |

---

## 4. Cambios y decisiones sobre `explorador-de-redes`

### Reutilizado sin tocar

- **Modelo de datos completo** (`DATOS`): escenarios, dispositivos, enlaces, VLANs, protocolos, glosario y
  notas. Extraído byte a byte a `assets/app-explorador/datos.js` (47 KB).
- **Iconografía de dispositivos** (11 tipos) redibujada como *sprites* billboard sobre la misma geometría.
- **Alcance funcional**: las cinco pestañas y el selector de escenario.
- **Funciones de red** (IP ↔ entero, máscara, red, broadcast, BFS de rutas) reimplementadas igual.

### Mejorado

| Antes (`3d.html`) | Ahora |
|---|---|
| Proyección = homografía de un plano inclinado (sin cámara) | **Cámara orbital real** (yaw, pitch, distancia, FOV) con proyección perspectiva 3D y presets iso/frontal/cenital |
| Nodos = cajas 2D sobre el lienzo | **Tarjetas billboard con altura por tipo**, sombra de suelo, mástil, LED de estado, halo de selección y línea guía |
| Enlaces = líneas rectas | **Arcos 3D** con grosor por velocidad, guiones por tipo (WAN/wifi), brillo al seleccionar y etiqueta flotante |
| Sin profundidad | **Niebla por distancia**, orden de pintado real y rejilla de suelo con halo |
| Paquetes solo en la pestaña de simulación | Paquetes animados sobre la propia escena 3D, con estela, más tráfico ambiental |
| Sin encuadre | `encuadrar()` mide en pantalla, respeta la zona del HUD y centra; botones Ajustar/Girar/Tráfico |
| Panel de detalles dentro del lienzo | **Inspector lateral** con ficha, interfaces, protocolos clicables y notas; hoja inferior en móvil |
| Una sola apariencia | **Tema claro/oscuro** con preferencia del sistema, y `prefers-reduced-motion` |
| Sin exportación | Exportar escena a JSON |

Nada de esto añade funciones fuera del alcance: se mejora la **presentación 3D** de lo que ya existía.

---

## 5. Errores encontrados y corregidos durante la verificación visual

La verificación con capturas reales (Chrome headless) descubrió defectos que las pruebas de sintaxis no
veían. Todos están corregidos y cubiertos por las pruebas actuales:

| # | Defecto | Causa | Corrección |
|---|---|---|---|
| 1 | Tarjetas transparentes, sin sombras ni brillos | `Motor3D` hacía `svg.innerHTML = …` y **borraba el `<defs>`** con los degradados y filtros | Las capas se crean con `createElementNS` y se añaden sin destruir `<defs>` |
| 2 | Tema oscuro sin fondo, variables CSS vacías | Un **BOM** al inicio de `base.css` invalidaba la regla `:root` | BOM eliminado y `build.mjs` lo limpia al insertar |
| 3 | No se podía seleccionar un nodo | La captura de puntero hacía que `pointerup` llegara al SVG, no a la tarjeta | Se guarda el objetivo del `pointerdown` y se usa al soltar |
| 4 | En móvil el lienzo se salía de la pantalla (511 px en 430 px) | El `<svg>` imponía su **relación de aspecto** al layout | SVG en `position:absolute; inset:0` y `.app` con ancho de viewport |
| 5 | Tarjetas solapadas en el centro del diagrama | Posiciones casi colineales, tamaño de tarjeta fijo | **Colocador de etiquetas** en pantalla con línea guía y límites al área visible |
| 6 | Bucle `ResizeObserver` en consola | El render cambiaba el `viewBox` dentro del observador | Debounce por `requestAnimationFrame` y comparación de tamaño |
| 7 | El catálogo de protocolos no abría el detalle | Faltaba el manejador de `[data-proto-id]` | Delegación de eventos añadida |
| 8 | Etiqueta de IP bajo la tarjeta desplazada | Se posicionaba respecto al anclaje, no a la tarjeta | Se usa la posición final de la tarjeta |
| 9 | Zonas de `.drawio` contadas como dispositivos | Contenedor con hijos se añadía también como nodo | Un contenedor con contenido es **zona**, no nodo |
| 10 | PDF devolvía texto vacío | Índices de grupo equivocados en el tokenizador de operadores | Grupos corregidos (`Tf`, `<hex> Tj`, `Td`) y probado con un PDF real |

---

## 6. Resultados de las pruebas

```
node tests/codec.test.mjs      → 34/34   inflate/zlib (niveles 0,1,6,9), bloques almacenados, ZIP
node tests/ingesta.test.mjs    → 10/10   .drawio plano y comprimido, .docx, .pdf, inventario, evidencias, JSON
node tests/smoke.mjs           → 14/14   navegador real: arranque sin errores, 17 nodos, 16 enlaces,
                                          5 pestañas, 9 filas de VLANs, 12 nodos del lab, 11 enlaces,
                                          2 zonas, 3 saltos de simulación, 10 IPs de evidencia
node scripts/verify.mjs        → 24/24   sin recursos externos, sin marcadores, sin BOM, HTML5,
                                          accesibilidad, tamaño, workflow, .nojekyll, skill completo
```

Tamaño final: **156 KB** por aplicación (≈1,3 s en 3G rápida; sin peticiones adicionales).

---

## 6.1 Verificación en producción (posterior a la publicación)

| Comprobación | explorador-redes-3d | lab-redes-3d |
|---|---|---|
| HTTP de la URL publicada | 200 | 200 |
| Tamaño servido | 159 766 B (156 KB) | 159 595 B (155,9 KB) |
| sha256 del HTML servido vs. build local | `7867548cac6ab72d…` **coincide** | `b1dc808c35ed3567…` **coincide** |
| Ejecución del workflow de Pages | ✓ success | ✓ success |
| Renderizado real (Chrome headless sobre la URL) | ✓ escena, HUD e inspector correctos | ✓ escena, zonas y panel de evidencias correctos |

El HTML servido es **byte a byte** el mismo que se validó en local: no hay reescritura de Jekyll, ni
conversión de fin de línea de git, ni inyección del servidor.

## 7. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| ~~Sin `gh` ni credenciales~~ **resuelto** | Los repositorios se crearon y publicaron con un token *fine-grained* por API + `git push` | Sin `gh`: se usó la API REST (`/user/repos`, `/pages`, `/actions/.../dispatches`) con autorización en cabecera, sin guardar el token en `.git/config` |
| PDF escaneado sin capa de texto | El Lab no puede extraer texto de ese PDF | Se avisa en la interfaz; se puede adjuntar como imagen. OCR declarado fuera de alcance |
| PDF con fuentes sin `ToUnicode` | Texto parcial | Documentado; los PDF de Word/LaTeX incluyen ese mapa y se probaron |
| `.drawio` con HTML muy anidado en etiquetas | Etiqueta aplanada a texto | Comportamiento esperado: se busca legibilidad, no fidelidad tipográfica |
| Escenarios con más de ~300 elementos | Degradación del render SVG | Límite de 260 nodos con aviso; plan B documentado (agrupar por zona o migrar a canvas) |
| `redes-3d-lab` es mío, no de la comunidad | No hay revisión externa | Está probado (58 comprobaciones) y documentado; se puede publicar como repositorio propio |

---

## 8. Siguientes pasos sugeridos

1. **Publicar** los dos repositorios (5 minutos) y pegar las URLs reales en los README y en `skill.json`.
2. **Sustituir el ejemplo** del Lab por el `.drawio` real del colegio y su informe; validar que las
   evidencias citan los párrafos correctos.
3. **Añadir un tercer escenario** al Explorador (por ejemplo la situación con firewall HA) editando solo
   `datos.js`.
4. Si se quiere **React**: mantener este repositorio como referencia visual y migrar solo la capa de
   interfaz, conservando `codec.js` e `ingesta.js` (no dependen del DOM de la vista).
5. Si se necesita **OCR**, añadir `tesseract.js` servido desde el propio repositorio como módulo opcional,
   con carga bajo demanda, y actualizar los criterios de aceptación.

---

## 9. Conclusión

Se entrega una base real y verificable: dos aplicaciones que funcionan **hoy** abriendo un archivo, un
skill instalado que las reconstruye y las prueba, y documentación que separa con claridad **lo comprobado**
de **lo supuesto**. La publicación también quedó cerrada: los dos repositorios existen, Pages está en modo GitHub Actions y el
contenido servido coincide byte a byte con el verificado en local.
