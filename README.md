# `redes-3d-lab`

Skill instalable para **construir, mejorar, verificar y publicar aplicaciones de redes en 3D
autocontenidas**: un solo `index.html`, sin backend, sin dependencias y desplegable en GitHub Pages.

Nace de dos encargos concretos:

1. una versión 3D de alto impacto visual del explorador de redes dellabs_redes_test
   ([versión anterior](https://mrcastillof.github.io/explorador-de-redes/3d.html));
2. una aplicación nueva que convierta `.drawio`, PDF, Word, texto e imágenes en un escenario 3D navegable.

## Aplicaciones publicadas

| Aplicación | En vivo | Repositorio |
|---|---|---|
| Explorador de Redes 3D | **https://mrcastillof.github.io/explorador-redes-3d/** | https://github.com/MrCastilloF/explorador-redes-3d |
| Lab de Redes 3D | **https://mrcastillof.github.io/lab-redes-3d/** | https://github.com/MrCastilloF/lab-redes-3d |

Ambas con Pages en modo **GitHub Actions** y el HTML servido idéntico byte a byte al build local
(`sha256` comprobado).

## Qué contiene

| Aplicación | Repo destino | Contenido |
|---|---|---|
| **Explorador de Redes 3D** | `explorador-redes-3d` | 5 pestañas (topología 3D, direccionamiento, protocolos, simulación, glosario), 4 escenarios, 9 VLANs, 16 protocolos |
| **Lab de Redes 3D** | `lab-redes-3d` | Ingesta de `.drawio`/`.pdf`/`.docx`/texto/JSON/imágenes, escena 3D con zonas, evidencias citadas y simulación |

Y por dentro: motor 3D propio en SVG, códecs DEFLATE/ZIP, parsers de `.drawio` (XML y comprimido), `.docx` y
PDF, pruebas automatizadas (58 comprobaciones) y despliegue preparado.

## Instalación

El harness carga los skills desde `~/.dsh/skills/`. Basta copiar la carpeta:

```powershell
# Windows (PowerShell)
Copy-Item .\redes-3d-lab $env:USERPROFILE\.dsh\skills\redes-3d-lab -Recurse
```

```bash
# Linux / macOS
cp -r ./redes-3d-lab ~/.dsh/skills/redes-3d-lab
```

Abre una sesión nueva: `redes-3d-lab` aparecerá en el catálogo de skills y se activará solo cuando la
petición encaje con su descripción, o cuando se invoque por nombre.

## Arranque rápido

```bash
cd redes-3d-lab
node scripts/build.mjs         # → apps/explorador-redes-3d/index.html y apps/lab-redes-3d/index.html
node scripts/verify.mjs        # comprueba autocontenido, accesibilidad, tamaño y completitud
node tests/smoke.mjs           # 14 comprobaciones en Chrome/Edge headless (si están instalados)
```

Abre `apps/lab-redes-3d/index.html` con doble clic: ya trae un escenario de ejemplo y un documento para que
veas el flujo completo sin cargar nada.

## Estructura

```
redes-3d-lab/
├─ SKILL.md · skill.json · README.md
├─ scripts/   build.mjs · verify.mjs · scaffold.mjs
├─ assets/    core/ · theme/ · app-explorador/ · app-labs/ · deploy/
├─ tests/     codec.test.mjs · ingesta.test.mjs · smoke.mjs
├─ examples/  ejemplo-campus.drawio · ejemplo-comprimido.drawio · informe-ejemplo.txt
└─ docs/      00-arquitectura … 07-manual-uso
```

## Requisitos

- **Node 18+** para construir y probar (sin `npm install`: cero dependencias).
- Un navegador moderno para usar las aplicaciones.
- Opcional: Chrome o Edge para `tests/smoke.mjs`.

## Verificación

```
tests/codec.test.mjs      34/34   inflate, zlib, ZIP
tests/ingesta.test.mjs    10/10   .drawio (plano y comprimido), .docx, .pdf, inventario, evidencias, JSON
tests/smoke.mjs           14/14   navegador real: arranque sin errores e invariantes del DOM
scripts/verify.mjs        24/24   sin recursos externos, sin BOM, a11y, tamaño, workflow, skill completo
```

## Documentación

| Documento | Contenido |
|---|---|
| [docs/00-arquitectura.md](docs/00-arquitectura.md) | Capas, cámara, canal de dibujo, encuadre, contratos de datos |
| [docs/01-repositorios.md](docs/01-repositorios.md) | Estructura de los tres repositorios y convenciones |
| [docs/02-flujo-insumos.md](docs/02-flujo-insumos.md) | `.drawio`/`.docx`/`.pdf` paso a paso y mapeo a 3D |
| [docs/03-tecnologias.md](docs/03-tecnologias.md) | Decisiones y alternativas descartadas (SVG vs WebGL, parsers propios, React) |
| [docs/04-despliegue-github-pages.md](docs/04-despliegue-github-pages.md) | Publicación, verificación y problemas típicos |
| [docs/05-criterios-aceptacion.md](docs/05-criterios-aceptacion.md) | Criterios de la versión 1, uno por uno |
| [docs/06-informe-ejecutivo.md](docs/06-informe-ejecutivo.md) | Informe ejecutivo, supuestos y limitaciones |
| [docs/07-manual-uso.md](docs/07-manual-uso.md) | Manual de usuario y de administración |

## Licencia

MIT. El modelo de datos y los textos de red pertenecen a la labs_redes_test.
