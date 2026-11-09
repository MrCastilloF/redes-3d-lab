# Arquitectura

## 1. Principio rector

Un solo artefacto publicable por aplicación (`index.html`), **todo el código dentro** y **cero peticiones
de red**. Esto obliga a tres decisiones que explican casi todo lo demás:

1. El motor 3D es propio y dibuja en **SVG** (sin WebGL ni CDN).
2. La lectura de `.drawio`, `.docx` y `.pdf` usa **códecs implementados aquí** (inflate/ZIP propios).
3. No hay framework ni bundler: la plantilla HTML se rellena con los archivos de `assets/`.

## 2. Capas

```
┌─────────────────────────────── aplicaciones ───────────────────────────────┐
│ explorador: template.html + app.js + datos.js + app1.css                   │
│ lab:         template.html + app.js + ejemplo.js + lab.css                 │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────────┐
│ core/ui.js      toasts, pestañas accesibles, tema, descargas, fichas       │
├────────────────────────────────────────────────────────────────────────────┤
│ core/motor3d.js cámara orbital · proyección · orden por profundidad ·      │
│                 tarjetas billboard · enlaces en arco · paquetes · eventos   │
├────────────────────────────────────────────────────────────────────────────┤
│ core/ingesta.js .drawio/.docx/.pdf/texto/JSON/imágenes → escena + evidencias│
│ core/codec.js   inflate (RFC1951) · zlib · lector ZIP                       │
├────────────────────────────────────────────────────────────────────────────┤
│ theme/base.css  variables, componentes, capas del SVG, responsive           │
└────────────────────────────────────────────────────────────────────────────┘
```

Dependencias en un solo sentido: `app → ui/motor3d/ingesta → codec`. Ningún módulo del núcleo conoce a
una aplicación concreta.

## 3. Espacio de coordenadas y cámara

- Mundo: **X** derecha, **Y** arriba (suelo en `y = 0`), **Z** hacia el fondo. Unidades abstractas.
- Cámara orbital: `target`, `yaw`, `pitch`, `dist`, `fov`. El ojo se calcula con
  `eye = target + dist·(cos p·cos y, sin p, cos p·sin y)`.
- Base ortonormal: `f` (adelante), `r = normalize(f × up)`, `u = r × f`.
- Proyección:
  `zc = (p−eye)·f`, `xc = (p−eye)·r`, `yc = (p−eye)·u`, `focal = (alto/2)/tan(fov/2)`,
  `sx = ancho/2 + xc·focal/zc`, `sy = alto/2 − yc·focal/zc`, `escala = focal/zc`.
  Si `zc ≤ 0.35` el punto queda detrás y se descarta (evita divisiones por cero).
- `s` (escala de profundidad) se usa para: grosor de enlaces, tamaño de las tarjetas,
  radios de sombra y opacidad de niebla.

**Altura por tipo** (`ALTURA_TIPO`): nube 3.4, firewall 2.5, router 2.3, servidor 2.0, switch 1.75,
AP 1.6, cámara 1.25, PC/portátil 0.95… La altura es lo que hace legible la jerarquía de la red: el
perímetro flota por encima del cableado y los extremos.

## 4. Canal de dibujo

Cada `render()`:

1. `proyectar()` todos los nodos.
2. Construir una lista de piezas (nodos y enlaces) y **ordenar por profundidad descendente** (pintado del
   fondo al frente, algoritmo del pintor).
3. **Colocación de tarjetas** en espacio de pantalla: se recorren de más cercana a más lejana; cada tarjeta
   busca el primer hueco libre entre desplazamientos verticales y diagonales, se limita al área visible y,
   si se movió, se dibuja una **línea guía** hasta su anclaje 3D. Así no hay solapes aunque el diagrama
   tenga nodos casi colineales.
4. Capas SVG independientes: `suelo → zonas → enlaces → sombras → nodos → etiquetas → paquetes`.
   Solo la capa de paquetes se reescribe en cada fotograma; el resto se regenera únicamente si cambia la
   cámara o la escena.
5. Niebla: la opacidad decae con la distancia (`1 − (d−8)/110`, acotada). Da profundidad sin post-proceso.

### Encuadre (`encuadrar`)

