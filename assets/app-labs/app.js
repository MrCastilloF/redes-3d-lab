/* =====================================================================================================
   app.js — Lab de Redes 3D: de los archivos al escenario navegable.
   Todo ocurre en el navegador: no hay backend, no hay subida de datos y no hay dependencias externas.
   ===================================================================================================== */
(function () {
  "use strict";

  const { esc, clamp } = R3.util;
  const { $, $$, toast, ficha, icono, bytes } = R3.UI;
  const I = R3.Ingesta;

  const TITULO_TIPO = {
    nube: "Nube / Internet", router: "Router", firewall: "Firewall", switch: "Conmutador",
    servidor: "Servidor", ap: "Punto de acceso", pc: "PC", portatil: "Portátil",
    telefono: "Teléfono IP", camara: "Cámara IP", nvr: "Grabador NVR",
    documento: "Documento", desconocido: "Sin clasificar", alerta: "Alerta"
  };

  const ESTADO = {
    archivos: [],        // File/objeto {name, arrayBuffer} acumulados
    resultado: null,     // salida de Ingesta.procesar
    escenas: [],
    actual: 0,
    sel: null,
    demo: true
  };

  /* ------------------------------------------------------------------- motor 3D */
  const motor = new R3.Motor3D($("#lab"), {
    onPick: (obj) => {
      ESTADO.sel = obj;
      renderInspector();
      if (window.innerWidth <= 1080 && obj) $("#inspector").classList.add("abierto");
    }
  });
  R3.motor = motor;

  $("#inspector").addEventListener("click", (ev) => {
    if (window.innerWidth > 1080) return;
    const hoja = ev.currentTarget;
    if (!hoja.classList.contains("abierto")) hoja.classList.add("abierto");
    else if (ev.target === hoja || ev.target.closest("h3")) hoja.classList.remove("abierto");
  });

  function zonaSegura() {
    const t = document.querySelector(".titulo-flotante");
    const alto = t ? t.getBoundingClientRect().height : 0;
    const estrecho = window.innerWidth <= 1080;
    return { arriba: Math.round(alto + 42), abajo: estrecho ? 96 : 86, izq: 14, der: 14 };
  }
  window.addEventListener("resize", () => {
    motor.zonaSegura = zonaSegura();
    motor.encuadrar();
  });

  /* ------------------------------------------------------------------- helpers */
  const escenaDe = (entrada) => {
    if (!entrada) return { nodos: [], enlaces: [], zonas: [] };
    if (!entrada._escena) entrada._escena = entrada.escenaDirecta || I.aEscena(entrada.grafo);
    return entrada._escena;
  };
  const escenaActual = () => escenaDe(ESTADO.escenas[ESTADO.actual]);
  const entradaActual = () => ESTADO.escenas[ESTADO.actual] || null;
  const nodoPorId = (id) => escenaActual().nodos.find((n) => n.id === id) || null;

  function archivoDeTexto(nombre, texto, mime) {
    const datos = new TextEncoder().encode(texto);
    return {
      name: nombre,
      type: mime || "text/plain",
      size: datos.length,
      arrayBuffer: async () => datos.buffer.slice(0, datos.byteLength)
    };
  }

  function resaltar(cita, aguja) {
    const base = esc(cita || "");
    if (!aguja) return base;
    const patron = esc(aguja).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try { return base.replace(new RegExp(patron, "gi"), (m) => `<mark>${m}</mark>`); }
    catch (e) { return base; }
  }

  /* --------------------------------------------------------------- procesamiento */
  async function procesarTodo(opciones) {
    const carga = $("#carga");
    $("#carga-texto").textContent = "Procesando " + ESTADO.archivos.length + " archivo(s)…";
    carga.classList.remove("oculto");
    try {
      const r = await I.procesar(ESTADO.archivos, opciones || {});
      ESTADO.resultado = r;
      ESTADO.escenas = r.escenas.slice();
      if (!ESTADO.escenas.length) ESTADO.actual = -1;
      else if (ESTADO.actual < 0 || ESTADO.actual >= ESTADO.escenas.length) ESTADO.actual = 0;
      ESTADO.sel = null;
      refrescarTodo();
    } catch (e) {
      toast("Error al procesar: " + e.message, 6000);
      console.error(e);
    } finally {
      carga.classList.add("oculto");
    }
  }

  function refrescarTodo() {
    renderHUD();
    renderInspector();
    renderInsumos();
    renderEvidencias();
    renderSelectEscenas();
    aplicarEscena(ESTADO.actual);
  }

  function aplicarEscena(i) {
    ESTADO.actual = i;
    const e = entradaActual();
    const d = escenaActual();
    motor.zonaSegura = zonaSegura();
    motor.setDatos(d);
    // Color de los enlaces por zona cuando el insumo no trae color propio
    motor.encuadrar();
    motor.limpiarFlujo();
    renderHUD();
    renderInspector();
    renderSelectEscenas();
    const sel = $("#sel-escena");
    if (sel && i >= 0) sel.value = String(i);
    void e;
  }

  /* ------------------------------------------------------------------------ HUD */
  function renderHUD() {
    const e = entradaActual();
    const d = escenaActual();
    const r = ESTADO.resultado;
    const docs = r ? r.documentos.length : 0;
    const ips = r ? r.inventario.ips.length : 0;

    $("#hud-titulo").textContent = e ? e.nombre : "Sin escenario";
    $("#hud-desc").textContent = e
      ? `Fuente: ${e.fuente} · ${d.nodos.length} dispositivos · ${d.enlaces.length} enlaces · ${d.zonas.length} zonas`
      : "Carga un .drawio para construir la topología, o adjunta documentos para reunir evidencias.";

    $("#hud-kpis").innerHTML = [
      ["Dispositivos", d.nodos.length],
      ["Enlaces", d.enlaces.length],
      ["Zonas", d.zonas.length],
      ["Documentos", docs],
      ["IPs", ips]
    ].map(([k, v]) => `<span class="kpi">${esc(k)} <b>${v}</b></span>`).join("");

    const zonas = d.zonas.slice(0, 6);
    $("#leyenda").innerHTML = zonas.length
      ? zonas.map((z) => `<span class="it"><span class="pt" style="background:${z.color || "#38bdf8"}"></span>${esc(z.nombre)}</span>`).join("")
      : `<span class="it">${esc(e ? "Sin zonas declaradas en el insumo" : "Sin insumos cargados")}</span>`;
  }

  function renderSelectEscenas() {
    const sel = $("#sel-escena");
    if (!sel) return;
    if (!ESTADO.escenas.length) {
      sel.innerHTML = `<option value="-1">Sin escenas</option>`;
      sel.value = "-1";
      return;
    }
    sel.innerHTML = ESTADO.escenas.map((e, i) =>
      `<option value="${i}">${esc(e.nombre)}${e.fuente ? " · " + esc(e.fuente) : ""}</option>`).join("");
    sel.value = String(ESTADO.actual);
  }

  /* ------------------------------------------------------------------ inspector */
  function evidenciaHTML(lista) {
    if (!lista.length) return "";
    return lista.map((ev) =>
      `<div class="evidencia"><span class="fuente">${esc(ev.fuente)}</span>${resaltar(ev.cita, ev.aguja)}</div>`).join("");
  }

  function panelInicio() {
    const r = ESTADO.resultado;
    const avisos = r && r.avisos.length
      ? `<div class="tarjeta"><h3>Avisos de la ingesta</h3>${r.avisos.map((a) =>
          `<div class="aviso"><span>⚠</span><span>${esc(a)}</span></div>`).join("")}</div>`
      : "";
    const pasos = [
      ["1", "Carga el .drawio", "Cada página del archivo se convierte en una escena: las formas son dispositivos y las flechas, enlaces."],
      ["2", "Añade documentos", "PDF, Word o texto aportan direcciones IP, VLANs y párrafos que se adjuntan como evidencia a cada nodo."],
      ["3", "Explora y simula", "Orbita la escena, inspecciona cada dispositivo y traza el camino de un paquete por la topología."]
    ];
    return `
      <div class="tarjeta">
        <h3>Cómo funciona</h3>
        <div class="acordeon">
          ${pasos.map(([n, t, d]) => `<details open><summary><b style="color:var(--acento-2)">${n}</b> ${esc(t)}</summary><div class="cuerpo">${esc(d)}</div></details>`).join("")}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn btn--acento" data-accion="cargar">Cargar archivos</button>
          <button class="btn" data-accion="ejemplo">Volver al ejemplo</button>
          <button class="btn" data-accion="ajustar">Encuadrar</button>
        </div>
      </div>
      ${ESTADO.demo ? `<div class="tarjeta tarjeta--plana"><h3>Estás viendo el ejemplo</h3>
        <p style="margin:0;font-size:12.5px;line-height:1.6;color:var(--texto-2)">
        Este escenario se generó con un <code>.drawio</code> de demostración y un inventario de texto que entran por el mismo
        pipeline que tus archivos. Carga los tuyos y sustituirán al ejemplo.</p></div>` : ""}
      ${avisos}
      ${panelSimulacion()}`;
  }

  function panelNodo(n) {
    const d = escenaActual();
    const zona = d.zonas.find((z) => n.x >= z.x0 && n.x <= z.x1 && n.z >= z.z0 && n.z <= z.z1);
    const docs = ESTADO.resultado ? ESTADO.resultado.documentos : [];
    const evidencias = I.evidenciasDe({ nombre: n.nombre, ip: n.etiqueta }, docs, 4);
    const ipsDoc = ESTADO.resultado
      ? ESTADO.resultado.inventario.ips.filter((it) => {
          const etiqueta = (n.nombre || "").toLowerCase();
          return etiqueta.length > 3 && it.contexto.toLowerCase().includes(etiqueta);
        }).slice(0, 3)
      : [];
    const filas = [
      ["Tipo", esc(TITULO_TIPO[n.tipo] || n.tipo)],
      ["Zona", zona ? esc(zona.nombre) : "—"],
      ["IP en la etiqueta", n.etiqueta ? `<span class="mono">${esc(n.etiqueta)}</span>` : "—"],
      ["Conexiones", String(d.enlaces.filter((l) => l.a === n.id || l.b === n.id).length)],
      ["Origen", esc((entradaActual() || {}).fuente || "—")]
    ];
    const vecinos = d.enlaces
      .filter((l) => l.a === n.id || l.b === n.id)
      .map((l) => {
        const otro = nodoPorId(l.a === n.id ? l.b : l.a);
        return `<button class="chip" data-ir="${esc(l.a === n.id ? l.b : l.a)}">${esc(otro ? otro.nombre : "?")}${l.rotulo ? " · " + esc(l.rotulo) : ""}</button>`;
      }).join("");

    return `
      <div class="tarjeta">
        <div class="cab-detalle">
          <div class="cab-icono" style="color:${n.color || "#38bdf8"};border-color:${(n.color || "#38bdf8")}55;background:${(n.color || "#38bdf8")}18">${icono(n.tipo)}</div>
          <div class="cab-txt"><h2>${esc(n.nombre)}</h2><p>${esc(n.sub || TITULO_TIPO[n.tipo] || n.tipo)}</p></div>
        </div>
        <div style="margin-top:12px">${ficha(filas)}</div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn" data-accion="enfocar">Enfocar</button>
          <button class="btn" data-accion="origen">Origen de simulación</button>
          <button class="btn" data-accion="destino">Destino</button>
        </div>
      </div>
      ${vecinos ? `<div class="tarjeta"><h3>Conectado con</h3><div class="chips">${vecinos}</div></div>` : ""}
      ${evidencias.length ? `<div class="tarjeta"><h3>Evidencias en documentos</h3>${evidenciaHTML(evidencias)}</div>`
        : `<div class="tarjeta"><h3>Evidencias en documentos</h3><div class="vacio" style="padding:14px 6px">Ningún documento menciona «${esc(n.nombre)}». Carga un informe en la pestaña Insumos para respaldar este nodo.</div></div>`}
      ${ipsDoc.length ? `<div class="tarjeta"><h3>Direcciones relacionadas</h3>${ipsDoc.map((it) =>
        `<div class="evidencia"><span class="fuente">${esc(it.fuente)}</span><span class="mono">${esc(it.valor)}</span> — ${esc(it.contexto)}</div>`).join("")}</div>` : ""}
    `;
  }

  function panelEnlace(l) {
    const a = nodoPorId(l.a), b = nodoPorId(l.b);
    return `
      <div class="tarjeta">
        <div class="cab-detalle">
          <div class="cab-icono" style="color:${l.color}">${icono("switch")}</div>
          <div class="cab-txt"><h2>${esc(l.rotulo || "Enlace")}</h2><p>${esc(a ? a.nombre : l.a)} ↔ ${esc(b ? b.nombre : l.b)}</p></div>
        </div>
        <div style="margin-top:12px">${ficha([
          ["Extremo A", esc(a ? a.nombre : l.a)],
          ["Extremo B", esc(b ? b.nombre : l.b)],
          ["Etiqueta", l.rotulo ? esc(l.rotulo) : "—"]
        ])}</div>
      </div>
      ${panelSimulacion()}`;
  }

  /* --------------------------------------------------------------- simulación */
  function bfs(origen, destino, enlaces) {
    const adj = new Map();
    for (const l of enlaces) {
      if (!adj.has(l.a)) adj.set(l.a, []);
      if (!adj.has(l.b)) adj.set(l.b, []);
      adj.get(l.a).push(l.b);
      adj.get(l.b).push(l.a);
    }
    if (!adj.has(origen)) return null;
    const prev = new Map([[origen, null]]);
    const cola = [origen];
    while (cola.length) {
      const cur = cola.shift();
      if (cur === destino) break;
      for (const v of adj.get(cur) || []) {
        if (prev.has(v)) continue;
        prev.set(v, cur);
        cola.push(v);
      }
    }
    if (!prev.has(destino)) return null;
    const ruta = [];
    let c = destino;
    while (c != null) { ruta.unshift(c); c = prev.get(c); }
    return ruta;
  }

  const COSTE = { switch: 0.4, router: 1.1, firewall: 1.4, nube: 1.8, ap: 2.2, servidor: 0.3, pc: 0.2, portatil: 0.2, telefono: 0.2, camara: 0.2, nvr: 0.2 };

  function panelSimulacion() {
    const d = escenaActual();
    if (d.nodos.length < 2 || !d.enlaces.length) {
      return `<div class="tarjeta" id="sim-caja"><h3>Simulación</h3>
        <div class="vacio" style="padding:10px 4px">Este escenario no tiene enlaces declarados, así que no hay ruta que trazar.
        Añade un .drawio con flechas entre dispositivos.</div></div>`;
    }
    const opciones = d.nodos.map((n) => `<option value="${esc(n.id)}">${esc(n.nombre)}</option>`).join("");
    return `<div class="tarjeta" id="sim-caja">
      <h3>Simulación de tráfico</h3>
      <div class="form-fila">
        <label>Origen<select class="campo" id="sim-origen">${opciones}</select></label>
        <label>Destino<select class="campo" id="sim-destino">${opciones}</select></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn--acento" id="btn-trazar">Trazar ruta</button>
        <button class="btn" id="btn-detener">Detener</button>
      </div>
      <div class="ruta" id="sim-ruta"><span class="vacio" style="padding:2px">Sin ruta trazada.</span></div>
      <div id="sim-detalle"></div>
    </div>`;
  }

  function trazar() {
    const d = escenaActual();
    const o = $("#sim-origen"), t = $("#sim-destino");
    if (!o || !t) return;
    const ruta = bfs(o.value, t.value, d.enlaces);
    const caja = $("#sim-ruta"), det = $("#sim-detalle");
    if (!ruta) {
      caja.innerHTML = `<span class="vacio" style="padding:2px">No hay camino entre esos dos dispositivos.</span>`;
      det.innerHTML = "";
      motor.limpiarFlujo();
      return;
    }
    caja.innerHTML = ruta.map((id, i) => {
      const n = nodoPorId(id);
      const extra = i === ruta.length - 1 ? " es-destino" : (n && /router|firewall/.test(n.tipo) ? " es-router" : "");
      return `${i ? '<span class="flecha">→</span>' : ""}<span class="salto${extra}" style="animation-delay:${i * 50}ms"><span class="n">${i + 1}</span>${esc(n ? n.nombre : id)}</span>`;
    }).join("");
    let acumulado = 0;
    const filas = ruta.map((id, i) => {
      const n = nodoPorId(id) || {};
      acumulado += COSTE[n.tipo] != null ? COSTE[n.tipo] : 0.5;
      const papel = i === 0 ? "Origen" : i === ruta.length - 1 ? "Destino" : (/router|firewall/.test(n.tipo || "") ? "Enruta (capa 3)" : "Conmuta (capa 2)");
      return `<tr><td>${i + 1}</td><td>${esc(n.nombre || id)}</td><td>${esc(papel)}</td><td class="num">${acumulado.toFixed(1)} ms</td></tr>`;
    }).join("");
    det.innerHTML = `<div class="tabla-envoltura" style="margin-top:10px;max-height:220px"><table class="tabla">
      <thead><tr><th>#</th><th>Dispositivo</th><th>Papel</th><th>Tiempo</th></tr></thead><tbody>${filas}</tbody></table></div>
      <p style="font-size:10.5px;color:var(--texto-3);margin:8px 0 0">Tiempos estimados por tipo de dispositivo (didáctico, no es una medición real).</p>`;
    motor.setFlujo(ruta, { color: "#a78bfa", velocidad: 1.35 });
    $("#inspector").classList.add("abierto");
    if (window.innerWidth > 1080) pestañas.activar("tab-escenario");
  }

  /* Elige extremos por defecto: el nodo más conectado como origen y una hoja como destino. */
  function extremosPorDefecto() {
    const d = escenaActual();
    const grado = new Map(d.nodos.map((n) => [n.id, 0]));
    for (const l of d.enlaces) {
      grado.set(l.a, (grado.get(l.a) || 0) + 1);
      grado.set(l.b, (grado.get(l.b) || 0) + 1);
    }
    const ordenados = d.nodos.slice().sort((x, y) => (grado.get(y.id) || 0) - (grado.get(x.id) || 0));
    const origen = ordenados[0];
    const hoja = ordenados.slice().reverse().find((n) => n.id !== (origen || {}).id) || ordenados[1];
    return { origen: origen ? origen.id : "", destino: hoja ? hoja.id : "" };
  }

  function ajustarSelectsSim() {
    const o = $("#sim-origen"), t = $("#sim-destino");
    if (!o || !t) return;
    const def = extremosPorDefecto();
    if (ESTADO.simOrigen && escenaActual().nodos.some((n) => n.id === ESTADO.simOrigen)) o.value = ESTADO.simOrigen;
    else o.value = def.origen;
    if (ESTADO.simDestino && escenaActual().nodos.some((n) => n.id === ESTADO.simDestino)) t.value = ESTADO.simDestino;
    else t.value = def.destino;
  }

  function renderInspector() {
    const caja = $("#inspector");
    const s = ESTADO.sel;
    if (!s) { caja.innerHTML = panelInicio(); ajustarSelectsSim(); return; }
    if (s.tipo === "nodo") {
      const n = nodoPorId(s.id);
      caja.innerHTML = n ? panelNodo(n) : panelInicio();
    } else {
      const l = escenaActual().enlaces.find((x) => x.id === s.id);
      caja.innerHTML = l ? panelEnlace(l) : panelInicio();
    }
  }

  /* ------------------------------------------------------------------- insumos */
  const ETIQUETA_TIPO = {
    drawio: "Topología (.drawio)", docx: "Documento Word", pdf: "PDF", texto: "Texto",
    json: "JSON", imagen: "Imagen", "doc-antiguo": "Word antiguo", hoja: "Hoja de cálculo", desconocido: "Desconocido"
  };

  function renderInsumos() {
    const r = ESTADO.resultado;
    if (!r) return;
    $("#lista-fuentes").innerHTML = r.fuentes.length
      ? r.fuentes.map((f) => `<tr>
          <td>${esc(f.nombre)}</td>
          <td>${esc(ETIQUETA_TIPO[f.tipo] || f.tipo)}</td>
          <td style="white-space:normal;color:var(--texto-2)">${esc(f.detalle || "—")}</td>
          <td class="num">${bytes(f.bytes)}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="vacio">Todavía no has cargado archivos.</td></tr>`;

    $("#avisos").innerHTML = r.avisos.length
      ? r.avisos.map((a) => `<div class="aviso"><span>⚠</span><span>${esc(a)}</span></div>`).join("")
      : "";

    const mapeo = [
      { n: "1 · Detección de formato", d: "Se decide por extensión y tipo MIME; los formatos no admitidos se avisan sin romper el proceso.", e: "ok" },
      { n: "2 · Lectura", d: r.fuentes.map((f) => `${f.nombre} → ${ETIQUETA_TIPO[f.tipo] || f.tipo}`).join(" · ") || "sin archivos", e: "ok" },
      { n: "3 · Descompresión", d: ".drawio comprimido, .docx (ZIP) y flujos de PDF se descomprimen con DEFLATE propio, sin librerías.", e: "ok" },
      { n: "4 · Modelo", d: `${r.escenas.length} escena(s), ${r.documentos.length} documento(s), ${r.imagenes.length} imagen(es).`, e: "ok" },
      { n: "5 · Evidencias", d: `${r.inventario.ips.length} IP(s), ${r.inventario.vlans.length} VLAN(s), ${r.inventario.cidrs.length} red(es) documentadas.`, e: r.inventario.ips.length ? "ok" : "warn" }
    ];
    $("#tabla-mapeo").innerHTML = `<div class="mapeo">${mapeo.map((m) =>
      `<div class="mapeo-fila"><span class="n">${esc(m.n)}</span><span class="et et--${m.e}">${m.e === "ok" ? "hecho" : "sin datos"}</span><span class="d">${esc(m.d)}</span></div>`).join("")}</div>`;

    $("#chips-escenas").innerHTML = r.escenas.length
      ? r.escenas.map((e, i) => `<button class="chip" data-escena="${i}" aria-pressed="${i === ESTADO.actual}">${esc(e.nombre)} <b>${escenaDe(e).nodos.length}</b></button>`).join("")
      : `<span class="vacio" style="padding:2px">Ninguna. Carga un .drawio o exporta una escena a JSON desde otra aplicación.</span>`;
  }

  /* ----------------------------------------------------------------- evidencias */
  function renderEvidencias() {
    const r = ESTADO.resultado;
    if (!r) return;
    const ips = r.inventario.ips.slice(0, 80);
    $("#inv-ips").innerHTML = ips.length
      ? ips.map((it) => `<tr><td class="num">${esc(it.valor)}</td><td>${esc(it.fuente)}</td>
          <td style="white-space:normal;color:var(--texto-2)">${esc(it.contexto)}</td></tr>`).join("")
      : `<tr><td colspan="3" class="vacio">Ningún documento con direcciones IP.</td></tr>`;

    $("#inv-vlan").innerHTML = (r.inventario.vlans.length || r.inventario.cidrs.length)
      ? `<div class="chips" style="margin-bottom:10px">${r.inventario.vlans.map((v) =>
          `<span class="chip" style="cursor:default">VLAN ${esc(v.id)}</span>`).join("")}
         ${r.inventario.cidrs.map((c) => `<span class="chip" style="cursor:default">${esc(c)}</span>`).join("")}</div>
         ${r.inventario.hosts.length ? `<div class="chips">${r.inventario.hosts.slice(0, 12).map((h) => `<span class="chip" style="cursor:default">${esc(h)}</span>`).join("")}</div>` : ""}
         ${r.inventario.vlans.map((v) => `<div class="evidencia"><span class="fuente">VLAN ${esc(v.id)} · ${esc(v.fuente)}</span>${esc(v.contexto)}</div>`).join("")}`
      : `<div class="vacio">Sin VLANs ni redes documentadas.</div>`;

    $("#lista-docs").innerHTML = r.documentos.length
      ? r.documentos.map((doc) => `<details><summary>${esc(doc.fuente)} · ${doc.texto.length} caracteres</summary>
          <div class="cuerpo"><div style="max-height:220px;overflow:auto;white-space:pre-wrap;font-size:11.5px;color:var(--texto-2)">${esc(doc.texto.slice(0, 1200))}${doc.texto.length > 1200 ? "\n…" : ""}</div></div></details>`).join("")
      : `<div class="vacio">Sin documentos. Añade un PDF, un .docx o un .txt.</div>`;

    $("#galeria").innerHTML = r.imagenes.length
      ? r.imagenes.map((img) => `<figure>${img.datos ? `<img src="${img.datos}" alt="${esc(img.fuente)}">` : ""}<figcaption>${esc(img.fuente)}</figcaption></figure>`).join("")
      : `<div class="vacio">Sin imágenes adjuntas.</div>`;

    $("#ev-chips").innerHTML = [
      ["IPs", r.inventario.ips.length],
      ["VLANs", r.inventario.vlans.length],
      ["Redes", r.inventario.cidrs.length],
      ["Docs", r.documentos.length]
    ].map(([k, v]) => `<span class="kpi">${esc(k)} <b>${v}</b></span>`).join("");
  }

  /* ------------------------------------------------------------------- acciones */
  async function cargar(lista) {
    const nuevos = Array.from(lista || []).filter((f) => f && (f.size == null || f.size >= 0));
    if (!nuevos.length) return;
    ESTADO.archivos = ESTADO.archivos.concat(nuevos);
    ESTADO.demo = false;
    ESTADO.actual = 0;
    await procesarTodo();
    const r = ESTADO.resultado;
    toast(`${nuevos.length} archivo(s) · ${r.escenas.length} escena(s) · ${r.documentos.length} documento(s)`);
  }

  function exportar() {
    const d = escenaActual();
    const e = entradaActual();
    if (!e) { toast("No hay escena que exportar"); return; }
    R3.UI.exportarJSON(`escena-${(e.nombre || "lab").toLowerCase().replace(/[^\w]+/g, "-")}.json`, {
      generado: new Date().toISOString(),
      nombre: e.nombre,
      fuente: e.fuente,
      nodos: d.nodos,
      enlaces: d.enlaces,
      zonas: d.zonas
    });
  }

  /* --------------------------------------------------------------- interacción */
  document.addEventListener("click", (ev) => {
    const escena = ev.target.closest("[data-escena]");
    if (escena) { aplicarEscena(parseInt(escena.dataset.escena, 10)); return; }
    const ir = ev.target.closest("[data-ir]");
    if (ir) {
      const n = nodoPorId(ir.dataset.ir);
      if (n) { ESTADO.sel = { tipo: "nodo", id: n.id }; motor.seleccionar("nodo", n.id); motor.enfocar(n.id); renderInspector(); }
      return;
    }
    const btn = ev.target.closest("[data-accion]");
    if (!btn) return;
    const accion = btn.dataset.accion;
    if (accion === "cargar") $("#archivos").click();
    if (accion === "ejemplo") cargarEjemplo();
    if (accion === "ajustar") { motor.zonaSegura = zonaSegura(); motor.encuadrar(); }
    if (accion === "enfocar" && ESTADO.sel) motor.enfocar(ESTADO.sel.id);
    if (accion === "origen" && ESTADO.sel) {
      const sel = $("#sim-origen");
      if (sel) { sel.value = ESTADO.sel.id; toast("Origen: " + (nodoPorId(ESTADO.sel.id) || {}).nombre); }
      else toast("Este escenario no tiene enlaces para simular");
    }
    if (accion === "destino" && ESTADO.sel) {
      const sel = $("#sim-destino");
      if (sel) { sel.value = ESTADO.sel.id; toast("Destino: " + (nodoPorId(ESTADO.sel.id) || {}).nombre); }
      else toast("Este escenario no tiene enlaces para simular");
    }
  });

  document.addEventListener("click", (ev) => {
    if (ev.target.closest("#btn-trazar")) trazar();
    if (ev.target.closest("#btn-detener")) { motor.limpiarFlujo(); toast("Simulación detenida"); }
    if (ev.target.closest("#btn-vaciar")) {
      ESTADO.archivos = [];
      ESTADO.demo = false;
      ESTADO.resultado = null;
      ESTADO.escenas = [];
      ESTADO.actual = -1;
      motor.setDatos({ nodos: [], enlaces: [], zonas: [] });
      motor.render();
      ["#hud-titulo", "#hud-desc"].forEach((s) => { const el = $(s); if (el) el.textContent = ""; });
      renderHUD(); renderInspector(); renderInsumos(); renderEvidencias(); renderSelectEscenas();
      toast("Laboratorio vacío");
    }
  });

  /* -------------------------------------------------------------- carga de datos */
  const pestañas = R3.UI.pestañas($(".pestanas"), (tab) => {
    if (tab === "insumos") renderInsumos();
    if (tab === "evidencias") renderEvidencias();
  });

  function conectarZona(el) {
    if (!el) return;
    el.addEventListener("dragover", (ev) => { ev.preventDefault(); el.classList.add("zona-arrastre-activa"); });
    el.addEventListener("dragleave", () => el.classList.remove("zona-arrastre-activa"));
    el.addEventListener("drop", (ev) => {
      ev.preventDefault();
      el.classList.remove("zona-arrastre-activa");
      if (ev.dataTransfer && ev.dataTransfer.files) cargar(ev.dataTransfer.files);
    });
  }

  function cargarEjemplo() {
    ESTADO.archivos = [
      archivoDeTexto("ejemplo-campus.drawio", R3.EJEMPLO_DRAWIO, "application/xml"),
      archivoDeTexto(R3.EJEMPLO_DOC.nombre, R3.EJEMPLO_DOC.texto, "text/plain")
    ];
    ESTADO.demo = true;
    ESTADO.actual = 0;
    procesarTodo().then(() => toast("Ejemplo restaurado"));
  }

  function arrancar() {
    R3.UI.aplicarTema(R3.UI.temaInicial());

    $("#btn-cargar").addEventListener("click", () => $("#archivos").click());
    const c2 = $("#btn-cargar-2");
    if (c2) c2.addEventListener("click", () => $("#archivos").click());
    $("#archivos").addEventListener("change", (ev) => {
      cargar(ev.target.files);
      ev.target.value = "";
    });
    $("#btn-exportar").addEventListener("click", exportar);
    $("#btn-ajustar").addEventListener("click", () => { motor.zonaSegura = zonaSegura(); motor.encuadrar(); });
    $("#btn-tema").addEventListener("click", () => R3.UI.alternarTema());
    $("#btn-girar").addEventListener("click", (ev) => {
      const on = ev.currentTarget.getAttribute("aria-pressed") !== "true";
      ev.currentTarget.setAttribute("aria-pressed", on ? "true" : "false");
      motor.setAutorotar(on);
    });
    $("#sel-escena").addEventListener("change", (ev) => {
      const i = parseInt(ev.target.value, 10);
      aplicarEscena(Number.isFinite(i) ? i : -1);
    });

    $$("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-preset]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      motor.preset(b.dataset.preset);
    }));

    conectarZona($("#zona-arrastre"));
    conectarZona($("#zona-soltar"));
    const soltar = $("#zona-soltar");
    if (soltar) {
      soltar.addEventListener("click", () => $("#archivos").click());
      soltar.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); $("#archivos").click(); } });
    }
    // Evita que el navegador abra el archivo si se suelta fuera de la zona
    ["dragover", "drop"].forEach((tipo) =>
      window.addEventListener(tipo, (ev) => { if (!ev.target.closest || !ev.target.closest("#zona-arrastre, #zona-soltar")) ev.preventDefault(); }));

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") { ESTADO.sel = null; motor.seleccionar(null, null); renderInspector(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "o") { ev.preventDefault(); $("#archivos").click(); }
    });

    cargarEjemplo();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();
})();
