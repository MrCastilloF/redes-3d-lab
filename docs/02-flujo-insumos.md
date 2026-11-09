# Flujo de conversión: de los archivos al escenario 3D

## 1. Vista general

```
archivo  ──►  detección  ──►  lectura/descompresión  ──►  modelo  ──►  escena 3D  ──►  evidencias
 (.drawio)     por ext/MIME      inflate / ZIP / texto      grafo       aEscena()      citas por nodo
```

Se ejecuta en `R3.Ingesta.procesar(archivos)`, que devuelve un objeto con `fuentes`, `escenas`,
`documentos`, `imagenes`, `inventario` y `avisos`. Nada se envía a ningún servidor.

## 2. Detección de formato

`tipoDeArchivo(nombre, mime)` decide por extensión y, si no hay extensión, por MIME:

| Extensión | Tipo | Uso |
|---|---|---|
| `.drawio`, `.dio`, `.xml` con «drawio» en el nombre | `drawio` | topología |
| `.docx` | `docx` | texto |
| `.pdf` | `pdf` | texto |
| `.txt`, `.md`, `.csv`, `.tsv`, `.log` | `texto` | texto |
| `.json` | `json` | escena si tiene `nodos`, si no texto |
| `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg` | `imagen` | evidencia visual |
| `.doc`, `.xls`, `.xlsx` | aviso | no soportado (declarado) |

## 3. `.drawio`: XML plano y XML comprimido

**Detección:** si el contenido (recortado) empieza por `<` es XML; si no, se asume el formato comprimido.

**Formato comprimido de diagrams.net (decodificación exacta):**

```
texto_base64 → atob → bytes → inflateRaw (DEFLATE) → UTF-8 → decodeURIComponent → XML
```

Se implementa con `codec.js` (inflate propio). Si el `inflateRaw` falla se intenta `inflateZlib` (algunos
exportadores guardan cabecera zlib). El resultado se valida buscando `<mxGraphModel`.

**Extracción de celdas** (sin `DOMParser`, para poder probarlo en Node):

1. `<UserObject …>` / `<object …>` → mapa `id → label` (drawio guarda ahí la etiqueta cuando la forma
   tiene metadatos propios).
2. `<mxCell …>` → atributos (`id`, `parent`, `value`, `style`, `vertex`, `edge`, `source`, `target`) y
   `<mxGeometry>` (`x`, `y`, `width`, `height`, `relative`).
3. Etiqueta: se decodifican entidades HTML, se convierten `<br>` y `</div>` en espacios y se eliminan
   etiquetas → texto plano (`limpiarEtiqueta`).

**Reglas del grafo:**

| Elemento drawio | Resultado |
|---|---|
| Forma con etiqueta y sin hijos | **nodo** (dispositivo) |
| Contenedor (`swimlane`, `group`, o caja ≥ 300×180) **con hijos** | **zona** (recinto) + sus hijos quedan dentro |
| Contenedor vacío con etiqueta | nodo “caja” (no se pierde información) |
| Flecha (`edge="1"` con `source` y `target` existentes) | **enlace**; su `value` es el rótulo |
| Flecha a un id inexistente o a sí misma | se descarta |

**Coordenadas:** drawio guarda las formas de un contenedor **relativas al contenedor**; `absoluta()` suma
recursivamente las posiciones de los padres. Sin esto, los nodos de un `swimlane` se dibujan todos en la
esquina superior izquierda.

**Inferencia de tipo** (`tipoPorEtiqueta`), por orden: reglas de texto sobre etiqueta+estilo
(`router|enrutador`, `switch|conmutador|fortiswitch`, `firewall|fortigate|pfsense|asa`,
`server|servidor|dns|dhcp|web`, `nvr|grabador`, `cámara|cctv`, `ap|wifi`, `teléfono|voip`,
`laptop|portátil`, `pc|desktop`, `printer`) → formas (`ellipse|cloud` → nube, `cylinder` → servidor) →
estilos `mxgraph.cisco.*` → `desconocido`.

**IP en la etiqueta:** si la etiqueta contiene una IPv4 (`PC Rectoría 10.10.10.21`), se guarda en `n.ip`
y se muestra como etiqueta flotante sobre la tarjeta 3D.

**Colores:** `strokeColor`/`fillColor` del estilo se convierten a `#rrggbb` y se usan como color del nodo,
del enlace y de la zona. Si no hay color, la aplicación aplica su paleta.

**Varias páginas:** cada `<diagram>` produce una escena independiente; en la interfaz aparecen en el
selector «Escena» y como chips en *Insumos*.

## 4. `.docx` (ZIP + XML)

Un `.docx` es un ZIP. Se localiza el fin del directorio central (EOCD), se recorren las entradas, se
descomprime `word/document.xml` con DEFLATE y se convierte a texto:

- `</w:p>` → salto de línea (párrafo),
- `<w:tab/>` → tabulador, `<w:br/>` → salto,
- se descartan `w:instrText` (campos) y se limpian el resto de etiquetas con la misma función que drawio.

Se añaden `footnotes.xml` y `endnotes.xml` si existen.

