/* =====================================================================================================
   motor3d.js — Motor de visualización 3D en SVG, sin dependencias externas.
   Proyección perspectiva real (cámara orbital), orden de pintado por profundidad, tarjetas
   billboard, enlaces en arco, sombras de suelo, niebla por distancia y paquetes animados.

   Espacio de coordenadas: X derecha, Y arriba (suelo en y=0), Z hacia el fondo.
   API pública:  R3.Motor3D
   ===================================================================================================== */
(function (R3) {
  "use strict";

  /* ---------------------------------------------------------------- utilidades */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n) => (Math.round(n * 100) / 100).toString();

  const ICONOS = {
    nube: `<g transform="scale(1.7) translate(-12,-12)"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4a7.48 7.48 0 0 0-6.63 4.04A5.99 5.99 0 0 0 6 20h13a5 5 0 0 0 0-10z"/></g>`,
    router: `<circle cx="0" cy="0" r="15"/><path d="M-8 -5h11m-3.5-3.5 3.5 3.5-3.5 3.5"/><path d="M8 5H-3m3.5-3.5L-3 5l3.5 3.5"/>`,
    firewall: `<path d="M0 -16 14 -10v8c0 8-5.6 13.4-14 16.5C-8.4 11.4-14 6-14-2v-8z"/><path d="M-10 -3h20M-10 4h20"/><path d="M-4 -9.5v6.5M4 -3v6.5M-4 4v6"/>`,
    switch: `<rect x="-17" y="-11" width="34" height="22" rx="4"/><path d="M-11 -4.5h11m-3.5-3.5 3.5 3.5-3.5 3.5"/><path d="M11 4.5H0m3.5-3.5L0 4.5l3.5 3.5"/>`,
    servidor: `<rect x="-15" y="-16" width="30" height="14" rx="3"/><rect x="-15" y="2" width="30" height="14" rx="3"/><path d="M-9 -9h7M-9 9h7"/><circle cx="8" cy="-9" r="1.7"/><circle cx="8" cy="9" r="1.7"/>`,
    ap: `<path d="M-15 -3a20 20 0 0 1 30 0"/><path d="M-9 3a12 12 0 0 1 18 0"/><circle cx="0" cy="10" r="2.6"/>`,
    pc: `<rect x="-16" y="-14" width="32" height="22" rx="3"/><path d="M-6 16h12M0 8v8"/><path d="M-10 -6h11"/>`,
    portatil: `<rect x="-15" y="-13" width="30" height="20" rx="2"/><path d="M-19 10h38l-3.5 4h-31z"/><path d="M-8 -6h11"/>`,
    telefono: `<rect x="-10" y="-3" width="20" height="16" rx="3"/><path d="M-13 -10a13 7 0 0 1 26 0"/><path d="M-4 2h2M2 2h2M-4 7h2M2 7h2"/>`,
    camara: `<path d="M-13 4a13 13 0 0 1 26 0"/><path d="M-17 4h34"/><circle cx="0" cy="0" r="3.4"/><path d="M0 4v6M-6 11h12"/>`,
    nvr: `<rect x="-16" y="-10" width="32" height="20" rx="4"/><circle cx="-8" cy="0" r="3.4"/><path d="M0 -5h10M0 0h10M0 5h6"/>`,
    alerta: `<path d="M0 -15 15 12H-15z"/><path d="M0 -5v8M0 6.5v1.5"/>`,
    documento: `<path d="M-11 -15h14l8 8v22H-11z"/><path d="M3 -15v8h8"/><path d="M-6 -2h09M-6 4h12M-6 10h7"/>`,
    persona: `<circle cx="0" cy="-8" r="6"/><path d="M-11 14c0-7 4.5-11 11-11s11 4 11 11"/>`,
    desconocido: `<path d="M0 -14 13 -7v14L0 14-13 7v-14z"/><path d="M0 -4v5M0 4.5v1.5"/>`
  };

  /* Elevación por tipo de dispositivo (unidades de mundo). Mantiene la lectura por capas. */
  const ALTURA_TIPO = {
    nube: 3.4, firewall: 2.5, router: 2.3, switch: 1.75, servidor: 2.0, nvr: 1.35,
    ap: 1.6, camara: 1.25, pc: 0.95, portatil: 0.95, telefono: 1.05, documento: 1.1,
    persona: 0.9, desconocido: 1.2, alerta: 2.0
  };

  /* ------------------------------------------------------------------ cámara */
  class Camara {
    constructor() {
      this.target = { x: 0, y: 1.4, z: 0 };
      this.yaw = -0.62;
      this.pitch = 0.55;
      this.dist = 26;
      this.fov = 42;
      this.w = 1600;
      this.h = 900;
      this.minDist = 6;
      this.maxDist = 90;
    }
    eye() {
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      return {
        x: this.target.x + this.dist * cp * Math.cos(this.yaw),
        y: this.target.y + this.dist * sp,
        z: this.target.z + this.dist * cp * Math.sin(this.yaw)
      };
    }
    base() {
      const e = this.eye();
      let f = { x: this.target.x - e.x, y: this.target.y - e.y, z: this.target.z - e.z };
      const fl = Math.hypot(f.x, f.y, f.z) || 1;
      f = { x: f.x / fl, y: f.y / fl, z: f.z / fl };
      const up = { x: 0, y: 1, z: 0 };
      let r = {
        x: f.y * up.z - f.z * up.y,
        y: f.z * up.x - f.x * up.z,
        z: f.x * up.y - f.y * up.x
      };
      const rl = Math.hypot(r.x, r.y, r.z) || 1;
      r = { x: r.x / rl, y: r.y / rl, z: r.z / rl };
      const u = {
        x: r.y * f.z - r.z * f.y,
        y: r.z * f.x - r.x * f.z,
        z: r.x * f.y - r.y * f.x
      };
      return { eye: e, f, r, u };
    }
    focal() { return (this.h / 2) / Math.tan((this.fov * Math.PI / 180) / 2); }
    /* p → {x, y, s, d} en píxeles del viewBox; null si queda detrás de la cámara */
    proyectar(p, B) {
      B = B || this.base();
      const vx = p.x - B.eye.x, vy = p.y - B.eye.y, vz = p.z - B.eye.z;
      const zc = vx * B.f.x + vy * B.f.y + vz * B.f.z;
      if (zc <= 0.35) return null;
      const xc = vx * B.r.x + vy * B.r.y + vz * B.r.z;
      const yc = vx * B.u.x + vy * B.u.y + vz * B.u.z;
      const F = this.focal();
      return { x: this.w / 2 + (xc / zc) * F, y: this.h / 2 - (yc / zc) * F, s: F / zc, d: zc };
    }
    /* Desplaza el objetivo en el plano de la pantalla (paneo) */
    panear(dx, dy, B) {
      B = B || this.base();
      const k = (this.dist / this.focal()) * 1.0;
      this.target.x += (-dx * B.r.x + dy * B.u.x) * k;
      this.target.y += (-dx * B.r.y + dy * B.u.y) * k;
      this.target.z += (-dx * B.r.z + dy * B.u.z) * k;
      this.target.y = clamp(this.target.y, 0.4, 14);
    }
    orbitar(dYaw, dPitch) {
      this.yaw += dYaw;
      this.pitch = clamp(this.pitch + dPitch, 0.05, 1.42);
    }
    acercar(f) { this.dist = clamp(this.dist * f, this.minDist, this.maxDist); }
    encuadrar(bounds, margen) {
      const m = margen == null ? 1.16 : margen;
      this.target = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: clamp((bounds.minY + bounds.maxY) / 2, 0.8, 6),
        z: (bounds.minZ + bounds.maxZ) / 2
      };
      const span = Math.max(
        bounds.maxX - bounds.minX,
        bounds.maxZ - bounds.minZ,
        (bounds.maxY - bounds.minY) * 1.6,
        6
      ) + 3.2;
      const F = this.focal();
      this.dist = clamp((span * F) / (Math.min(this.w, this.h) * 1.35) * m + 4, this.minDist, this.maxDist);
    }
  }

  /* --------------------------------------------------------------- renderer */
  class Motor3D {
    constructor(svg, opts) {
      opts = opts || {};
      this.svg = svg;
      this.opts = opts;
      this.cam = new Camara();
      this.datos = { nodos: [], enlaces: [], zonas: [] };
      this.porId = new Map();
      this.enlacesDe = new Map();
      this.sel = null;                  // { tipo, id }
      this.hover = null;
      this.hl = { nodos: new Set(), enlaces: new Set() };
      this.trafico = true;
      this.autorotar = false;
      this.reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.paquetes = [];
      this.flujo = null;
      this._raf = 0;
      this._ultimo = 0;
      this._anim = null;
      this._arrastre = null;
      this._punt = new Map();
      this._pinza = null;
      this._suelo = null;
      this.zonaSegura = { arriba: 0, abajo: 0, izq: 0, der: 0 };  // px reservados por el HUD

      // Crea las capas de dibujo SIN destruir el <defs> del documento (gradientes y filtros).
      const NS = "http://www.w3.org/2000/svg";
      Array.from(svg.querySelectorAll("g[data-m3]")).forEach((g) => g.remove());
      const capa = (nombre) => {
        const g = document.createElementNS(NS, "g");
        g.setAttribute("data-m3", nombre);
        g.setAttribute("class", "m3-" + nombre);
        svg.appendChild(g);
        return g;
      };
      this.capas = {
        suelo: capa("suelo"),
        zonas: capa("zonas"),
        enlaces: capa("enlaces"),
        sombras: capa("sombras"),
        nodos: capa("nodos"),
        etiquetas: capa("etiquetas"),
        paquetes: capa("paquetes")
      };
      this._medir();
      this._eventos();
      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(() => {
          if (this._roPend) return;
          this._roPend = requestAnimationFrame(() => {
            this._roPend = 0;
            if (!this._medir()) return;
            if (this._auto) this.encuadrar(); else this.render();
          });
        });
        this._ro.observe(svg);
      }
    }

    _medir() {
      const r = this.svg.getBoundingClientRect();
      const w = Math.max(320, Math.round(r.width || 1200));
      const h = Math.max(260, Math.round(r.height || 700));
      const cambio = w !== this.cam.w || h !== this.cam.h;
      this.cam.w = w;
      this.cam.h = h;
      this.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      return cambio;
    }

    /* ---------------------------------------------------------- datos / estado */
    setDatos(d) {
      this.datos = {
        nodos: (d.nodos || []).map((n) => ({ ...n })),
        enlaces: (d.enlaces || []).map((l) => ({ ...l })),
        zonas: (d.zonas || []).map((z) => ({ ...z }))
      };
      this.porId = new Map(this.datos.nodos.map((n) => [n.id, n]));
      this.enlacesDe = new Map();
      for (const l of this.datos.enlaces) {
        if (!this.enlacesDe.has(l.a)) this.enlacesDe.set(l.a, []);
        if (!this.enlacesDe.has(l.b)) this.enlacesDe.set(l.b, []);
        this.enlacesDe.get(l.a).push(l);
        this.enlacesDe.get(l.b).push(l);
      }
      this.hl = { nodos: new Set(), enlaces: new Set() };
      return this;
    }

    pos(n) {
      const h = n.h != null ? n.h : (ALTURA_TIPO[n.tipo] != null ? ALTURA_TIPO[n.tipo] : 1.2);
      return { x: n.x || 0, y: h, z: n.z || 0 };
    }

    limites() {
      const b = { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9, minZ: 1e9, maxZ: -1e9 };
      for (const n of this.datos.nodos) {
        const p = this.pos(n);
        b.minX = Math.min(b.minX, p.x); b.maxX = Math.max(b.maxX, p.x);
        b.minY = Math.min(b.minY, 0); b.maxY = Math.max(b.maxY, p.y);
        b.minZ = Math.min(b.minZ, p.z); b.maxZ = Math.max(b.maxZ, p.z);
      }
      if (b.minX > b.maxX) return { minX: -6, maxX: 6, minY: 0, maxY: 3, minZ: -6, maxZ: 6 };
      return b;
    }

    /* Encuadre real en espacio de pantalla: mide la caja de todas las tarjetas y ajusta la distancia
       hasta que quepan con margen; después centra el contenido en el lienzo. */
    encuadrar(margen) {
      const m = margen == null ? 1 : margen;
      const cam = this.cam;
      const b = this.limites();
      cam.target = {
        x: (b.minX + b.maxX) / 2,
        y: clamp(b.maxY * 0.6, 0.9, 3),
        z: (b.minZ + b.maxZ) / 2
      };
      const anclas = this.datos.nodos.map((n) => ({ p: this.pos(n), hw: 73, hh: 30 }));
      const medir = () => {
        const B = cam.base();
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, ok = true;
        const ref = cam.focal() / cam.dist;
        for (const a of anclas) {
          const q = cam.proyectar(a.p, B);
          if (!q) { ok = false; break; }
          const k = clamp(q.s / ref, 0.5, 1.35);
          x0 = Math.min(x0, q.x - a.hw * k); x1 = Math.max(x1, q.x + a.hw * k);
          y0 = Math.min(y0, q.y - a.hh * k); y1 = Math.max(y1, q.y + a.hh * k + 14);
        }
        return { ok, x0, x1, y0, y1 };
      };
      const z = this.zonaSegura || { arriba: 0, abajo: 0, izq: 0, der: 0 };
      const utilW = Math.max(120, cam.w - (z.izq || 0) - (z.der || 0));
      const utilH = Math.max(120, cam.h - (z.arriba || 0) - (z.abajo || 0));
      for (let i = 0; i < 8; i++) {
        const r = medir();
        if (!r.ok) { cam.dist = clamp(cam.dist * 1.45, cam.minDist, cam.maxDist); continue; }
        const fw = (utilW * 0.95) / Math.max(1, r.x1 - r.x0);
        const fh = (utilH * 0.95) / Math.max(1, r.y1 - r.y0);
        const f = Math.min(fw, fh) * m;
        if (Math.abs(f - 1) < 0.025) break;
        cam.dist = clamp(cam.dist / f, cam.minDist, cam.maxDist);
      }
      const r = medir();
      if (r.ok) {
        const cx = (z.izq || 0) + utilW / 2;
        const cy = (z.arriba || 0) + utilH / 2;
        cam.panear(-((r.x0 + r.x1) / 2 - cx), -((r.y0 + r.y1) / 2 - cy));
      }
      this._auto = true;
      this.render();
      return this;
    }

    irA(cam, ms) {
      const destino = { target: { ...this.cam.target }, yaw: this.cam.yaw, pitch: this.cam.pitch, dist: this.cam.dist, ...cam };
      if (this.reducir || !ms) {
        Object.assign(this.cam, destino);
        this.render();
        return this;
      }
      const desde = { target: { ...this.cam.target }, yaw: this.cam.yaw, pitch: this.cam.pitch, dist: this.cam.dist };
      this._anim = { desde, destino, t0: performance.now(), ms };
      this._bucle();
      return this;
    }

    preset(nombre) {
      const p = {
        iso: { yaw: -0.62, pitch: 0.55 },
        frontal: { yaw: -0.06, pitch: 0.10 },
        cenital: { yaw: -0.72, pitch: 1.30 },
        lateral: { yaw: -1.57, pitch: 0.30 }
      }[nombre];
      if (p) this.irA(p, 620);
      return this;
    }

    enfocar(id) {
      const n = this.porId.get(id);
      if (!n) return this;
      const p = this.pos(n);
      this.irA({ target: p, dist: clamp(this.cam.dist * 0.62, 8, 34) }, 560);
      return this;
    }

    seleccionar(tipo, id) { this.sel = id ? { tipo, id } : null; this.render(); return this; }

    resaltar(nodos, enlaces) {
      this.hl = {
        nodos: new Set(nodos || []),
        enlaces: new Set(enlaces || [])
      };
      this.render();
      return this;
    }

    /* Flujo animado por una secuencia de nodos [a,b,c,…] */
    setFlujo(ids, opciones) {
      opciones = opciones || {};
      const segs = [];
      for (let i = 0; i < (ids || []).length - 1; i++) {
        const A = this.porId.get(ids[i]), B = this.porId.get(ids[i + 1]);
        if (A && B) segs.push({ a: this.pos(A), b: this.pos(B), ida: ids[i], idb: ids[i + 1] });
      }
      this.flujo = segs.length ? { segs, color: opciones.color || "#38bdf8", vel: opciones.velocidad || 1.5, etiqueta: opciones.etiqueta || "" } : null;
      this.paquetes = [];
      if (this.flujo) {
        for (let i = 0; i < segs.length; i++) {
          this.paquetes.push({ seg: i, u: -i * 0.42, color: this.flujo.color, r: 5 });
        }
      }
      this._bucle();
      return this;
    }

    limpiarFlujo() { this.flujo = null; this.paquetes = []; this.capas.paquetes.innerHTML = ""; return this; }

    setTrafico(on) { this.trafico = !!on; return this; }
    setAutorotar(on) { this.autorotar = !!on; if (on) this._bucle(); return this; }

    /* ------------------------------------------------------------------ render */
    render() {
      if (!this.capas) return this;
      const B = this.cam.base();
      const cam = this.cam;
      this._suelo = this._renderSuelo(B);
      this.capas.suelo.innerHTML = this._suelo;
      this.capas.zonas.innerHTML = this._renderZonas(B);

      const piezas = [];
      const nodosP = new Map();

      for (const n of this.datos.nodos) {
        const p = cam.proyectar(this.pos(n), B);
        if (!p) continue;
        nodosP.set(n.id, p);
        piezas.push({ d: p.d, tipo: "nodo", n, p });
      }
      for (const l of this.datos.enlaces) {
        const A = nodosP.get(l.a), Bp = nodosP.get(l.b);
        if (!A || !Bp) continue;
        piezas.push({ d: (A.d + Bp.d) / 2 + 0.001, tipo: "enlace", l, A, Bp });
      }
      piezas.sort((x, y) => y.d - x.d);

      const enlacesSvg = [], nodosSvg = [], sombrasSvg = [], etiquetasSvg = [];
      const kRef = cam.focal() / Math.max(8, cam.dist);

      /* Colocación de tarjetas en espacio de pantalla: las más cercanas se quedan en su anclaje y las
         demás se desplazan en vertical para no taparse. Cada tarjeta desplazada recibe una línea guía. */
      const cercaPrimero = piezas.filter((q) => q.tipo === "nodo").sort((a, b) => a.d - b.d);
      const ocupados = [];
      const plaza = new Map();
      for (const q of cercaPrimero) {
        const k = this._escala(q.p, kRef, q.n);
        const w = 148 * k, h = 58 * k;
        const sitio = this._colocar(q.p.x, q.p.y, w, h, ocupados);
        ocupados.push(sitio.rect);
        plaza.set(q.n.id, { x: q.p.x + sitio.dx, y: q.p.y + sitio.dy, k, dx: sitio.dx, dy: sitio.dy });
      }

      for (const pieza of piezas) {
        if (pieza.tipo === "enlace") {
          const r = this._renderEnlace(pieza, kRef);
          if (r && r.out) { enlacesSvg.push(r.out); if (r.etiqueta) etiquetasSvg.push(r.etiqueta); }
        } else {
          const s = this._renderNodo(pieza, kRef, B, plaza.get(pieza.n.id));
          if (s) { nodosSvg.push(s.nodo); if (s.sombra) sombrasSvg.push(s.sombra); if (s.etiqueta) etiquetasSvg.push(s.etiqueta); }
        }
      }

      this.capas.enlaces.innerHTML = enlacesSvg.join("");
      this.capas.sombras.innerHTML = sombrasSvg.join("");
      this.capas.nodos.innerHTML = nodosSvg.join("");
      this.capas.etiquetas.innerHTML = etiquetasSvg.join("");
      this._k = kRef;
      this._pantalla = nodosP;
      return this;
    }

    _colorNodo(n) {
      return n.color || (n.estado === "falla" ? "#f43f5e" : "#64748b");
    }

    _renderSuelo(B) {
      const cam = this.cam;
      const lim = this.limites();
      const pad = 9;
      const x0 = Math.floor((lim.minX - pad) / 2) * 2;
      const x1 = Math.ceil((lim.maxX + pad) / 2) * 2;
      const z0 = Math.floor((lim.minZ - pad) / 2) * 2;
      const z1 = Math.ceil((lim.maxZ + pad) / 2) * 2;
      const paso = Math.max(2, Math.round((x1 - x0) / 16));
      let out = "";
      const seg = (a, b, fuerte) => {
        const pa = cam.proyectar(a, B), pb = cam.proyectar(b, B);
        if (!pa || !pb) return "";
        const d = (pa.d + pb.d) / 2;
        const op = clamp(0.36 - d / 165, 0.05, 0.36) * (fuerte ? 1.8 : 1);
        return `<line x1="${num(pa.x)}" y1="${num(pa.y)}" x2="${num(pb.x)}" y2="${num(pb.y)}" stroke="currentColor" stroke-width="${fuerte ? 1.1 : 0.7}" stroke-opacity="${num(op)}"/>`;
      };
      for (let x = x0; x <= x1; x += paso) out += seg({ x, y: 0, z: z0 }, { x, y: 0, z: z1 }, x === 0);
      for (let z = z0; z <= z1; z += paso) out += seg({ x: x0, y: 0, z }, { x: x1, y: 0, z }, z === 0);
      const c = cam.proyectar({ x: (x0 + x1) / 2, y: 0, z: (z0 + z1) / 2 }, B);
      if (c) {
        out = `<ellipse cx="${num(c.x)}" cy="${num(c.y)}" rx="${num((x1 - x0) * c.s * 0.68)}" ry="${num((z1 - z0) * c.s * 0.34)}" fill="url(#gHalos)" opacity="0.85"/>` + out;
      }
      return out;
    }

    _renderZonas(B) {
      if (!this.datos.zonas.length) return "";
      const cam = this.cam;
      let out = "";
      for (const z of this.datos.zonas) {
        const pts = [
          { x: z.x0, y: 0.01, z: z.z0 }, { x: z.x1, y: 0.01, z: z.z0 },
          { x: z.x1, y: 0.01, z: z.z1 }, { x: z.x0, y: 0.01, z: z.z1 }
        ].map((p) => cam.proyectar(p, B)).filter(Boolean);
        if (pts.length < 4) continue;
        const d = pts.reduce((s, p) => s + p.d, 0) / pts.length;
        const op = clamp(0.26 - d / 240, 0.05, 0.26);
        out += `<polygon points="${pts.map((p) => `${num(p.x)},${num(p.y)}`).join(" ")}" fill="${z.color || "#38bdf8"}" fill-opacity="${num(op)}" stroke="${z.color || "#38bdf8"}" stroke-opacity="${num(op * 1.9)}" stroke-width="1" stroke-dasharray="6 5" rx="10"/>`;
        const lab = cam.proyectar({ x: z.x0 + 0.45, y: 0.02, z: z.z0 + 0.45 }, B);
        if (lab && z.nombre) {
          const txt = String(z.nombre).toUpperCase();
          const ancho = Math.min(230, txt.length * 6.6 + 16);
          const opTxt = clamp(op * 4.4, 0.4, 0.96);
          out += `<g opacity="${num(opTxt)}">
            <rect x="${num(lab.x - 4)}" y="${num(lab.y - 15)}" width="${num(ancho)}" height="17" rx="8.5" fill="${z.color || "#38bdf8"}" fill-opacity="0.10" stroke="${z.color || "#38bdf8"}" stroke-opacity="0.35"/>
            <text x="${num(lab.x + 5)}" y="${num(lab.y - 3)}" class="m3-zona-txt">${esc(txt)}</text>
          </g>`;
        }
      }
      return out;
    }

    _arco(A, B, p) {
      const n = Math.max(8, Math.round(Math.hypot(B.x - A.x, B.z - A.z) * 2));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const sag = Math.sin(Math.PI * t) * 0.55;
        pts.push(p({ x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) + sag, z: lerp(A.z, B.z, t) }));
      }
      return pts;
    }

    _renderEnlace(pieza, kRef) {
      const l = pieza.l, A = pieza.A, Bp = pieza.Bp;
      const cam = this.cam, cb = cam.base();
      const sel = this.sel && this.sel.tipo === "enlace" && this.sel.id === l.id;
      const hov = this.hover && this.hover.tipo === "enlace" && this.hover.id === l.id;
      const hl = this.hl.enlaces.has(l.id) || this.hl.nodos.has(l.a) || this.hl.nodos.has(l.b);
      const color = l.color || "#64748b";
      const k = clamp(((A.s + Bp.s) / 2) / kRef, 0.4, 1.5);
      const ancho = clamp((l.grosor || 3.2) * k, 1.1, 8);
      const d = (A.d + Bp.d) / 2;
      const niebla = clamp(1 - (d - 8) / 90, 0.34, 1);
      const fromNodo = this.porId.get(l.a), toNodo = this.porId.get(l.b);
      const pa = cam.proyectar(this.pos(fromNodo), cb), pb = cam.proyectar(this.pos(toNodo), cb);
      const pts = this._arco(this.pos(fromNodo), this.pos(toNodo), (p) => cam.proyectar(p, cb)).filter(Boolean);
      if (pts.length < 2) return "";
      const path = pts.map((p, i) => `${i ? "L" : "M"}${num(p.x)},${num(p.y)}`).join(" ");
      const activo = sel || hov || hl;
      const op = activo ? 0.98 : 0.68 * niebla;
      const dash = l.tipo === "wifi" ? ` stroke-dasharray="2 ${num(7 * k)}"` : (l.tipo === "wan" ? ` stroke-dasharray="${num(14 * k)} ${num(6 * k)}"` : "");
      let out = "";
      if (activo) {
        out += `<path d="${path}" fill="none" stroke="${color}" stroke-width="${num(ancho * 3.4)}" stroke-opacity="0.16" stroke-linecap="round" filter="url(#fGlow)"/>`;
      }
      out += `<path d="${path}" fill="none" stroke="${color}" stroke-width="${num(ancho)}" stroke-opacity="${num(op)}" stroke-linecap="round"${dash}/>`;
      if (l.protocolos && l.protocolos.length && (sel || hov)) {
        out += `<path d="${path}" fill="none" stroke="#f8fafc" stroke-width="${num(ancho * 0.34)}" stroke-opacity="0.5" stroke-dasharray="${num(2 * k)} ${num(5 * k)}"/>`;
      }
      out += `<path class="m3-hit" d="${path}" fill="none" stroke="transparent" pointer-events="stroke" stroke-width="${num(Math.max(16, ancho * 5))}" data-enlace="${esc(l.id)}" data-tipo="enlace"/>`;
      let etiqueta = "";
      if (l.rotulo && (sel || hov || (this.hl.enlaces.has(l.id)))) {
        const m = pts[Math.floor(pts.length / 2)];
        const w = Math.max(52, String(l.rotulo).length * 6.4 + 18);
        etiqueta = `<g class="m3-etq" transform="translate(${num(m.x)},${num(m.y)})">
          <rect x="${num(-w / 2)}" y="-11" width="${num(w)}" height="22" rx="11" fill="var(--panel-2)" stroke="${color}" stroke-opacity="0.65"/>
          <text x="0" y="4" text-anchor="middle" class="m3-etq-txt">${esc(l.rotulo)}</text></g>`;
      }
      return { out, etiqueta };
    }

    _escala(p, kRef, n) {
      return clamp(p.s / kRef, 0.5, 1.3) * ((n && n.escala) || 1);
    }

    /* Busca el primer hueco libre alrededor del anclaje (evita tarjetas superpuestas). */
    _colocar(x, y, w, h, ocupados) {
      const sep = 5;
      const libre = (dx, dy) => {
        const r = { x0: x + dx - w / 2, y0: y + dy - h / 2, x1: x + dx + w / 2, y1: y + dy + h / 2 };
        const choca = ocupados.some((o) => !(r.x1 < o.x0 - sep || r.x0 > o.x1 + sep || r.y1 < o.y0 - sep || r.y0 > o.y1 + sep));
        return choca ? null : r;
      };
      const pY = h * 0.62, pX = w * 0.5;
      const opciones = [[0, 0]];
      for (let i = 1; i <= 9; i++) {
        opciones.push([0, -pY * i], [0, pY * i], [-pX * i * 0.8, -pY * i], [pX * i * 0.8, pY * i],
          [-pX * i * 1.5, 0], [pX * i * 1.5, 0]);
      }
      const w2 = (w || 0) / 2, h2 = (h || 0) / 2;
      for (const [dx0, dy0] of opciones) {
        const dx = clamp(dx0, -x + w2 + 6, this.cam.w - x - w2 - 6);
        const dy = clamp(dy0, -y + h2 + 6, this.cam.h - y - h2 - 6);
        const r = libre(dx, dy);
        if (r) return { dx, dy, rect: r };
      }
      return { dx: 0, dy: 0, rect: { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 } };
    }

    _renderNodo(pieza, kRef, B, plaza) {
      const n = pieza.n, p = pieza.p, cam = this.cam;
      const sel = this.sel && this.sel.tipo === "nodo" && this.sel.id === n.id;
      const hov = this.hover && this.hover.tipo === "nodo" && this.hover.id === n.id;
      const hl = this.hl.nodos.has(n.id);
      const color = this._colorNodo(n);
      const k = plaza ? plaza.k : this._escala(p, kRef, n);
      const cx = plaza ? plaza.x : p.x, cy = plaza ? plaza.y : p.y;
      const dx = cx - p.x, dy = cy - p.y;
      const W = 148, H = 58;
      const d = p.d;
      const niebla = clamp(1 - (d - 8) / 110, 0.46, 1);
      const op = niebla * (sel || hov || hl ? 1 : 0.94);
      const suelo = cam.proyectar({ x: n.x || 0, y: 0, z: n.z || 0 }, B);
      const lineas = this._partir(n.nombre || n.id, 16).slice(0, 2);
      const sub = n.sub || "";
      const icono = ICONOS[n.tipo] || ICONOS.desconocido;
      let sombra = "";
      if (suelo) {
        const ks = clamp(suelo.s / kRef, 0.3, 1.6);
        sombra = `<ellipse cx="${num(suelo.x)}" cy="${num(suelo.y)}" rx="${num(34 * ks)}" ry="${num(11 * ks)}" fill="url(#gSombra)" opacity="${num(0.5 * niebla)}"/>`;
        sombra += `<line x1="${num(suelo.x)}" y1="${num(suelo.y)}" x2="${num(p.x)}" y2="${num(p.y + H * k * 0.46)}" stroke="${color}" stroke-opacity="${num(0.26 * niebla)}" stroke-width="1" stroke-dasharray="3 4"/>`;
      }
      const clase = `m3-n${sel ? " sel" : ""}${hov ? " hov" : ""}${hl ? " hl" : ""}`;
      const xTxt = -W / 2 + 44;
      const yNombre = lineas.length > 1 ? -7 : -1;
      const ySub = lineas.length > 1 ? 19 : 15;
      const guia = Math.hypot(dx, dy) > 2.5
        ? `<line x1="${num(p.x)}" y1="${num(p.y)}" x2="${num(cx)}" y2="${num(cy)}" stroke="${color}" stroke-opacity="${num(0.4 * niebla)}" stroke-width="1" stroke-dasharray="2 3"/>
           <circle cx="${num(p.x)}" cy="${num(p.y)}" r="2.2" fill="${color}" fill-opacity="${num(0.8 * niebla)}"/>`
        : "";
      const nodo = `${guia}<g class="${clase}" data-nodo="${esc(n.id)}" data-tipo="nodo" transform="translate(${num(cx)},${num(cy)}) scale(${num(k)})" opacity="${num(op)}">
        <rect class="m3-cartel" x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="13" fill="url(#gCartel)"/>
        <rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="13" fill="none" stroke="${color}" stroke-opacity="${sel ? 0.95 : (hov ? 0.8 : 0.42)}" stroke-width="${sel ? 2 : 1.2}"/>
        <rect x="${-W / 2 + 0.5}" y="${-H / 2 + 9}" width="3" height="${H - 18}" rx="1.5" fill="${color}"/>
        <g transform="translate(${-W / 2 + 25},0) scale(0.40)" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icono}</g>
        <text class="m3-nombre" x="${xTxt}" y="${yNombre}">${lineas.map((t, i) => `<tspan x="${xTxt}" dy="${i ? 12 : 0}">${esc(t)}</tspan>`).join("")}</text>
        <text class="m3-sub" x="${xTxt}" y="${ySub}">${esc(this._corto(sub, 21))}</text>
        <circle class="m3-led" cx="${W / 2 - 11}" cy="${-H / 2 + 11}" r="3.2" fill="${n.estadoColor || color}"/>
        ${sel ? `<rect x="${-W / 2 - 5}" y="${-H / 2 - 5}" width="${W + 10}" height="${H + 10}" rx="17" fill="none" stroke="${color}" stroke-opacity="0.5" stroke-width="1.4" stroke-dasharray="7 5"/>` : ""}
      </g>`;
      let etiqueta = "";
      if (n.etiqueta && (sel || hov)) {
        const w = Math.max(46, String(n.etiqueta).length * 5.6 + 16);
        etiqueta = `<g class="m3-etq" transform="translate(${num(cx)},${num(cy - H * k * 0.5 - 13)})">
          <rect x="${num(-w / 2)}" y="-10" width="${num(w)}" height="20" rx="10" fill="var(--panel-2)" stroke="${color}" stroke-opacity="0.7"/>
          <text x="0" y="4" text-anchor="middle" class="m3-etq-txt">${esc(n.etiqueta)}</text></g>`;
      }
      return { nodo, sombra, etiqueta };
    }

    _partir(texto, max) {
      const palabras = String(texto).split(/\s+/).filter(Boolean);
      const lineas = [];
      let act = "";
      for (const w of palabras) {
        if ((act + " " + w).trim().length <= max) act = (act + " " + w).trim();
        else { if (act) lineas.push(act); act = w; }
      }
      if (act) lineas.push(act);
      return lineas.length ? lineas : [""];
    }
    _corto(s, max) { s = String(s || ""); return s.length > max ? s.slice(0, max - 1) + "…" : s; }

    /* --------------------------------------------------------------- animación */
    _bucle() {
      if (this._raf) return;
      const paso = (t) => {
        this._raf = requestAnimationFrame(paso);
        const dt = this._ultimo ? Math.min(0.05, (t - this._ultimo) / 1000) : 0.016;
        this._ultimo = t;
        let pintar = false;
        if (this._anim) {
          const a = this._anim;
          const u = clamp((t - a.t0) / a.ms, 0, 1), e = ease(u);
          this.cam.target = {
            x: lerp(a.desde.target.x, a.destino.target.x, e),
            y: lerp(a.desde.target.y, a.destino.target.y, e),
            z: lerp(a.desde.target.z, a.destino.target.z, e)
          };
          this.cam.yaw = lerp(a.desde.yaw, a.destino.yaw, e);
          this.cam.pitch = lerp(a.desde.pitch, a.destino.pitch, e);
          this.cam.dist = lerp(a.desde.dist, a.destino.dist, e);
          pintar = true;
          if (u >= 1) { this._anim = null; this.render(); }
        }
        if (this.autorotar && !this._arrastre && !this._anim) {
          this.cam.yaw += dt * 0.16;
          pintar = true;
        }
        if (pintar) this.render();
        this._animarPaquetes(dt);
        if (!this._anim && !this.autorotar && !this.flujo && !this.trafico) {
          cancelAnimationFrame(this._raf);
          this._raf = 0;
          this._ultimo = 0;
        }
      };
      this._raf = requestAnimationFrame(paso);
    }

    _animarPaquetes(dt) {
      const cam = this.cam, B = cam.base();
      let svg = "";
      if (this.trafico && !this.flujo && this.datos.enlaces.length) {
        for (const l of this.datos.enlaces) {
          if (!l.traficoAmbiente) continue;
          const A = this.porId.get(l.a), Bn = this.porId.get(l.b);
          if (!A || !Bn) continue;
          const u = ((performance.now() / 1000) * 0.22 + (l.fase || 0)) % 1;
          const p = { x: lerp(A.x, Bn.x, u), y: lerp(this.pos(A).y, this.pos(Bn).y, u) + Math.sin(Math.PI * u) * 0.5, z: lerp(A.z, Bn.z, u) };
          const pr = cam.proyectar(p, B);
          if (pr) svg += `<circle cx="${num(pr.x)}" cy="${num(pr.y)}" r="${num(clamp(2.6 * pr.s / (this._k || 20), 1.4, 4))}" fill="#7dd3fc" opacity="0.75"/>`;
        }
      }
      if (this.flujo) {
        const F = this.flujo;
        for (const q of this.paquetes) {
          q.u += dt * F.vel;
          if (q.u > 1) q.u -= 1 + 0.35;
          if (q.u < -0.4) q.u = 1;
          if (q.u < 0) continue;
          const s = F.segs[q.seg];
          if (!s) continue;
          for (let tr = 0; tr < 4; tr++) {
            const uu = q.u - tr * 0.055;
            if (uu < 0) break;
            const p = { x: lerp(s.a.x, s.b.x, uu), y: lerp(s.a.y, s.b.y, uu) + Math.sin(Math.PI * uu) * 0.55, z: lerp(s.a.z, s.b.z, uu) };
            const pr = cam.proyectar(p, B);
            if (!pr) continue;
            const r = clamp((q.r - tr * 1.1) * pr.s / (this._k || 20), 0.8, 6);
            svg += `<circle cx="${num(pr.x)}" cy="${num(pr.y)}" r="${num(Math.max(0.8, r))}" fill="${q.color}" opacity="${num(0.9 - tr * 0.2)}"/>`;
          }
        }
      }
      this.capas.paquetes.innerHTML = svg;
    }

    /* --------------------------------------------------------------- eventos */
    _eventos() {
      const svg = this.svg;
      const punto = (ev) => {
        const r = svg.getBoundingClientRect();
        return { x: ev.clientX - r.left, y: ev.clientY - r.top };
      };
      const objetivo = (ev) => {
        const el = ev.target.closest ? ev.target.closest("[data-nodo],[data-enlace]") : null;
        if (!el) return null;
        if (el.dataset.nodo) return { tipo: "nodo", id: el.dataset.nodo };
        return { tipo: "enlace", id: el.dataset.enlace };
      };

      svg.addEventListener("pointerdown", (ev) => {
        this._auto = false;
        svg.setPointerCapture && svg.setPointerCapture(ev.pointerId);
        this._punt.set(ev.pointerId, punto(ev));
        if (this._punt.size === 2) {
          const v = Array.from(this._punt.values());
          this._pinza = { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y), dist: this.cam.dist };
          return;
        }
        this._arrastre = {
          x0: ev.clientX, y0: ev.clientY, movido: false,
          pan: ev.shiftKey || ev.button === 1, obj: objetivo(ev)
        };
        svg.classList.add("arrastrando");
      });

      svg.addEventListener("pointermove", (ev) => {
        if (this._punt.has(ev.pointerId)) this._punt.set(ev.pointerId, punto(ev));
        if (this._pinza && this._punt.size >= 2) {
          const v = Array.from(this._punt.values());
          const d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
          if (d > 4) { this.cam.dist = clamp(this._pinza.dist * (this._pinza.d / d), this.cam.minDist, this.cam.maxDist); this.render(); }
          return;
        }
        const a = this._arrastre;
        if (a) {
          const dx = ev.clientX - a.x0, dy = ev.clientY - a.y0;
          if (Math.abs(dx) + Math.abs(dy) > 3) a.movido = true;
          if (a.movido) {
            if (a.pan) this.cam.panear(dx, dy);
            else this.cam.orbitar(-dx * 0.0062, dy * 0.0052);
            a.x0 = ev.clientX; a.y0 = ev.clientY;
            this.render();
          }
          return;
        }
        const obj = objetivo(ev);
        const igual = (x, y) => (x ? x.id === y.id && x.tipo === y.tipo : !y);
        if (!igual(obj, this.hover)) {
          this.hover = obj;
          this.render();
          if (this.opts.onHover) this.opts.onHover(obj);
        }
        svg.style.cursor = obj ? "pointer" : (a && a.pan ? "grabbing" : "grab");
      });

      const soltar = (ev) => {
        this._punt.delete(ev.pointerId);
        if (this._punt.size < 2) this._pinza = null;
        const a = this._arrastre;
        this._arrastre = null;
        svg.classList.remove("arrastrando");
        if (!a) return;
        if (!a.movido) {
          // Con captura de puntero el destino del pointerup es el propio SVG: usamos el objetivo del pointerdown.
          const obj = a.obj || objetivo(ev);
          this.sel = obj;
          this.render();
          if (this.opts.onPick) this.opts.onPick(obj);
        }
      };
      svg.addEventListener("pointerup", soltar);
      svg.addEventListener("pointercancel", soltar);
      svg.addEventListener("pointerleave", () => {
        if (this.hover) { this.hover = null; this.render(); if (this.opts.onHover) this.opts.onHover(null); }
      });
      svg.addEventListener("dblclick", (ev) => {
        const obj = objetivo(ev);
        if (obj && obj.tipo === "nodo") this.enfocar(obj.id);
      });
      svg.addEventListener("wheel", (ev) => {
        ev.preventDefault();
        this.cam.acercar(Math.exp(ev.deltaY * 0.0013));
        this.render();
      }, { passive: false });
      svg.addEventListener("contextmenu", (ev) => ev.preventDefault());

      window.addEventListener("keydown", (ev) => {
        const dentro = document.activeElement === document.body || svg.contains(document.activeElement);
        if (!dentro || this.opts.sinTeclado) return;
        const k = ev.key;
        if (k === "ArrowLeft") { this.cam.orbitar(-0.1, 0); this.render(); }
        else if (k === "ArrowRight") { this.cam.orbitar(0.1, 0); this.render(); }
        else if (k === "ArrowUp") { this.cam.orbitar(0, -0.07); this.render(); }
        else if (k === "ArrowDown") { this.cam.orbitar(0, 0.07); this.render(); }
        else if (k === "+" || k === "=") { this.cam.acercar(0.9); this.render(); }
        else if (k === "-") { this.cam.acercar(1.1); this.render(); }
        else return;
        ev.preventDefault();
      });
    }
  }

  R3.Motor3D = Motor3D;
  R3.ICONOS = ICONOS;
  R3.ALTURA_TIPO = ALTURA_TIPO;
  R3.util = { clamp, lerp, ease, esc, num };
  R3.ICONO_SVG = (tipo, attrs) =>
    `<svg viewBox="-24 -24 48 48" ${attrs || 'aria-hidden="true" focusable="false"'} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONOS[tipo] || ICONOS.desconocido}</svg>`;
})(window.R3 = window.R3 || {});
