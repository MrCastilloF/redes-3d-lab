# Manual de uso

## Parte 1 · Explorador de Redes 3D

### 1.1 Abrir la aplicación

Doble clic en `index.html` o visita `https://mrcastillof.github.io/explorador-redes-3d/`.
No hace falta conexión a internet después de la primera descarga: el archivo no pide nada.

### 1.2 La escena 3D (pestaña «Topología»)

| Acción | Cómo |
|---|---|
| Girar la red | Arrastrar sobre el lienzo |
| Acercar / alejar | Rueda del ratón, pellizco con dos dedos, o `+` / `−` |
| Desplazar | `Mayús` + arrastrar, o botón central |
| Girar con teclado | Flechas `←` `→` `↑` `↓` |
| Ver la ficha | Clic en un dispositivo o en un enlace |
| Enfocar un dispositivo | Doble clic sobre él |
| Cerrar la ficha | `Esc` o clic en el fondo |
| Cambiar de punto de vista | Botones `Iso` · `Frente` · `Cenital` |
| Ver todo | Botón `Ajustar` |
| Rotación automática | Botón `Girar` |
| Tráfico animado | Botón `Tráfico` (interruptor) |
| Cambiar de escenario | Selector de la barra superior (situación actual y 3 propuestas) |
| Exportar | Botón «Exportar escena» del panel derecho (descarga JSON) |
| Tema claro/oscuro | Botón de luna/sol arriba a la derecha |

**Qué significa cada color:** cada tarjeta lleva el color de su VLAN (o del tipo de dispositivo si no tiene
VLAN); el punto de la esquina indica el estado (verde operativo, ámbar atención, rojo falla). Los enlaces
toman el color de la VLAN que transportan y el grosor de su velocidad.

**Altura = jerarquía.** El perímetro (nube, firewall, router) flota por encima del conmutador central, y los
extremos (PC, teléfonos, cámaras) quedan abajo: la vertical del dibujo representa la capa de la red.

### 1.3 Direccionamiento

- Tabla de VLANs: subred, puerta de enlace, rango DHCP y uso previsto.
- Tabla de dispositivos con IP: IP, máscara, **red calculada**, VLAN y MAC.
- Calculadora de subred: escribe una IP, elige el prefijo y pulsa **Calcular** → red, máscara, broadcast,
  primer y último host, hosts útiles, clase y si es privada.
- Notas del diseño del escenario.

### 1.4 Protocolos

Elige un protocolo del catálogo: verás su capa, resumen, una analogía, la pila de capas con la capa activa
resaltada, los campos de cabecera y dónde aparece en esta red. El botón **Resaltar en la topología** vuelve
a la escena y enmarca los nodos y enlaces que lo usan.

### 1.5 Simulación

1. Elige **origen** y **destino** (cualquier dispositivo con IP).
2. Elige el tipo de tráfico: ICMP, DNS, HTTP/HTTPS o DHCP.
3. Pulsa **Trazar ruta**: aparece el camino salto a salto con el papel de cada dispositivo y un tiempo
   acumulado estimado (didáctico, no es una medición real).
4. Vuelve a **Topología**: el paquete recorre esos enlaces en 3D. **Detener** corta la animación.

### 1.6 Glosario

37 términos agrupados por categoría, con buscador. Útil para clase: es el mismo vocabulario que usan las
fichas de los dispositivos.

---

## Parte 2 · Lab de Redes 3D

### 2.1 Para qué sirve

Convertir lo que ya tienes —el `.drawio` del proyecto, el informe en PDF, el inventario en Word, una foto del
rack— en un escenario 3D navegable **con las fuentes citadas**. Todo se procesa en tu equipo.

### 2.2 Cargar insumos

- Botón **Cargar** (barra superior) o **Añadir archivos** (pestaña Insumos).
- O **arrastra** los archivos sobre el lienzo o sobre la zona de puntos.
- Se pueden añadir en varias tandas: `.drawio` primero y luego los documentos.

### 2.3 Qué esperar de cada archivo

| Archivo | Resultado |
|---|---|
| `.drawio` (una o varias páginas) | Una escena por página: formas → dispositivos, flechas → enlaces, contenedores → zonas |
| `.pdf` con texto | Párrafos para evidencias + IPs/VLANs/redes detectadas |
| `.docx` | Igual que el PDF |
| `.txt`, `.md`, `.csv` | Texto para evidencias |
| `.json` exportado antes | La escena completa, de vuelta |
| Imágenes | Galería de evidencias visuales |

