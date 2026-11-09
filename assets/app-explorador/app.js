/* =====================================================================================================
   app.js — Explorador de Redes 3D (labs_redes_test).
   Reutiliza el modelo de datos de la versión anterior (datos.js) y lo representa con el motor 3D propio.
   Sin dependencias, sin backend: todo ocurre en el navegador.
   ===================================================================================================== */
(function () {
  "use strict";

  const { esc, clamp } = R3.util;
  const { $, $$, toast, ficha, icono, descargar } = R3.UI;

  /* ------------------------------------------------------------------ catálogos */
  const TIPO_NODO = {
    nube: "Nube / Internet", router: "Router", firewall: "Firewall", switch: "Conmutador",
    servidor: "Servidor", ap: "Punto de acceso", pc: "PC", portatil: "Portátil",
    telefono: "Teléfono IP", camara: "Cámara IP", nvr: "Grabador NVR", alerta: "Alerta"
  };
  const TIPO_ENLACE = {
    wan: "WAN / Internet", trunk: "Tronco 802.1Q", acceso: "Puerto de acceso",
    poe: "Acceso PoE+", wifi: "Inalámbrico", fortilink: "FortiLink (tronco)", ha: "Alta disponibilidad"
  };
  const CAPAS = {
    1: "Física", 2: "Enlace de datos", 3: "Red", 4: "Transporte",
    5: "Sesión", 6: "Presentación", 7: "Aplicación"
  };
  const COLOR_TIPO = {
    nube: "#94a3b8", router: "#38bdf8", firewall: "#fb923c", switch: "#a78bfa",
    servidor: "#f472b6", ap: "#22d3ee", pc: "#60a5fa", portatil: "#818cf8",
    telefono: "#fbbf24", camara: "#fb7185", nvr: "#f43f5e", alerta: "#ef4444"
  };
  const COLOR_ENLACE = {
    wan: "#94a3b8", trunk: "#a78bfa", acceso: "#38bdf8", poe: "#fbbf24",
    wifi: "#22d3ee", fortilink: "#8b5cf6", ha: "#34d399"
  };
  const ESCALA = 62;   // px del lienzo original → unidades de mundo

  /* --------------------------------------------------------------------- estado */
  const ESTADO = {
    escenario: DATOS.meta.escenarioPorDefecto,
    sel: null,          // { tipo:'nodo'|'enlace', id }
    proto: null,
    protoHl: null,
    trafico: true,
    flujo: null
  };

  let topo = null;                       // { nodos, enlaces, anotaciones, vlans, notas }
  let nodosPorId = new Map();
  let enlacesPorId = new Map();

  /* -------------------------------------------------------------------- utilería */
  const nodo = (id) => nodosPorId.get(id);
  const enlace = (id) => enlacesPorId.get(id);
  const esRouter = (n) => !!n && (n.tipo === "router" || n.tipo === "firewall");
  const vlanDe = (id) => (topo.vlans || []).find((v) => v.id === id) || null;
  const colorVlan = (id) => { const v = vlanDe(id); return v ? v.color : "#94a3b8"; };
  const nombreVlan = (id) => {
    if (id === 0) return "Nativa / sin etiquetar";
    const v = vlanDe(id);
    return v ? `VLAN ${v.id} · ${v.nombre}` : `VLAN ${id}`;
  };
  function claseEstado(t) {
    const s = String(t || "").toLowerCase();
    if (/falla|crític|descontinu|fuera de soporte/.test(s)) return "peligro";
    if (/espera|sin gestión|saturado|insuficiente|pasiv/.test(s)) return "alerta";
    return "ok";
  }
  function colorEstado(t) {
    const c = claseEstado(t);
    return c === "peligro" ? "#fb7185" : (c === "alerta" ? "#fbbf24" : "#34d399");
  }

  /* --------------------------------------------------------- modelo de la topología */
  function construir(escId) {
    const escr = DATOS.escenarios[escId] || DATOS.escenarios[DATOS.meta.escenarioPorDefecto];
    let nodos = [], enlaces = [], anotaciones = [];
    if (escr.compartirBase) {
      nodos = DATOS.baseDespues.nodos.slice();
      enlaces = DATOS.baseDespues.enlaces.slice();
      anotaciones = (DATOS.baseDespues.anotaciones || []).slice();
    }
    nodos = nodos.concat(escr.nodos || []);
    enlaces = enlaces.concat(escr.enlaces || []);
    anotaciones = anotaciones.concat(escr.anotaciones || []);
    topo = {
      nombre: escr.nombre, descripcion: escr.descripcion, banda: escr.banda,
      nodos, enlaces, anotaciones,
      vlans: escr.vlans || DATOS.vlans,
      notas: escr.notas || DATOS.notasDespues
    };
    nodosPorId = new Map(nodos.map((n) => [n.id, n]));
    enlacesPorId = new Map(enlaces.map((l) => [l.id, l]));
    return topo;
  }

  /* --------------------------------------------------------- modelo → escena 3D */
  function colorNodo(n) {
    if (n.vlan != null) { const v = vlanDe(n.vlan); if (v && v.id !== 0) return v.color; }
    return COLOR_TIPO[n.tipo] || "#64748b";
  }
  function colorDeEnlace(l) {
    const v = (l.vlans || []).find((x) => x > 0);
    if (v != null) return colorVlan(v);
    return COLOR_ENLACE[l.tipo] || "#64748b";
  }
  function grosorDe(l) {
    const m = /([\d.]+)\s*Gbps/i.exec(l.velocidad || "");
    if (!m) return l.tipo === "wan" ? 3.6 : 3;
    const v = parseFloat(m[1]);
    return clamp(2.4 + Math.log10(v + 1) * 1.5, 2.4, 6);
  }
  function escena3D() {
    return {
      nodos: topo.nodos.map((n) => ({
        id: n.id,
        tipo: n.tipo,
        nombre: n.nombre,
        sub: n.info || (n.ip ? `${n.ip}${n.mascara || ""}` : ""),
        x: (n.x - 830) / ESCALA,
        z: (n.y - 460) / ESCALA,
        color: colorNodo(n),
        estadoColor: colorEstado(n.estado),
        etiqueta: n.ip ? `${n.ip}${n.mascara || ""}` : ""
      })),
      enlaces: topo.enlaces.map((l) => ({
        id: l.id, a: l.a, b: l.b,
        color: colorDeEnlace(l),
        grosor: grosorDe(l),
        tipo: l.tipo,
        rotulo: l.rotulo || "",
        traficoAmbiente: ESTADO.trafico
      }))
    };
  }

  /* --------------------------------------------------------------------- motor 3D */
  const motor = new R3.Motor3D($("#topologia"), {
    onPick: (obj) => {
      ESTADO.sel = obj;
      renderInspector();
      if (window.innerWidth <= 1080 && obj) $("#inspector").classList.add("abierto");
    },
    onHover: null
  });

  // En pantallas estrechas el inspector es una hoja inferior: se abre al tocarla.
  $("#inspector").addEventListener("click", (ev) => {
    if (window.innerWidth > 1080) return;
    const hoja = ev.currentTarget;
    if (!hoja.classList.contains("abierto")) hoja.classList.add("abierto");
    else if (ev.target === hoja || ev.target.closest("h3")) hoja.classList.remove("abierto");
  });

  R3.motor = motor;   // acceso para depuración y extensiones

  /* Reserva el espacio que ocupan el título flotante y la leyenda para que la escena no quede debajo. */
  function zonaSegura() {
    const t = document.querySelector(".titulo-flotante");
    const alto = t ? t.getBoundingClientRect().height : 0;
    const estrecho = window.innerWidth <= 1080;
    return { arriba: Math.round(alto + 42), abajo: estrecho ? 96 : 86, izq: 14, der: 14 };
  }

  function pintarEscena() {
    motor.zonaSegura = zonaSegura();
    motor.setDatos(escena3D());
    motor.encuadrar();
  }

  window.addEventListener("resize", () => {
    motor.zonaSegura = zonaSegura();
    motor.encuadrar();
  });

  /* ----------------------------------------------------------------------- HUD */
  function renderHUD() {
    $("#hud-titulo").textContent = topo.nombre || "Topología";
    $("#hud-desc").textContent = topo.descripcion || "";
    const nProto = new Set();
    topo.nodos.forEach((n) => (n.protocolos || []).forEach((p) => nProto.add(p)));
    const conIp = topo.nodos.filter((n) => n.ip).length;
    $("#hud-kpis").innerHTML = [
      ["Dispositivos", topo.nodos.length],
      ["Enlaces", topo.enlaces.length],
      ["VLANs", (topo.vlans || []).length],
      ["Con IP", conIp],
      ["Protocolos", nProto.size]
    ].map(([k, v]) => `<span class="kpi">${esc(k)} <b>${v}</b></span>`).join("");

    let ley = (topo.vlans || []).map((v) =>
      `<span class="it"><span class="pt" style="background:${v.color}"></span>${esc(v.id === 0 ? "WAN" : "VLAN " + v.id)} · ${esc(v.nombre)}</span>`
    ).join("");
    if (ESTADO.protoHl) {
      const p = DATOS.protocolos.find((x) => x.id === ESTADO.protoHl);
      ley += `<button class="chip" id="quitar-hl" aria-pressed="true" title="Quitar resaltado">${esc(p ? p.nombre : ESTADO.protoHl)} ✕</button>`;
    }
    $("#leyenda").innerHTML = ley;
    const q = $("#quitar-hl");
    if (q) q.addEventListener("click", () => {
      ESTADO.protoHl = null;
      motor.resaltar([], []);
      renderHUD();
      renderInspector();
    });
  }

  /* ------------------------------------------------------------------ inspector */
  function protocolosDe(lista) {
    return `<div class="chips">${(lista || []).map((id) => {
      const p = DATOS.protocolos.find((x) => x.id === id);
      return p ? `<button class="chip" data-proto="${esc(p.id)}"><span class="pt" style="background:${p.color}"></span>${esc(p.nombre)}</button>` : "";
    }).join("")}</div>`;
  }

  function panelNodo(n) {
    const pref = (n.mascara || "").replace("/", "");
    const filas = [
      ["Tipo", esc(TIPO_NODO[n.tipo] || n.tipo)],
      ["Estado", `<span style="color:${colorEstado(n.estado)}">● ${esc(n.estado || "—")}</span>`],
      n.ip ? ["IP / máscara", `<span class="mono">${esc(n.ip)}${esc(n.mascara || "")}</span>`] : null,
      n.vlan != null ? ["VLAN", `${esc(nombreVlan(n.vlan))}`] : null,
      n.mac ? ["MAC", `<span class="mono">${esc(n.mac)}</span>`] : null,
      n.fabricante ? ["Fabricante", esc(n.fabricante)] : null,
      n.modelo ? ["Modelo", esc(n.modelo)] : null,
      n.dhcp ? ["Servicios", "Servidor DHCP"] : null
    ].filter(Boolean);

    const ifs = (n.interfaces || []).length
      ? `<div class="tarjeta tarjeta--plana"><h3>Interfaces</h3><div class="tabla-envoltura" style="max-height:220px">
          <table class="tabla"><thead><tr><th>Interfaz</th><th>Dirección</th><th>Modo</th></tr></thead><tbody>
          ${n.interfaces.map((i) => `<tr><td>${esc(i.nombre)}</td><td class="num">${esc(i.ip || "—")}</td><td>${esc(i.modo || "—")}</td></tr>`).join("")}
          </tbody></table></div></div>`
      : "";

    return `
      <div class="tarjeta">
        <div class="cab-detalle">
          <div class="cab-icono" style="color:${colorNodo(n)};border-color:${colorNodo(n)}55;background:${colorNodo(n)}18">${icono(n.tipo)}</div>
          <div class="cab-txt">
            <h2>${esc(n.nombre)}</h2>
            <p>${esc(n.info || TIPO_NODO[n.tipo] || "")}</p>
          </div>
        </div>
        <div style="margin-top:12px">${ficha(filas)}</div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn" data-accion="enfocar">Enfocar en 3D</button>
          <button class="btn" data-accion="simular">Trazar ruta desde aquí</button>
        </div>
      </div>
      ${ifs}
      ${(n.protocolos || []).length ? `<div class="tarjeta"><h3>Protocolos</h3>${protocolosDe(n.protocolos)}</div>` : ""}
      ${n.notas ? `<div class="tarjeta"><h3>Notas</h3><div class="nota">${esc(n.notas)}</div></div>` : ""}
      ${(n.vlans || []).length ? `<div class="tarjeta"><h3>VLANs que toca</h3><div class="chips">${n.vlans.map((v) =>
        `<span class="chip" style="cursor:default"><span class="pt" style="background:${colorVlan(v)}"></span>${esc(v === 0 ? "Nativa" : "VLAN " + v)}</span>`).join("")}</div></div>` : ""}
    `;
  }

  function panelEnlace(l) {
    const a = nodo(l.a), b = nodo(l.b);
    const filas = [
      ["Tipo", esc(TIPO_ENLACE[l.tipo] || l.tipo)],
      ["Entre", `${esc(a ? a.nombre : l.a)} ↔ ${esc(b ? b.nombre : l.b)}`],
      ["Velocidad", esc(l.velocidad || "—")],
      ["Medio", esc(l.medio || "—")],
      ["Estado", `<span style="color:${colorEstado(l.estado)}">● ${esc(l.estado || "—")}</span>`],
      l.ip ? ["Red del enlace", `<span class="mono">${esc(l.ip)}</span>`] : null,
      (l.vlans || []).length ? ["VLANs", (l.vlans || []).map((v) => esc(v === 0 ? "Nativa" : "VLAN " + v)).join(" · ")] : null
    ].filter(Boolean);

    return `
      <div class="tarjeta">
        <div class="cab-detalle">
          <div class="cab-icono" style="color:${colorDeEnlace(l)};border-color:${colorDeEnlace(l)}55;background:${colorDeEnlace(l)}18">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16M4 7h16M4 17h10"/></svg>
          </div>
          <div class="cab-txt">
            <h2>${esc(l.nombre || l.id)}</h2>
            <p>${esc(l.rotulo || TIPO_ENLACE[l.tipo] || "")}</p>
          </div>
        </div>
        <div style="margin-top:12px">${ficha(filas)}</div>
      </div>
      ${(l.protocolos || []).length ? `<div class="tarjeta"><h3>Protocolos que viajan</h3>${protocolosDe(l.protocolos)}</div>` : ""}
      ${l.notas ? `<div class="tarjeta"><h3>Notas</h3><div class="nota">${esc(l.notas)}</div></div>` : ""}
    `;
  }

  function panelInicio() {
    const cuenta = {};
    topo.nodos.forEach((n) => { cuenta[n.tipo] = (cuenta[n.tipo] || 0) + 1; });
    const notas = (topo.anotaciones || []).map((a) =>
      `<div class="nota"${a.tipo === "alerta" ? ' style="border-left-color:var(--alerta)"' : ""}>${esc(a.texto)}</div>`
    ).join("");

    return `
      <div class="tarjeta">
        <h3>Cómo explorar</h3>
        <p style="margin:0;font-size:12.5px;line-height:1.6;color:var(--texto-2)">
          Arrastra sobre el lienzo para <b>orbitar</b> la red, usa la rueda para <b>acercarte</b> y
          <span class="kbd">Mayús</span>+arrastrar para desplazarte. Haz clic en un <b>dispositivo</b> o en un
          <b>enlace</b> y aquí verás su configuración completa. Doble clic sobre un dispositivo lo enfoca.
        </p>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn" data-accion="ajustar">Encuadrar todo</button>
          <button class="btn" data-accion="exportar">Exportar escena</button>
        </div>
      </div>
      <div class="tarjeta">
        <h3>Inventario del escenario</h3>
        <div class="chips">${Object.keys(cuenta).map((t) =>
          `<span class="chip" style="cursor:default">${esc(TIPO_NODO[t] || t)} <b>${cuenta[t]}</b></span>`).join("")}</div>
      </div>
      ${notas ? `<div class="tarjeta"${topo.nombre && /antes/i.test(topo.nombre) ? ' style="border-color:rgba(251,191,36,.4)"' : ""}><h3>Observaciones</h3>${notas}</div>` : ""}
      ${(topo.notas || []).length ? `<div class="tarjeta"><h3>Notas de diseño</h3>${topo.notas.slice(0, 3).map((t) => `<div class="nota">${esc(t)}</div>`).join("")}</div>` : ""}
    `;
  }

  function renderInspector() {
    const caja = $("#inspector");
    const s = ESTADO.sel;
    if (!s) { caja.innerHTML = panelInicio(); return; }
    if (s.tipo === "nodo") {
      const n = nodo(s.id);
      caja.innerHTML = n ? panelNodo(n) : panelInicio();
    } else {
      const l = enlace(s.id);
      caja.innerHTML = l ? panelEnlace(l) : panelInicio();
    }
  }

  /* --------------------------------------------------------- acciones del panel */
  document.addEventListener("click", (ev) => {
    const item = ev.target.closest("[data-proto-id]");
    if (item) { seleccionarProtocolo(item.dataset.protoId); return; }
    const chip = ev.target.closest("[data-proto]");
    if (chip) {
      const id = chip.dataset.proto;
      pestañas.activar("tab-protocolos");
      seleccionarProtocolo(id);
      return;
    }
    const btn = ev.target.closest("[data-accion]");
    if (!btn) return;
    const accion = btn.dataset.accion;
    if (accion === "enfocar" && ESTADO.sel && ESTADO.sel.tipo === "nodo") motor.enfocar(ESTADO.sel.id);
    if (accion === "ajustar") motor.encuadrar();
    if (accion === "exportar") {
      R3.UI.exportarJSON(`escena-${ESTADO.escenario}.json`, {
        escenario: ESTADO.escenario, nombre: topo.nombre,
        nodos: topo.nodos, enlaces: topo.enlaces, vlans: topo.vlans
      });
    }
    if (accion === "simular" && ESTADO.sel && ESTADO.sel.tipo === "nodo") {
      pestañas.activar("tab-simulacion");
      $("#sim-origen").value = ESTADO.sel.id;
      renderSimulacion();
      toast("Origen fijado: " + (nodo(ESTADO.sel.id) || {}).nombre);
    }
  });

  /* ------------------------------------------------------------ direccionamiento */
  const ipANum = (ip) => {
    const p = String(ip).trim().split(".");
    if (p.length !== 4) return NaN;
    const n = p.map(Number);
    if (n.some((x) => !Number.isFinite(x) || x < 0 || x > 255)) return NaN;
    return ((n[0] << 24) | (n[1] << 16) | (n[2] << 8) | n[3]) >>> 0;
  };
  const numAip = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  const mascaraDe = (pref) => (pref === 0 ? 4294967295 : (0xFFFFFFFF << (32 - pref)) >>> 0);
  const redDe = (ip, pref) => (ipANum(ip) & mascaraDe(pref)) >>> 0;
  const broadcastDe = (red, pref) => (red | (~mascaraDe(pref) >>> 0)) >>> 0;
  function prefijoDe(mascara) {
    const s = String(mascara || "").trim();
    if (s.startsWith("/")) return parseInt(s.slice(1), 10);
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const n = ipANum(s);
    if (isNaN(n)) return null;
    let bits = 0, v = n >>> 0;
    while (v) { bits += v & 1; v >>>= 1; }
    return bits;
  }

  function renderDireccionamiento() {
    $("#dir-desc").textContent = topo.descripcion || "";
    $("#tabla-vlans").innerHTML = (topo.vlans || []).map((v) => `
      <tr>
        <td><span class="pt-vlan" style="background:${v.color}"></span><b>${esc(v.id === 0 ? "WAN" : v.id)}</b></td>
        <td>${esc(v.nombre)}</td>
        <td class="num">${esc(v.red)}</td>
        <td class="num">${esc(v.gw)}</td>
        <td class="num">${esc(v.dhcp)}</td>
        <td style="white-space:normal;color:var(--texto-2)">${esc(v.uso)}</td>
      </tr>`).join("");

    const conIp = topo.nodos.filter((n) => n.ip);
    $("#tabla-equipos").innerHTML = conIp.map((n) => {
      const pref = prefijoDe(n.mascara);
      const red = pref != null ? `${numAip(redDe(n.ip, pref))}/${pref}` : "—";
      return `<tr>
        <td>${esc(n.nombre)}</td>
        <td class="num">${esc(n.ip)}</td>
        <td class="num">${esc(n.mascara || "—")}</td>
        <td class="num">${esc(red)}</td>
        <td>${n.vlan != null ? `<span class="pt-vlan" style="background:${colorVlan(n.vlan)}"></span>${esc(n.vlan)}` : "—"}</td>
        <td class="num">${esc(n.mac || "—")}</td>
      </tr>`;
    }).join("");

    $("#dir-chips").innerHTML = [
      ["VLANs", (topo.vlans || []).length],
      ["Con IP", conIp.length],
      ["Subredes /24", (topo.vlans || []).filter((v) => /\/24$/.test(v.red)).length]
    ].map(([k, v]) => `<span class="kpi">${esc(k)} <b>${v}</b></span>`).join("");

    $("#notas-dir").innerHTML = (topo.notas || []).map((t) => `<div class="nota">${esc(t)}</div>`).join("");
    calcularSubred();
  }

  function calcularSubred() {
    const ip = ($("#calc-ip").value || "").trim();
    const pref = parseInt($("#calc-mask").value, 10);
    const n = ipANum(ip);
    const caja = $("#calc-resultado");
    if (isNaN(n)) {
      caja.innerHTML = `<div class="nota" style="border-left-color:var(--peligro)">Dirección IP no válida. Usa el formato 10.10.30.21.</div>`;
      return;
    }
    const red = redDe(ip, pref), bc = broadcastDe(red, pref);
    const hosts = pref >= 31 ? (pref === 31 ? 2 : 1) : Math.pow(2, 32 - pref) - 2;
    const primero = pref >= 31 ? red : red + 1;
    const ultimo = pref >= 31 ? bc : bc - 1;
    const clase = (() => { const o = parseInt(ip.split(".")[0], 10); return o < 128 ? "A" : o < 192 ? "B" : o < 224 ? "C" : "D/E"; })();
    const priv = /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
    caja.innerHTML = ficha([
      ["Red", `<span class="mono">${esc(numAip(red))}/${pref}</span>`],
      ["Máscara", `<span class="mono">${esc(numAip(mascaraDe(pref)))}</span>`],
      ["Broadcast", `<span class="mono">${esc(numAip(bc))}</span>`],
      ["Primer host", `<span class="mono">${esc(numAip(primero))}</span>`],
      ["Último host", `<span class="mono">${esc(numAip(ultimo))}</span>`],
      ["Hosts útiles", String(hosts)],
      ["Clase / ámbito", `Clase ${clase} · ${priv ? "privada (RFC 1918)" : "pública"}`]
    ]);
  }

  /* ------------------------------------------------------------------- protocolos */
  function renderListaProtocolos() {
    const usados = new Set();
    topo.nodos.forEach((n) => (n.protocolos || []).forEach((p) => usados.add(p)));
    topo.enlaces.forEach((l) => (l.protocolos || []).forEach((p) => usados.add(p)));
    $("#lista-protocolos").innerHTML = DATOS.protocolos.map((p) => `
      <button class="proto" data-proto-id="${esc(p.id)}" aria-pressed="${ESTADO.proto === p.id}">
        <span class="pt" style="background:${p.color}"></span>
        <b>${esc(p.nombre)}</b>
        <span>${esc(usados.has(p.id) ? "capa " + p.capa : "fuera del escenario")}</span>
      </button>`).join("");
  }

  function seleccionarProtocolo(id) {
    ESTADO.proto = id;
    renderListaProtocolos();
    const p = DATOS.protocolos.find((x) => x.id === id);
    if (!p) return;
    const enlacesAqui = topo.enlaces.filter((l) => (l.protocolos || []).includes(id));
    const nodosAqui = topo.nodos.filter((n) => (n.protocolos || []).includes(id));
    const pila = [];
    for (let c = 7; c >= 1; c--) {
      pila.push(`<div class="capa-nivel${c === p.capa ? " activa" : ""}" data-capa="${c}">
        <span class="n">L${c}</span><span class="t">${esc(CAPAS[c])}</span>
        ${c === p.capa ? `<span style="margin-left:auto;font-size:10.5px;color:var(--acento)">${esc(p.corto || "")}</span>` : ""}
      </div>`);
    }
    const cab = (p.cabeceras || []).map(([k, v]) => `<div><span class="k">${esc(k)}</span><span>${esc(v)}</span></div>`).join("");
    const donde = typeof p.donde === "string" ? p.donde : (Array.isArray(p.donde) ? p.donde.join(" · ") : "");
    $("#proto-detalle").innerHTML = `
      <h3>Detalle</h3>
      <div class="cab-detalle">
        <div class="cab-icono" style="color:${p.color};border-color:${p.color}55;background:${p.color}18">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
        </div>
        <div class="cab-txt"><h2>${esc(p.nombre)}</h2><p>Capa ${p.capa} · ${esc(CAPAS[p.capa] || "")} — ${esc(p.corto || "")}</p></div>
      </div>
      <p style="font-size:12.5px;line-height:1.6;color:var(--texto-2);margin:12px 0 0">${esc(p.resumen || "")}</p>
      ${p.analogia ? `<div class="analogia"><b>En palabras simples:</b> ${esc(p.analogia)}</div>` : ""}
      <div class="pila-capas" id="pila-capas">${pila.join("")}</div>
      ${cab ? `<h3 style="margin-top:16px">Campos de cabecera</h3><div class="cabeceras">${cab}</div>` : ""}
      ${donde ? `<h3 style="margin-top:16px">Dónde aparece</h3><div class="nota">${esc(donde)}</div>` : ""}
      <div class="chips" style="margin-top:14px">
        <button class="btn btn--acento" id="btn-resaltar-proto">Resaltar en la topología</button>
        <span class="kpi">${enlacesAqui.length} enlaces</span>
        <span class="kpi">${nodosAqui.length} dispositivos</span>
      </div>`;
    $("#btn-resaltar-proto").addEventListener("click", () => {
      ESTADO.protoHl = p.id;
      motor.resaltar(nodosAqui.map((n) => n.id), enlacesAqui.map((l) => l.id));
      renderHUD();
      pestañas.activar("tab-topologia");
      toast(`Resaltado: ${p.nombre} (${enlacesAqui.length} enlaces)`);
    });
  }

  /* ------------------------------------------------------------------ simulación */
  function bfs(origen, destino) {
    const adj = new Map();
    for (const l of topo.enlaces) {
      if (!adj.has(l.a)) adj.set(l.a, []);
      if (!adj.has(l.b)) adj.set(l.b, []);
      adj.get(l.a).push(l.b);
      adj.get(l.b).push(l.a);
    }
    const prev = new Map([[origen, null]]);
    const cola = [origen];
    while (cola.length) {
      const cur = cola.shift();
      if (cur === destino) break;
      for (const vecino of adj.get(cur) || []) {
        if (prev.has(vecino)) continue;
        prev.set(vecino, cur);
        cola.push(vecino);
      }
    }
    if (!prev.has(destino)) return null;
    const ruta = [];
    let c = destino;
    while (c != null) { ruta.unshift(c); c = prev.get(c); }
    return ruta;
  }

  function opcionesNodos() {
    const conIp = topo.nodos.filter((n) => n.tipo !== "nube");
    return conIp.map((n) => `<option value="${esc(n.id)}">${esc(n.nombre)}${n.ip ? " · " + esc(n.ip) : ""}</option>`).join("");
  }

  function renderSimulacion() {
    const o = $("#sim-origen"), d = $("#sim-destino");
    const prevO = o.value, prevD = d.value;
    const opciones = opcionesNodos();
    o.innerHTML = opciones; d.innerHTML = opciones;
    const ids = topo.nodos.filter((n) => n.tipo !== "nube").map((n) => n.id);
    o.value = ids.includes(prevO) ? prevO : (nodo("pc-admin") ? "pc-admin" : ids[0] || "");
    d.value = ids.includes(prevD) ? prevD : (nodo("srv") ? "srv" : ids[ids.length - 1] || "");
  }

  const COSTE = { switch: 0.4, router: 1.1, firewall: 1.4, nube: 1.8, ap: 2.2, servidor: 0.3, pc: 0.2, portatil: 0.2, telefono: 0.2, camara: 0.2, nvr: 0.2 };
  const MENSAJE = {
    icmp: "Solicitud de eco ICMP", dns: "Consulta DNS (UDP/53)", http: "Petición HTTP/HTTPS (TCP/443)", dhcp: "Discover DHCP (broadcast)"
  };

  function trazar() {
    const o = $("#sim-origen").value, d = $("#sim-destino").value;
    const proto = $("#sim-proto").value;
    const ruta = bfs(o, d);
    const caja = $("#sim-ruta");
    const det = $("#sim-detalle");
    if (!ruta) {
      caja.innerHTML = `<span class="vacio" style="padding:4px">No hay camino entre esos dos dispositivos en este escenario.</span>`;
      det.innerHTML = "";
      motor.limpiarFlujo();
      return;
    }
    caja.innerHTML = ruta.map((id, i) => {
      const n = nodo(id);
      const clase = esRouter(n) ? " es-router" : (i === ruta.length - 1 ? " es-destino" : "");
      return `${i ? '<span class="flecha">→</span>' : ""}
        <span class="salto${clase}" style="animation-delay:${i * 55}ms">
          <span class="n">${i + 1}</span>${esc(n ? n.nombre : id)}
        </span>`;
    }).join("");

    let t = 0;
    const filas = ruta.map((id, i) => {
      const n = nodo(id) || {};
      t += COSTE[n.tipo] != null ? COSTE[n.tipo] : 0.5;
      const papel = i === 0 ? "Origen · arma la trama"
        : i === ruta.length - 1 ? "Destino · entrega al proceso"
          : esRouter(n) ? "Enruta en capa 3 · TTL−1" : "Conmuta en capa 2 · reenvía por MAC";
      return `<tr><td>${i + 1}</td><td>${esc(n.nombre || id)}</td><td>${esc(papel)}</td><td class="num">${t.toFixed(1)} ms</td></tr>`;
    }).join("");

    det.innerHTML = `
      <div class="nota" style="margin-bottom:10px"><b>${esc(MENSAJE[proto] || "Tráfico")}</b> ·
        ${ruta.length - 1} salto(s) · ${esc((nodo(o) || {}).ip || "sin IP")} → ${esc((nodo(d) || {}).ip || "sin IP")}</div>
      <div class="tabla-envoltura"><table class="tabla">
        <thead><tr><th>#</th><th>Dispositivo</th><th>Papel</th><th>Tiempo acumulado</th></tr></thead>
        <tbody>${filas}</tbody></table></div>
      <p style="font-size:11px;color:var(--texto-3);margin:10px 0 0">
        Tiempos estimados con coste fijo por tipo de dispositivo (didáctico, no una medición real de la red).
      </p>`;

    const colores = { icmp: "#34d399", dns: "#fb923c", http: "#a78bfa", dhcp: "#f472b6" };
    motor.setFlujo(ruta, { color: colores[proto] || "#38bdf8", velocidad: 1.3 });
    ESTADO.flujo = ruta;
  }

  /* -------------------------------------------------------------------- glosario */
  function renderGlosario(filtro) {
    const f = String(filtro || "").toLowerCase();
    const items = DATOS.glosario.filter((g) => !f || g.t.toLowerCase().includes(f) || g.d.toLowerCase().includes(f));
    const grupos = new Map();
    items.forEach((g) => {
      if (!grupos.has(g.c)) grupos.set(g.c, []);
      grupos.get(g.c).push(g);
    });
    $("#glosario-lista").innerHTML = Array.from(grupos.entries()).map(([cat, lista]) => `
      <div class="tarjeta">
        <h3>${esc(cat)}</h3>
        <div class="acordeon">
          ${lista.map((g) => `<details><summary>${esc(g.t)}</summary><div class="cuerpo">${esc(g.d)}</div></details>`).join("")}
        </div>
      </div>`).join("") || `<div class="vacio">Sin resultados para “${esc(filtro)}”.</div>`;
  }

  /* ------------------------------------------------------------------ arranque */
  const pestañas = R3.UI.pestañas($(".pestanas"), (tab) => {
    if (tab === "direccionamiento") renderDireccionamiento();
    if (tab === "protocolos") renderListaProtocolos();
    if (tab === "simulacion") renderSimulacion();
    if (tab === "glosario") renderGlosario($("#glosario-buscar").value);
    if (tab !== "topologia") motor.limpiarFlujo();
  });

  function renderEscenario() {
    construir(ESTADO.escenario);
    ESTADO.sel = null;
    ESTADO.protoHl = null;
    $("#inspector").classList.remove("abierto");
    ESTADO.proto = null;
    pintarEscena();
    renderHUD();
    renderInspector();
    renderDireccionamiento();
    renderListaProtocolos();
    renderSimulacion();
    renderGlosario("");
    motor.resaltar([], []);
  }

  function arrancar() {
    R3.UI.aplicarTema(R3.UI.temaInicial());

    const sel = $("#sel-escenario");
    sel.innerHTML = Object.keys(DATOS.escenarios)
      .map((k) => `<option value="${esc(k)}">${esc(DATOS.escenarios[k].nombre)}</option>`).join("");
    sel.value = ESTADO.escenario;
    sel.addEventListener("change", () => {
      ESTADO.escenario = sel.value;
      renderEscenario();
      toast("Escenario: " + topo.nombre);
    });

    $("#btn-tema").addEventListener("click", () => R3.UI.alternarTema());

    $("#btn-ajustar").addEventListener("click", () => { motor.zonaSegura = zonaSegura(); motor.encuadrar(); });
    $("#btn-girar").addEventListener("click", (ev) => {
      const b = ev.currentTarget;
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      motor.setAutorotar(on);
    });
    $("#btn-trafico").addEventListener("click", (ev) => {
      const b = ev.currentTarget;
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      ESTADO.trafico = on;
      motor.setTrafico(on);
      pintarEscena();
    });

    $$("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-preset]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      motor.preset(b.dataset.preset);
    }));

    const prefijos = [];
    for (let p = 8; p <= 32; p++) prefijos.push(`<option value="${p}"${p === 24 ? " selected" : ""}>/${p} · ${numAip(mascaraDe(p))}</option>`);
    $("#calc-mask").innerHTML = prefijos.join("");
    $("#btn-calcular").addEventListener("click", calcularSubred);
    $("#calc-ip").addEventListener("keydown", (ev) => { if (ev.key === "Enter") calcularSubred(); });

    $("#glosario-buscar").addEventListener("input", (ev) => renderGlosario(ev.target.value));
    $("#btn-trazar").addEventListener("click", trazar);
    $("#btn-detener").addEventListener("click", () => { motor.limpiarFlujo(); toast("Simulación detenida"); });

    document.getElementById("vista-topologia").addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") { ESTADO.sel = null; motor.seleccionar(null, null); renderInspector(); }
    });

    renderEscenario();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();
})();
