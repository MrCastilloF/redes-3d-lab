# Despliegue en GitHub Pages

Cada aplicación se publica como **sitio estático puro**: `index.html` + `.nojekyll` + README. No hay
compilación en el servidor ni variables de entorno.

## 1. Estado real de la publicación (verificado el 2026-11-09)

| Repositorio | Aplicación | Pages | Último despliegue | `index.html` servido |
|---|---|---|---|---|
| `MrCastilloF/explorador-redes-3d` | https://mrcastillof.github.io/explorador-redes-3d/ | **GitHub Actions** (`build_type=workflow`) | ✓ success | 156 KB · sha256 `7867548cac6ab72d…` **idéntico al build local** |
| `MrCastilloF/lab-redes-3d` | https://mrcastillof.github.io/lab-redes-3d/ | **GitHub Actions** (`build_type=workflow`) | ✓ success | 155,9 KB · sha256 `b1dc808c35ed3567…` **idéntico al build local** |

Cómo se llegó ahí, por si hay que repetirlo:

1. Repositorios creados por API (`POST /user/repos`) y contenido publicado con `git push`.
2. El primer modo de Pages fue *legacy* (rama `main`, carpeta `/`), que funciona sin permisos de Actions.
3. Para pasar a **GitHub Actions** hay que **recrear** la configuración: `PATCH /repos/{o}/{r}/pages` con
   `build_type=workflow` devuelve 404. La secuencia que sí funciona es
   `DELETE /repos/{o}/{r}/pages` → `POST /repos/{o}/{r}/pages {"build_type":"workflow"}` →
   `POST /repos/{o}/{r}/actions/workflows/pages.yml/dispatches {"ref":"main"}`.
4. Comprobación final: `sha256` del archivo servido igual al del build local (no hay transformación de Jekyll
   ni de `git`), `Content-Type: text/html`, y captura headless del sitio en vivo.

Permisos que necesita un token *fine-grained* para hacer todo esto de una vez:
**Contents: RW** (push) · **Workflows: RW** (publicar `.github/workflows/pages.yml`) ·
**Pages: RW** (activar y recrear Pages) · **Actions: RW** (lanzar el despliegue) ·
**Administration: RW** (crear repositorios).

> Con un token sin `Workflows` el push se rechaza con
> *«refusing to allow a Personal Access Token to create or update workflow»*; sin `Pages` la activación
> responde 403 y sin `Actions` el `dispatch` responde 403. La publicación por rama (opción B) no necesita
> ninguno de los tres.

## 2. Publicar (opción A: GitHub Actions, recomendada)

```bash
cd apps/explorador-redes-3d
git init -b main
git add .
git commit -m "feat: explorador de redes 3D autocontenido"
# crea el repositorio en tu cuenta (una de las dos formas)
gh repo create MrCastilloF/explorador-redes-3d --public --source=. --push
#   o: crea el repo vacío en la web y luego
#   git remote add origin https://github.com/MrCastilloF/explorador-redes-3d.git
#   git push -u origin main
```

Después, en GitHub:

1. **Settings → Pages → Source: GitHub Actions**.
2. El workflow incluido (`.github/workflows/pages.yml`) se dispara con el `push` a `main`.
3. **Actions → Publicar en GitHub Pages** debe terminar en verde; la URL aparece en el job `desplegar`.

Con CLI, sin pasar por la interfaz:

```bash
gh api -X POST repos/MrCastilloF/explorador-redes-3d/pages -f build_type=workflow
gh run watch
```

Repite con `apps/lab-redes-3d` para la segunda aplicación.

URLs esperadas:

- https://mrcastillof.github.io/explorador-redes-3d/
- https://mrcastillof.github.io/lab-redes-3d/

## 3. Publicar (opción B: rama y carpeta)

**Settings → Pages → Source: Deploy from a branch → Branch: `main` → Folder: `/ (root)` → Save.**

Funciona porque `index.html` ya está construido en la raíz. `.nojekyll` evita que Jekyll procese el sitio
(y que ignore archivos que empiezan por `_`).

## 4. Comprobación posterior

```bash
# 1. el sitio responde
curl -I https://mrcastillof.github.io/explorador-redes-3d/
# 2. el HTML es el construido (mismo sha256 que build-info.json)
curl -s https://mrcastillof.github.io/explorador-redes-3d/ | sha256sum
```

En local, antes de publicar:

```bash
node scripts/build.mjs        # regenera apps/*
node scripts/verify.mjs       # autocontenido, accesibilidad, tamaño
node tests/smoke.mjs          # 14 comprobaciones en navegador real
```

## 5. Actualizar una aplicación

```bash
# en el skill
node scripts/build.mjs lab
cd apps/lab-redes-3d
git add index.html README.md && git commit -m "feat: ..." && git push
```

El workflow republica automáticamente. Pages tarda entre 30 s y 2 min; si el navegador muestra la versión
anterior, fuerza recarga (`Ctrl+F5`) o espera al *cache busting* de Pages.

## 6. Problemas típicos

| Síntoma | Causa | Solución |
|---|---|---|
| 404 en la raíz | Source mal configurado o carpeta distinta de `/ (root)` | Revisar *Settings → Pages* |
| Se descarga el HTML en vez de mostrarse | *Content-Type* incorrecto por Jekyll | Añadir `.nojekyll` (ya incluido) |
| El workflow falla con `Resource not accessible by integration` | Permisos de Pages | *Settings → Actions → General → Workflow permissions* → *Read and write* + *Allow GitHub Actions to create and approve pull requests*; y *Pages → Source: GitHub Actions* |
| CSS/JS sin aplicar | Se publicó una versión antigua | Verificar `sha256` del `index.html` publicado |
| Dominio propio | — | Añadir `CNAME` con el dominio y configurar el DNS; Pages emite el certificado |

## 7. Qué NO se publica

- `node_modules` (no existe: el proyecto no tiene dependencias).
- Los archivos de `assets/` y `scripts/` (se quedan en el repositorio del skill, no en el de la app).
- Datos de usuarios: los insumos que se cargan en el Lab **nunca salen del navegador**; no hay subida,
  ni analítica, ni cookies.
