# Lab de Redes 3D · del archivo al escenario navegable

Aplicación web que **convierte tus archivos en un laboratorio de redes 3D navegable**. Se abre como un
único `index.html`, funciona sin servidor y **procesa todo en el navegador**: ningún archivo se sube a
ninguna parte.

- **Sitio publicado:** https://mrcastillof.github.io/lab-redes-3d/
- **Aplicación hermana:** https://mrcastillof.github.io/explorador-redes-3d/

## Qué acepta

| Insumo | Qué se hace con él |
|---|---|
| `.drawio` / `.xml` de diagrams.net | **Topología**: cada forma es un dispositivo, cada flecha un enlace, cada contenedor (swimlane) una zona. Admite XML plano y el formato comprimido (base64 + deflate). Una escena por página. |
| `.pdf` | Texto (streams `FlateDecode` + mapas `ToUnicode`) → evidencias, IPs, VLANs y redes. |
| `.docx` | Texto de `word/document.xml` → evidencias y datos. |
| `.txt` `.md` `.csv` `.json` | Texto; un `.json` con `{nodos, enlaces}` se reimporta como escena. |
| Imágenes (`.png` `.jpg` `.webp` `.svg`) | Evidencia visual adjunta al laboratorio. |

Sin `.drawio` y con direcciones IP documentadas, la aplicación genera una **escena de inventario**
(una zona por subred) y lo indica explícitamente: no inventa enlaces que el documento no declare.

## Cómo se usa

1. Pulsa **Cargar** (o arrastra archivos sobre el lienzo / la zona de la pestaña *Insumos*).
2. La pestaña **Insumos** muestra qué se hizo con cada archivo y las escenas detectadas.
3. La pestaña **Evidencias** reúne IPs, VLANs, redes y el texto extraído, con su contexto.
4. En **Escenario**, haz clic en un nodo para ver su ficha y **las citas de los documentos que lo mencionan**.
5. En el panel derecho, elige origen y destino y pulsa **Trazar ruta** para animar el paquete por la topología.
6. **Exportar** descarga la escena como JSON; ese JSON se puede volver a cargar en esta misma aplicación.

Atajos: `Ctrl/⌘+O` abrir archivos · `Esc` cerrar la ficha · arrastrar = orbitar · rueda = zoom ·
doble clic = enfocar · flechas = girar · `+`/`−` = acercar.

## Estructura del repositorio

```
.
├─ index.html                 ← aplicación completa (autocontenida)
├─ .nojekyll                  ← evita el procesado de Jekyll en GitHub Pages
├─ README.md
└─ .github/workflows/pages.yml
```

## Límites conocidos (declarados, no ocultos)

- **PDF escaneado** (sin capa de texto) no se puede leer: requeriría OCR, que queda fuera del alcance.
  Se puede adjuntar como imagen.
- **PDF con fuentes sin `ToUnicode`** puede devolver texto parcial; los generados por Word/LaTeX
  (que sí incluyen ese mapa) funcionan.
- **`.doc` antiguo** y **hojas de cálculo** no se interpretan: se avisa en la pestaña Insumos.
- El texto se usa como **evidencia**: la topología siempre proviene del `.drawio` (o del inventario de IPs).

## Publicar en GitHub Pages

Igual que en la aplicación hermana: *Settings → Pages → Source: GitHub Actions* (el workflow incluido
publica en cada `push` a `main`), o bien *Deploy from a branch* con la carpeta `/ (root)`.

## Créditos

Diseño, motor 3D, códecs (inflate/ZIP), parsers y flujo de ingesta: skill `redes-3d-lab`.