## 5. `.pdf` (sin pdf.js)

1. Se lee el archivo como *latin1* (1 byte = 1 carácter) para conservar los desplazamientos.
2. Se recorren los objetos `N 0 obj … endobj` y se localiza su `stream` (`stream\r?\n … endstream`).
3. Si el diccionario declara `/Filter /FlateDecode`, se infla con `codec.js`.
4. **Fuentes:** objetos con `/Type /Font`; si tienen `/ToUnicode N 0 R`, se descomprime ese flujo CMap y se
   parsean `beginbfchar`/`endbfrange` (`<src> <dst>`, rangos con destino simple o en arreglo) → mapa
   `código → texto`.
5. **Recursos:** se indexan las referencias `/F1 12 0 R` para saber qué objeto de fuente corresponde a cada
   nombre usado por `Tf`.
6. **Contenido:** se tokeniza con una expresión regular que reconoce `/(F1) 12 Tf`, `(texto) Tj`,
   `[ (a) -10 (b) ] TJ`, `<hex> Tj`, `T*`, `Td/TD` (salto de línea) y `BT/ET`. Cada cadena se decodifica
   con el mapa vigente; si es hexadecimal de 2 bytes y hay mapa, se interpretan códigos de 16 bits
   (Identity-H); si no hay mapa, se usa latin1 con escapes PDF resueltos (`\n`, `\(`, octal…).

**Resultado:** `{texto, paginas, fuentes}`. Se descartan objetos `/Font`, `/XObject` y `/Metadata`.

**Límites declarados:** PDF escaneado (imagen) no tiene texto → se avisa y se puede adjuntar como imagen;
PDF con fuentes sin `ToUnicode` puede devolver texto parcial.

## 6. Texto, CSV, JSON e imágenes

- **Texto/CSV/MD:** se usa tal cual para buscar evidencias y datos.
- **JSON:** si contiene `nodos`, se importa como escena (permite el ciclo exportar → volver a cargar). Si no,
  se trata como documento.
- **Imágenes:** se guardan como *data URL* (máximo 8 MB para vista previa) y aparecen en la galería de
  *Evidencias*. No se hace OCR (fuera de alcance, documentado).

## 7. Análisis de documentos

`analizarDocumento(texto, fuente)` extrae, con contexto de ±90 caracteres:

| Dato | Expresión |
|---|---|
| IPv4 | `\b(25[0-5]\|2[0-4]\d\|1\d\d\|[1-9]?\d)(\.…){3}\b` |
| VLAN | `\bVLAN\s*#?\s*(\d{1,4})\b` |
| Red CIDR | IPv4 + `/(3[0-2]\|[12]?\d)` |
| Host | `algo.local\|lan\|corp\|internal\|edu\|com…` |

**Evidencias por nodo** (`evidenciasDe`): busca la etiqueta del nodo y su IP en cada documento y devuelve
hasta 6 citas con el nombre del archivo. La interfaz las muestra con el término resaltado. Es la trazabilidad
que exige el enunciado: cada dispositivo se puede justificar con el párrafo que lo menciona.

## 8. Mapeo a 3D

`aEscena(grafo)`:

1. Calcula la caja del grafo (nodos y zonas).
2. `escala = max(ancho, alto) / 24` → el lado mayor del mundo mide ~24 unidades, sea cual sea el tamaño del
   dibujo (un `.drawio` de 400×300 o de 4000×3000 se ve igual).
3. Centra en el origen y convierte: `x = (gx − cx)/escala`, `z = (gy − cy)/escala`.
4. La altura **no** viene del dibujo: la impone el motor por tipo de dispositivo (`ALTURA_TIPO`), de modo que
   el perímetro quede arriba y los extremos abajo.
5. Las zonas del grafo se convierten en losas de suelo con su nombre.
6. Se limita a 260 nodos para no degradar la interacción (los demás se ignoran con aviso en el informe de
   fuentes).

## 9. Escena de inventario (sin `.drawio`)

Si no hay topología pero sí ≥ 2 IP documentadas:

- una **zona por /24** (hasta 40 IPs únicas), en rejilla de 3 columnas;
- un nodo por IP, con la fuente en el subtítulo;
- **sin enlaces**, porque el documento no los declara;
- aviso explícito en la interfaz y en `avisos`.

Es la forma honesta de dar algo útil con solo documentos, sin inventar conectividad.

## 10. Pruebas del flujo

`tests/ingesta.test.mjs` genera en el momento (nada de binarios en el repositorio):

- `.drawio` plano con zona, etiquetas HTML, IP y flecha inválida,
- el mismo `.drawio` comprimido (base64 + deflate + escape),
- un `.docx` real (ZIP escrito a mano con Deflate),
- un PDF real con stream `FlateDecode` y CMap `ToUnicode` (Identity-H),
- un `.txt` con IPs/VLANs y un `.json` exportado.

Comprueba nodos, enlaces, zonas, coordenadas relativas, normalización, textos extraídos, inventario,
evidencias y reimportación. Resultado actual: **10/10**.