La pestaña **Insumos** muestra, archivo por archivo, qué se hizo y las advertencias (formato no soportado,
PDF sin texto, diagrama sin formas reconocibles).

### 2.4 Leer el escenario

- Cada tarjeta: nombre y, si la etiqueta del `.drawio` incluía una IP, la IP.
- Las losas del suelo son las **zonas** (edificios, plantas, salas) tal como estaban en el dibujo.
- Clic en un dispositivo → ficha con tipo, zona, conexiones, archivo de origen, **vecinos** y
  **evidencias**: los párrafos de tus documentos que lo mencionan, con el término resaltado.
- Clic en un enlace → sus dos extremos y su rótulo.

### 2.5 Simular

En el panel derecho, elige origen y destino y pulsa **Trazar ruta**. Se calcula el camino más corto por los
enlaces y el paquete lo recorre en 3D. Si el escenario no tiene enlaces (por ejemplo, una escena de
inventario), la aplicación lo explica en vez de inventar una ruta.

### 2.6 Guardar el trabajo

**Exportar** descarga la escena como JSON. Ese archivo se puede volver a cargar en el Lab (o versionarlo en
el repositorio). No hay almacenamiento remoto: el laboratorio es tuyo y no sale del navegador.

### 2.7 Si algo no sale

| Situación | Qué hacer |
|---|---|
| «No se encontró texto seleccionable» | El PDF es un escaneo. Adjúntalo como imagen o usa la versión digital |
| El diagrama no tiene formas reconocibles | En drawio, las formas deben tener etiqueta de texto; las cajas vacías se ignoran |
| Solo tengo documentos, no `.drawio` | La app genera una escena de inventario por subredes y lo avisa |
| Quiero más detalle en un nodo | Añade al informe un párrafo que mencione su nombre o su IP: aparecerá como evidencia |

---

## Parte 3 · Guía de administración (quien mantiene el código)

### 3.1 Reconstruir las aplicaciones

```bash
cd redes-3d-lab
node scripts/build.mjs          # genera apps/explorador-redes-3d y apps/lab-redes-3d
node scripts/verify.mjs         # comprueba el resultado
```

### 3.2 Cambiar el contenido del Explorador

Todo el contenido está en `assets/app-explorador/datos.js`:

- `vlans` → esquema de direccionamiento (leyenda, tablas, colores).
- `baseDespues.nodos` / `baseDespues.enlaces` → topología compartida por las propuestas.
- `escenarios.<id>.nodos|enlaces|anotaciones` → variantes. Para crear un escenario nuevo: añade una clave
  en `DATOS.escenarios` con `nombre`, `descripcion` y los nodos/enlaces propios; aparece solo en el selector.
- `protocolos` y `glosario` → catálogos de las pestañas.

Un dispositivo nuevo necesita `id`, `tipo`, `nombre`, `info` e `(x, y)` en el lienzo de 1660×920. Su altura
en 3D la decide el tipo.

### 3.3 Cambiar el ejemplo del Lab

`assets/app-labs/ejemplo.js` contiene un `.drawio` real y un documento de ejemplo. Sustitúyelos por los del
colegio y reconstruye.

### 3.4 Añadir un formato de entrada

1. `assets/core/ingesta.js` → añade la extensión en `tipoDeArchivo()` y una función `leerX(bytes)`.
2. Devuelve `{texto}` o `{nodos, enlaces, zonas}` según corresponda.
3. Añade un caso en `tests/ingesta.test.mjs` que genere el archivo en el momento (sin binarios).
4. `node tests/ingesta.test.mjs && node scripts/build.mjs && node tests/smoke.mjs`.

### 3.5 Publicar una variante (otra sede, otro cliente)

```bash
node scripts/scaffold.mjs lab-redes-sede-norte --base lab --titulo "Lab de Redes · Sede Norte"
cd lab-redes-sede-norte
git init -b main && git add . && git commit -m "feat: primera versión"
gh repo create MrCastilloF/lab-redes-sede-norte --public --source=. --push
```

Después, en GitHub: **Settings → Pages → Source: GitHub Actions**.