No usa la caja del mundo: itera 8 veces midiendo **la caja real en pantalla** de todas las tarjetas
(incluido el tamaño que tendrían con su escala) y ajusta `dist` hasta que quepa en el área útil
(`cam.w/h` menos `zonaSegura`, que reserva el espacio del HUD). Después **centra** con un paneo en
espacio de pantalla. Resultado: la red siempre queda encuadrada y nunca debajo del título ni de la leyenda,
en cualquier proporción de ventana.

## 5. Interacción

- `pointerdown/move/up` con captura de puntero: órbita (arrastrar), paneo (`Mayús` o botón central),
  pellizco con dos punteros (zoom), selección por clic (se usa el objetivo del `pointerdown` porque la
  captura de puntero hace que el `pointerup` llegue al SVG).
- Rueda: zoom multiplicativo con `exp(deltaY·0.0013)`.
- Teclado: flechas orbitan, `+`/`−` acercan, `Esc` cierra ficha.
- Cámara animada: interpolación con `easeInOutCubic` en 560–620 ms; se salta si el usuario prefiere
  movimiento reducido.

## 6. Paquetes animados

`setFlujo([a, b, c], {color, velocidad})` crea un segmento por salto. Cada paquete avanza con `dt` real,
recorre los segmentos y dibuja una estela de 4 puntos decrecientes. Los puntos se proyectan con la misma
cámara, así que el paquete “vuela” sobre el arco del enlace. `setTrafico(true)` añade un paquete ambiental
por enlace con fase distinta.

## 7. Pipeline de ingesta

```
File[] → tipoDeArchivo() → leerDrawio | leerDocx | leerPdf | texto/JSON | imagen
      → grafo {nodos, enlaces, zonas} + documentos[]
      → analizarDocumento() → inventario {ips, vlans, cidrs, hosts}
      → aEscena(grafo)  → escena del motor
      → evidenciasDe(nodo, documentos) → citas por nodo
```

Detalle completo en `02-flujo-insumos.md`.

## 8. Contratos

**Escena (motor):**

```js
{ nodos: [{id, nombre, tipo, x, z, y?, color?, etiqueta?, sub?, estadoColor?, escala?}],
  enlaces: [{id, a, b, color?, grosor?, tipo?, rotulo?}],
  zonas: [{nombre, x0, z0, x1, z1, color?}] }
```

**Ingesta:**

```js
{ fuentes: [{nombre, tipo, bytes, ok, detalle}],
  escenas: [{nombre, fuente, grafo, escenaDirecta?}],
  documentos: [{fuente, texto, parrafos|paginas, analisis}],
  imagenes: [{fuente, bytes, mime, datos}],
  inventario: {ips, vlans, cidrs, hosts},
  avisos: [string] }
```

**Grafo intermedio (drawio o JSON):**

```js
{ nodos: [{id, etiqueta, tipo, x, y, ancho, alto, zona, ip, color}],
  enlaces: [{id, a, b, etiqueta, color}],
  zonas: [{id, nombre, x0, y0, x1, y1, color}] }
```

`aEscena()` normaliza cualquier grafo a un mundo de ~24 unidades de lado mayor, centrado en el origen, de
modo que un `.drawio` de 1200×900 o de 4000×3000 se ve igual de bien sin tocar la cámara.

## 9. Por qué SVG y no WebGL

| Criterio | SVG (elegido) | WebGL (three.js) |
|---|---|---|
| Archivo único sin CDN | ✅ nativo | ❌ requiere ~600 KB de librería o vendorizarla |
| Texto nítido y seleccionable | ✅ fuentes del sistema, `text` real | ⚠️ necesita atlas/SDF |
| Accesibilidad y `data-*` para clics | ✅ DOM | ❌ raycasting manual |
| Coste de aprendizaje del código | ✅ matemáticas explícitas | ⚠️ API extensa |
| Nº de elementos cómodo | ~300 formas | miles |

Con 12–20 dispositivos y 10–20 enlaces, SVG es la opción con mejor relación calidad/esfuerzo y la única
que mantiene el requisito de archivo único sin empaquetar dependencias. Si un escenario superara los
~300 elementos, el siguiente paso documentado es modo "resumen" (agrupar por zona) antes que migrar a WebGL.

## 10. Rendimiento

- Re-render estático solo al mover cámara (throttle por `requestAnimationFrame`).
- El bucle de animación se detiene solo cuando no hay flujo, ni tráfico, ni autorrotación pendiente.
- `ResizeObserver` con debounce por rAF y comparación de tamaño para no entrar en bucles.
- Las tarjetas usan tamaños en píxeles escalados por profundidad (no geometría 3D compleja).
