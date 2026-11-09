# Criterios de aceptación · versión 1

Una aplicación se considera terminada cuando **todos** los criterios de su bloque están marcados y las
pruebas automáticas pasan. Cada criterio indica cómo se comprueba.

## A. Comunes a las dos aplicaciones

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| A1 | Un solo `index.html` publicable, sin backend ni compilación | `node scripts/verify.mjs` (archivo único) | ✅ |
| A2 | Cero recursos externos (CDN, fuentes, hojas) | `verify.mjs`: falla con `src`/`href` absolutos o `@import` | ✅ |
| A3 | Funciona abriendo el archivo desde el disco (`file://`) | Prueba de humo con Chrome headless sobre `file:///` | ✅ |
| A4 | Sin errores de JavaScript en consola al arrancar | `tests/smoke.mjs` (`window.onerror` vacío) | ✅ |
| A5 | Navegación por pestañas con ARIA y teclado | `verify.mjs` (≥8 `aria-*`, `role="tab"`), revisión manual | ✅ |
| A6 | Tema claro y oscuro, con preferencia del sistema y conmutador | `verify.mjs` (`[data-theme="light"]`), captura en ambos temas | ✅ |
| A7 | Respeta `prefers-reduced-motion` | `verify.mjs` + revisión | ✅ |
| A8 | Responsive: escritorio, tableta (≤1080 px) y móvil (≤720 px) | Capturas a 1600×1000, 1024×768 y 500×900 | ✅ |
| A9 | Escena 3D navegable: orbitar, zoom, paneo, encuadrar, presets | Prueba de humo + interacción manual | ✅ |
| A10 | Tarjetas sin solaparse y encuadre que respeta el HUD | Revisión visual + `zonaSegura` en el encuadre | ✅ |
| A11 | Tamaño < 400 KB por aplicación | `verify.mjs` (actual ≈156 KB) | ✅ |
| A12 | README, `.nojekyll` y workflow de Pages dentro del repo | `verify.mjs` | ✅ |
| A13 | Documentación en español y sin datos inventados | Revisión | ✅ |

## B. Aplicación 1 · Explorador de Redes 3D

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| B1 | Mismo alcance funcional que `3d.html`: topología, direccionamiento, protocolos, simulación, glosario | `smoke.mjs`: 5 pestañas y tabla de VLANs con 9 filas | ✅ |
| B2 | Mismo modelo de datos (17 dispositivos, 16 enlaces, 4 escenarios, 9 VLANs, 16 protocolos) | `smoke.mjs` (nodos=17, enlaces=16) + `datos.js` sin cambios | ✅ |
| B3 | Mejora visual 3D real (perspectiva, profundidad, sombras, niebla, paquetes) | Revisión visual de la captura | ✅ |
| B4 | Clic en dispositivo y en enlace abre ficha completa (IP, MAC, VLAN, interfaces, protocolos, notas) | Prueba manual + panel (`panelNodo`, `panelEnlace`) | ✅ |
| B5 | Selector de escenario reconstruye escena y paneles | Prueba manual | ✅ |
| B6 | Calculadora de subred correcta | Revisión + funciones `ipANum/redDe/broadcastDe` | ✅ |
| B7 | Simulación: ruta BFS, animación sobre los enlaces 3D, tabla de saltos | `smoke.mjs` (detalle de protocolo) + revisión de la pestaña | ✅ |
| B8 | Resaltado de un protocolo sobre la topología | Prueba manual (botón «Resaltar en la topología») | ✅ |
| B9 | Exportación de la escena a JSON | Botón «Exportar escena» | ✅ |
| B10 | No se añadieron funciones no pedidas (sin edición, sin backend, sin cuentas) | Revisión del alcance | ✅ |

## C. Aplicación 2 · Lab de Redes 3D

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| C1 | Acepta `.drawio` XML plano y comprimido (base64 + deflate) | `ingesta.test.mjs`: dos casos con el mismo resultado | ✅ |
| C2 | Varias páginas → varias escenas seleccionables | Selector «Escena» + parser por página | ✅ |
| C3 | Contenedores → zonas 3D; hijos con coordenadas absolutas correctas | `ingesta.test.mjs` (zona + `pc.x ≥ 60`) | ✅ |
| C4 | Inferencia de tipo (router, switch, firewall, servidor, PC, AP, cámara…) | `ingesta.test.mjs` | ✅ |
| C5 | Texto de `.docx` | `ingesta.test.mjs` (párrafos) | ✅ |
| C6 | Texto de `.pdf` con FlateDecode y `ToUnicode` | `ingesta.test.mjs` (PDF generado) | ✅ |
| C7 | Inventario de IPs/VLANs/CIDR con contexto | `ingesta.test.mjs` | ✅ |
| C8 | Evidencias por nodo con cita y resaltado | `ingesta.test.mjs` + captura del panel | ✅ |
| C9 | Sin `.drawio`: escena de inventario + aviso explícito | `ingesta.test.mjs` | ✅ |
| C10 | Exportar y reimportar JSON (ciclo completo) | `ingesta.test.mjs` | ✅ |
| C11 | Simulación equivalente: origen/destino, ruta, animación, tabla | `smoke.mjs` (saltos ≥ 2) | ✅ |
| C12 | Arrastrar y soltar archivos sobre el lienzo y sobre la zona de carga | `dragover/drop` + velo visual; revisión manual | ✅ |
| C13 | Estado sin insumos comprensible (no pantalla en blanco) | Ejemplo cargado por defecto + textos guía | ✅ |
| C14 | Límites declarados (PDF escaneado, `.doc`, OCR) | Documentados en la app y en el README | ✅ |
| C15 | Un solo archivo, sin backend, con datos del usuario sin salir del navegador | `verify.mjs` + revisión de red (cero peticiones) | ✅ |

## D. Definición de «hecho» operativa

```bash
node scripts/build.mjs          # ✓ dos apps construidas
node tests/codec.test.mjs       # ✓ 34/34
node tests/ingesta.test.mjs     # ✓ 10/10
node tests/smoke.mjs            # ✓ 14/14
node scripts/verify.mjs         # ✓ todas las comprobaciones estructurales
```

Si los cinco comandos terminan en verde, la versión 1 es aceptable y publicable.

## E. Fuera de alcance de la versión 1 (declarado)

- Edición de la topología dentro de la aplicación (mover nodos y guardar).
- OCR de PDF escaneados y conversión de `.doc`/`.xlsx`.
- Colaboración multiusuario o almacenamiento remoto.
- Autenticación, cuentas o cualquier forma de backend.
- Exportación a imagen/vídeo del escenario 3D.
