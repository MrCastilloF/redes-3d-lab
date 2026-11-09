# Explorador de Redes 3D · labs_redes_test

Versión 3D mejorada del explorador de topologías del colegio: **un solo archivo `index.html`**, sin
dependencias externas, sin backend y sin paso de compilación. Se puede abrir con doble clic desde el
disco o publicar tal cual en GitHub Pages.

- **Sitio publicado:** https://mrcastillof.github.io/explorador-redes-3d/
- **Versión anterior (referencia):** https://mrcastillof.github.io/explorador-de-redes/3d.html
- **Contenido:** 4 escenarios (situación actual + 3 propuestas), 9 VLANs, 16 protocolos y un glosario
  de 37 términos, exactamente el mismo modelo de datos de la versión anterior.

## Qué incluye

| Pestaña | Qué hace |
|---|---|
| **Topología** | Escena 3D real (cámara orbital, proyección perspectiva, niebla por profundidad, sombras, paquetes animados). Clic en un dispositivo o enlace abre su ficha completa. |
| **Direccionamiento** | Tabla de VLANs y subredes, dispositivos con IP/MAC, calculadora de subred y notas del diseño. |
| **Protocolos** | Catálogo de 16 protocolos con pila de capas, cabeceras y opción de resaltar en la topología los enlaces que los transportan. |
| **Simulación** | Ruta calculada con BFS entre dos dispositivos, animación del paquete sobre los enlaces 3D y coste estimado por salto. |
| **Glosario** | Términos agrupados por categoría, con buscador. |

Controles de la escena: arrastrar = orbitar · rueda = zoom · `Mayús`+arrastrar = desplazar ·
flechas = girar · `+`/`−` = acercar · doble clic = enfocar · `Esc` = cerrar la ficha.

## Estructura del repositorio

```
.
├─ index.html                    ← aplicación completa (autocontenida)
├─ .nojekyll                     ← evita el procesado de Jekyll en GitHub Pages
├─ README.md
└─ .github/
   └─ workflows/
      └─ pages.yml               ← publicación automática en GitHub Pages
```

## Publicar en GitHub Pages

**Opción A — con el workflow incluido (recomendada).** Sube el repositorio y, en *Settings → Pages*,
elige **Source: GitHub Actions**. Cada `push` a `main` publica la versión nueva.

**Opción B — rama y carpeta.** *Settings → Pages → Source: Deploy from a branch*, rama `main`,
carpeta `/ (root)`. No hay compilación: `index.html` ya está listo.

## Cómo editarlo

Todo el contenido está en el bloque `DATOS` dentro de `index.html` (busca `const DATOS = {`):

- `vlans` — esquema de direccionamiento que alimenta la leyenda y la pestaña Direccionamiento.
- `baseDespues.nodos` / `baseDespues.enlaces` — topología compartida por las propuestas.
- `escenarios.antes|op1|op2|op3` — variantes: nombre, descripción, banda, nodos y enlaces añadidos.
- `protocolos` — id, nombre, capa, color, resumen, analogía, cabeceras y dónde aparece.
- `glosario` — término, categoría y definición.

Las posiciones `x, y` de cada nodo se expresan en el lienzo original de 1660 × 920 y se convierten a
unidades de mundo 3D; la altura se deduce del tipo de dispositivo (nube 3.4, firewall 2.5, switch 1.75,
PC 0.95…). Añadir un dispositivo es añadir un objeto al arreglo `nodos` y un enlace que lo conecte.

## Requisitos técnicos

- Navegador moderno con SVG, `ResizeObserver` y `requestAnimationFrame` (Chrome/Edge/Firefox/Safari actuales).
- Sin cookies, sin analítica, sin peticiones de red: no envía datos a ningún servidor.
- Accesible por teclado en la escena y con `aria-label`/`role="tabpanel"` en la navegación.
- Respeta `prefers-reduced-motion` y `prefers-color-scheme` (tema claro/oscuro conmutable).

## Créditos

Modelo de red, textos y glosario: labs_redes_test. Motor 3D, interfaz y empaquetado: skill
`redes-3d-lab` (ver el repositorio del skill para reconstruir o extender la aplicación).
