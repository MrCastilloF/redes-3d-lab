/* =====================================================================================================
   ingesta.js — Convierte insumos reales en un escenario 3D, sin backend y sin dependencias.

   Entradas admitidas
     · .drawio / .xml  → topología (XML plano o comprimido en base64+deflate)
     · .docx           → texto (ZIP + word/document.xml)
     · .pdf            → texto (streams FlateDecode + mapas ToUnicode)
     · .txt .md .csv .json → texto; el JSON con {nodos, enlaces} se importa como escenario
     · imágenes        → evidencia visual adjunta a los nodos

   Contrato de salida (lo que consume la aplicación)
     { fuentes[], escenas[], documentos[], inventario{}, avisos[] }
   ===================================================================================================== */
(function (R3) {
  "use strict";

  const Codec = R3.Codec;
  const decodificadorUTF8 = new TextDecoder("utf-8", { fatal: false });
  const texto = (bytes) => decodificadorUTF8.decode(bytes);
  const latin1 = (bytes) => {
    let s = "";
    const trozo = 8192;
    for (let i = 0; i < bytes.length; i += trozo) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(bytes.length, i + trozo)));
    }
    return s;
  };

  /* ---------------------------------------------------------------- entidades HTML */
  const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", iexcl: "¡", iquest: "¿", ordm: "º", ordf: "ª", deg: "°", middot: "·", hellip: "…", ndash: "–", mdash: "—", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘" };
  function decodificarEntidades(s) {
    return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, cuerpo) => {
      if (cuerpo[0] === "#") {
        const cp = cuerpo[1] === "x" || cuerpo[1] === "X" ? parseInt(cuerpo.slice(2), 16) : parseInt(cuerpo.slice(1), 10);
        return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
      }
      return ENTIDADES[cuerpo] != null ? ENTIDADES[cuerpo] : m;
    });
  }
  /* Etiquetas de drawio suelen traer HTML escapado: <b>Router</b><br>LAN */
  function limpiarEtiqueta(s) {
    if (!s) return "";
    let t = decodificarEntidades(String(s));
    t = t.replace(/<\s*br\s*\/?\s*>/gi, " ").replace(/<\s*\/\s*(div|p|li|tr|h[1-6])\s*>/gi, " ");
    t = t.replace(/<[^>]+>/g, " ");
    t = decodificarEntidades(t);
    return t.replace(/\s+/g, " ").trim();
  }
  function atributos(cadena) {
    const o = {};
    const re = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let m;
    while ((m = re.exec(cadena))) o[m[1]] = m[3] != null ? m[3] : m[4];
    return o;
  }

  /* ------------------------------------------------------- inferencia de tipo de nodo */
  const REGLAS_TIPO = [
    ["nube", /\b(nube|cloud|internet|wan|isp|proveedor)\b/i],
    ["firewall", /\b(firewall|fortigate|pfsense|asa|utm|cortafuegos|per[ií]metro)\b/i],
    ["router", /\b(router|enrutador|gateway|puerta de enlace|core|borde)\b/i],
    ["switch", /\b(switch|conmutador|fortiswitch|bridge|uplink)\b/i],
    ["servidor", /\b(server|servidor|dns|dhcp|web|nas|smtp|sql|base de datos|controlador)\b/i],
    ["nvr", /\b(nvr|grabador|dvr)\b/i],
    ["camara", /\b(c[aá]mara|camera|cctv|ipcam)\b/i],
    ["ap", /\b(ap|access point|punto de acceso|wifi|wi-fi|fortiap)\b/i],
    ["telefono", /\b(tel[eé]fono|phone|voip|ip phone|softphone)\b/i],
    ["portatil", /\b(laptop|port[aá]til|notebook)\b/i],
    ["pc", /\b(pc|desktop|escritorio|workstation|cliente|host)\b/i],
    ["impresora", /\b(printer|impresora)\b/i]
  ];
  function tipoPorEtiqueta(etiqueta, estilo) {
    const s = (etiqueta || "") + " " + (estilo || "");
    for (const [tipo, re] of REGLAS_TIPO) if (re.test(s)) return tipo === "impresora" ? "pc" : tipo;
    if (/shape=(ellipse|cloud)/i.test(estilo || "")) return "nube";
    if (/shape=cylinder/i.test(estilo || "")) return "servidor";
    if (/mxgraph\.cisco\.(router|workgroup_router)/i.test(estilo || "")) return "router";
    if (/mxgraph\.cisco\.(switch|workgroup_switch)/i.test(estilo || "")) return "switch";
    return "desconocido";
  }
  /* Primera IPv4 que aparezca en una etiqueta ("PC 10.10.10.21" → "10.10.10.21") */
  function primeraIP(texto) {
    const m = /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\b/.exec(String(texto || ""));
    return m ? m[0] : "";
  }

  /* El color de acento de una forma es, casi siempre, su trazo; el relleno suele ser un fondo oscuro. */
  function colorDeEstilo(estilo) {
    const s = estilo || "";
    const m = /strokeColor=#([0-9a-fA-F]{3,8})/.exec(s) || /fillColor=#([0-9a-fA-F]{3,8})/.exec(s);
    if (!m) return null;
    let c = m[1];
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    if (c.length === 8) c = c.slice(0, 6);
    if (c.length !== 6) return null;
    return "#" + c.toLowerCase();
  }

  /* ------------------------------------------------------------------- .drawio */
  function esXml(s) { return /^\s*<(\?xml|mxfile|mxGraphModel|diagram)/i.test(s); }

  function descomprimirDrawio(b64) {
    const bytes = Codec.base64ABytes(b64);
    let xml;
    try { xml = texto(Codec.inflateRaw(bytes)); }
    catch (e) { xml = texto(Codec.inflateZlib(bytes)); }
    xml = xml.trim();
    if (xml.startsWith("%")) xml = decodeURIComponent(xml);   // formato antiguo (pako + escape)
    return xml;
  }

  function celdasDeXml(xml) {
    const etiquetasEnvoltorio = new Map();
    const reUO = /<(UserObject|object)\b([^>]*)>/g;
    let mu;
    while ((mu = reUO.exec(xml))) {
      const a = atributos(mu[2]);
      if (a.id) etiquetasEnvoltorio.set(a.id, a.label || a.value || "");
    }
    const celdas = [];
    const re = /<mxCell\b([^>]*?)(\/>|>([\s\S]*?)<\/mxCell>)/g;
    let m;
    while ((m = re.exec(xml))) {
      const a = atributos(m[1]);
      const cuerpo = m[3] || "";
      const g = /<mxGeometry\b([^>]*?)\/?>/.exec(cuerpo);
      const geo = g ? atributos(g[1]) : {};
      const valor = limpiarEtiqueta(a.value || etiquetasEnvoltorio.get(a.id) || "");
      celdas.push({
        id: a.id || "",
        padre: a.parent || "",
        valor,
        estilo: a.style || "",
        esVertice: a.vertex === "1" || (!a.edge && g != null),
        esEnlace: a.edge === "1" || (a.source != null && a.target != null),
        origen: a.source || "",
        destino: a.target || "",
        x: parseFloat(geo.x || "0") || 0,
        y: parseFloat(geo.y || "0") || 0,
        ancho: parseFloat(geo.width || "0") || 0,
        alto: parseFloat(geo.height || "0") || 0,
        relativo: geo.relative === "1"
      });
    }
    return celdas;
  }

  function grafoDeCeldas(celdas) {
    const porId = new Map(celdas.map((c) => [c.id, c]));
    const absoluta = (celda, visto) => {
      visto = visto || new Set();
      if (!celda || visto.has(celda.id)) return { x: celda ? celda.x : 0, y: celda ? celda.y : 0 };
      visto.add(celda.id);
      const padre = porId.get(celda.padre);
      if (!padre || !padre.esVertice || padre.id === "0") return { x: celda.x, y: celda.y };
      const pa = absoluta(padre, visto);
      return { x: pa.x + celda.x, y: pa.y + celda.y };
    };

    const nodos = [], zonas = [], enlaces = [];
    for (const c of celdas) {
      if (!c.esVertice || c.id === "0" || c.id === "1") continue;
      if (!c.valor && !(c.ancho > 60 && c.alto > 50)) continue;
      const p = absoluta(c);
      const hijos = celdas.filter((o) => o.padre === c.id && o.esVertice).length;
      const esContenedor = /swimlane|group|container=1/i.test(c.estilo) || (c.ancho >= 300 && c.alto >= 180);
      if (esContenedor || hijos >= 2) {
        zonas.push({ id: c.id, nombre: c.valor || "Zona", x0: p.x, y0: p.y, x1: p.x + c.ancho, y1: p.y + c.alto, color: colorDeEstilo(c.estilo) || null });
        // Un contenedor con contenido es un recinto: se dibuja como zona, no como dispositivo.
        if (hijos >= 1 || !c.valor) continue;
      }
      nodos.push({
        id: c.id,
        etiqueta: c.valor || c.id,
        tipo: tipoPorEtiqueta(c.valor, c.estilo),
        x: p.x, y: p.y, ancho: c.ancho, alto: c.alto,
        zona: zonas.find((z) => z.id === c.padre) ? c.padre : null,
        ip: primeraIP(c.valor),
        color: colorDeEstilo(c.estilo)
      });
    }
    const idsNodo = new Set(nodos.map((n) => n.id));
    for (const c of celdas) {
      if (!c.esEnlace) continue;
      if (!idsNodo.has(c.origen) || !idsNodo.has(c.destino)) continue;
      if (c.origen === c.destino) continue;
      enlaces.push({ id: c.id, a: c.origen, b: c.destino, etiqueta: c.valor, color: colorDeEstilo(c.estilo) });
    }
    return { nodos, enlaces, zonas };
  }

  function leerDrawio(datos, nombre) {
    const crudo = typeof datos === "string" ? datos.trim() : texto(datos).trim();
    const paginas = [];
    if (!esXml(crudo)) {
      paginas.push({ nombre: nombre || "Topología", ...grafoDeCeldas(celdasDeXml(descomprimirDrawio(crudo))) });
      return paginas;
    }
    const bloques = crudo.match(/<diagram\b[\s\S]*?<\/diagram>/g);
    if (!bloques) {
      const modelo = /<mxGraphModel\b[\s\S]*?<\/mxGraphModel>/.exec(crudo);
      if (!modelo) throw new Error("El archivo no contiene un diagrama de drawio reconocible");
      paginas.push({ nombre: nombre || "Topología", ...grafoDeCeldas(celdasDeXml(modelo[0])) });
      return paginas;
    }
    for (const bloque of bloques) {
      const cabecera = atributos(/<diagram\b([^>]*)>/.exec(bloque)[1]);
      const interior = bloque.replace(/^<diagram\b[^>]*>/, "").replace(/<\/diagram>$/, "").trim();
      let xml;
      if (/<mxGraphModel/i.test(interior)) xml = interior;
      else { try { xml = descomprimirDrawio(interior); } catch (e) { continue; } }
      paginas.push({ nombre: cabecera.name || nombre || "Página", ...grafoDeCeldas(celdasDeXml(xml)) });
    }
    return paginas;
  }

  /* --------------------------------------------------------------------- .docx */
  function leerDocx(bytes) {
    const zip = Codec.leerZip(bytes);
    const partes = ["word/document.xml", "word/footnotes.xml", "word/endnotes.xml"];
    let xml = "";
    for (const p of partes) if (zip.has(p)) xml += texto(zip.get(p));
    if (!xml) throw new Error("El .docx no contiene word/document.xml");
    const parrafos = xml
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<w:br\/>/g, "\n")
      .split(/<\/w:p>/)
      .map((p) => limpiarEtiqueta(p.replace(/<w:instrText[\s\S]*?<\/w:instrText>/g, " ")))
      .filter((p) => p.length > 0);
    return { texto: parrafos.join("\n"), parrafos: parrafos.length };
  }

  /* ---------------------------------------------------------------------- PDF */
  function objetosPdf(lat) {
    const objs = new Map();
    const re = /(\d+)\s+(\d+)\s+obj\b/g;
    let m;
    while ((m = re.exec(lat))) {
      const num = parseInt(m[1], 10);
      const inicio = m.index + m[0].length;
      let fin = lat.indexOf("endobj", inicio);
      if (fin < 0) fin = lat.length;
      const cuerpo = lat.slice(inicio, fin);
      const idx = cuerpo.indexOf("stream");
      let dict = cuerpo, sIni = -1, sFin = -1;
      if (idx >= 0) {
        dict = cuerpo.slice(0, idx);
        let p = inicio + idx + 6;
        if (lat[p] === "\r") p++;
        if (lat[p] === "\n") p++;
        const e = cuerpo.indexOf("endstream", idx);
        sIni = p;
        sFin = e < 0 ? fin : inicio + e;
      }
      objs.set(num, { dict, sIni, sFin, num });
    }
    return objs;
  }

  function flujoDe(objs, num, bytes) {
    const o = objs.get(num);
    if (!o || o.sIni < 0 || o.sFin <= o.sIni) return null;
    const crudo = bytes.subarray(o.sIni, o.sFin);
    if (/FlateDecode/.test(o.dict)) {
      try { return Codec.inflateZlib(crudo); } catch (e) { try { return Codec.inflateRaw(crudo); } catch (e2) { return null; } }
    }
    return crudo;
  }

  function hexABytes(h) {
    const limpio = String(h).replace(/[^0-9a-fA-F]/g, "");
    const pares = limpio.length >> 1;
    const out = new Uint8Array(pares);
    for (let i = 0; i < pares; i++) out[i] = parseInt(limpio.substr(i * 2, 2), 16);
    return out;
  }
  function codigoAtexto(bytes, desde, ancho) {
    let s = "";
    for (let i = desde; i + ancho <= bytes.length; i += ancho) {
      const cp = ancho === 2 ? (bytes[i] << 8) | bytes[i + 1] : bytes[i];
      s += String.fromCodePoint(cp);
    }
    return s;
  }

  function mapaToUnicode(txt) {
    const mapa = new Map();
    const bloquesChar = txt.match(/beginbfchar([\s\S]*?)endbfchar/g) || [];
    for (const b of bloquesChar) {
      const pares = b.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g) || [];
      for (const p of pares) {
        const m = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/.exec(p);
        mapa.set(parseInt(m[1], 16), codigoAtexto(hexABytes(m[2]), 0, 2));
      }
    }
    const bloquesRango = txt.match(/beginbfrange([\s\S]*?)endbfrange/g) || [];
    for (const b of bloquesRango) {
      const filas = b.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]+>|\[[^\]]*\])/g) || [];
      for (const fila of filas) {
        const m = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]+>|\[[^\]]*\])/.exec(fila);
        const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16);
        if (hi - lo > 65535) continue;
        const dest = m[3];
        if (dest.startsWith("[")) {
          const items = dest.match(/<[0-9a-fA-F]+>/g) || [];
          for (let i = 0; i <= hi - lo && i < items.length; i++) {
            mapa.set(lo + i, codigoAtexto(hexABytes(items[i]), 0, 2));
          }
        } else {
          const base = hexABytes(dest);
          for (let i = 0; i <= hi - lo; i++) {
            const copia = new Uint8Array(base);
            const ultimo = copia.length - 1;
            copia[ultimo] = (copia[ultimo] + i) & 0xff;
            mapa.set(lo + i, codigoAtexto(copia, 0, copia.length > 1 ? 2 : 1));
          }
        }
      }
    }
    return mapa;
  }

  function fuenteToUnicode(objs, num, bytes, cache) {
    if (cache.has(num)) return cache.get(num);
    const o = objs.get(num);
    let mapa = null;
    if (o) {
      const m = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(o.dict);
      if (m) {
        const flujo = flujoDe(objs, parseInt(m[1], 10), bytes);
        if (flujo) mapa = mapaToUnicode(latin1(flujo));
      }
    }
    cache.set(num, mapa);
    return mapa;
  }

  function decodificarLiteral(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "\\") {
        const n = s[++i];
        if (n === "n") out.push(10);
        else if (n === "r") out.push(13);
        else if (n === "t") out.push(9);
        else if (n === "b") out.push(8);
        else if (n === "f") out.push(12);
        else if (n === "(" || n === ")" || n === "\\") out.push(n.charCodeAt(0));
        else if (/[0-7]/.test(n)) {
          let oct = n;
          while (oct.length < 3 && /[0-7]/.test(s[i + 1])) oct += s[++i];
          out.push(parseInt(oct, 8) & 0xff);
        } else if (n === "\n") { /* continuación de línea */ }
        else out.push(n ? n.charCodeAt(0) : 0);
      } else out.push(c.charCodeAt(0));
    }
    return new Uint8Array(out);
  }

  function decodificarConMapa(bytes, mapa) {
    if (!mapa || !mapa.size) return latin1(bytes);
    let s = "";
    const dosBytes = Array.from(mapa.keys()).some((k) => k > 255);
    if (dosBytes) {
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const cp = (bytes[i] << 8) | bytes[i + 1];
        s += mapa.has(cp) ? mapa.get(cp) : "";
      }
    } else {
      for (let i = 0; i < bytes.length; i++) s += mapa.has(bytes[i]) ? mapa.get(bytes[i]) : String.fromCharCode(bytes[i]);
    }
    return s;
  }

  // Grupos: 1=nombre de fuente (Tf) · 2=cadena hexadecimal · 3,4=desplazamiento (Td/TD)
  const TOKEN_PDF = /\/([^\s/\[\]<>(){}]+)\s+[-\d.]+\s+Tf|\((?:[^()\\]|\\.)*\)|\[(?:[^\[\]]|\\.)*\]\s*TJ|<([0-9a-fA-F\s]+)>|T\*|(-?[\d.]+)\s+(-?[\d.]+)\s+(?:Td|TD)|BT|ET/g;

  function extraerTextoDeFlujo(contenido, fuentesPorNombre, objs, bytes, cache) {
    let salida = "", mapaActual = null;
    let m;
    TOKEN_PDF.lastIndex = 0;
    const pendientes = [];
    while ((m = TOKEN_PDF.exec(contenido))) {
      const tok = m[0];
      if (m[1]) {                                   // /F1 12 Tf
        const numFuente = fuentesPorNombre.get(m[1]);
        mapaActual = numFuente != null ? fuenteToUnicode(objs, numFuente, bytes, cache) : null;
        continue;
      }
      if (m[2] != null) {                           // <hex> Tj
        salida += decodificarConMapa(hexABytes(m[2]), mapaActual);
        continue;
      }
      if (tok === "BT") { pendientes.length = 0; continue; }
      if (tok === "ET") { if (salida && !/\s$/.test(salida)) salida += "\n"; continue; }
      if (tok === "T*" || m[3] != null) { if (salida && !/\s$/.test(salida)) salida += "\n"; continue; }
      if (tok.endsWith("TJ")) {
        const trozos = tok.match(/\((?:[^()\\]|\\.)*\)|<[0-9a-fA-F\s]+>/g) || [];
        for (const t of trozos) {
          if (t[0] === "<") salida += decodificarConMapa(hexABytes(t), mapaActual);
          else salida += decodificarConMapa(decodificarLiteral(t.slice(1, -1)), mapaActual);
        }
        continue;
      }
      if (tok[0] === "(") {                          // (texto) Tj
        const contenidoLiteral = tok.slice(1, -1);
        salida += decodificarConMapa(decodificarLiteral(contenidoLiteral), mapaActual);
        continue;
      }
    }
    return salida;
  }

  function leerPdf(bytes) {
    const lat = latin1(bytes);
    const objs = objetosPdf(lat);
    const cache = new Map();

    // 1. objetos que son fuentes y su ToUnicode
    const fuentes = new Set();
    for (const [num, o] of objs) if (/\/Type\s*\/Font/.test(o.dict)) fuentes.add(num);

    // 2. nombre de recurso (/F1) → número de objeto de fuente
    const fuentesPorNombre = new Map();
    const reRef = /\/([A-Za-z0-9#_.+-]+)\s+(\d+)\s+0\s+R/g;
    let m;
    while ((m = reRef.exec(lat))) {
      const num = parseInt(m[2], 10);
      if (fuentes.has(num) && !fuentesPorNombre.has(m[1])) fuentesPorNombre.set(m[1], num);
    }

    // 3. flujos de contenido con operadores de texto
    let total = "", paginas = 0;
    for (const [num, o] of objs) {
      if (o.sIni < 0) continue;
      if (/\/Type\s*\/(Font|XObject|Metadata)/.test(o.dict)) continue;
      const flujo = flujoDe(objs, num, bytes);
      if (!flujo || flujo.length < 8) continue;
      const contenido = latin1(flujo);
      if (!/\bBT\b/.test(contenido) || !/(Tj|TJ)/.test(contenido)) continue;
      const t = extraerTextoDeFlujo(contenido, fuentesPorNombre, objs, bytes, cache);
      if (t && t.trim().length) { total += t + "\n\n"; paginas++; }
      if (total.length > 600000) break;
    }
    return {
      texto: total.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(),
      paginas,
      fuentes: fuentes.size
    };
  }

  /* --------------------------------------------------------- análisis de documentos */
  const RE_IP = /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\b/g;
  const RE_VLAN = /\bVLAN\s*#?\s*(\d{1,4})\b/gi;
  const RE_CIDR = /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/(?:3[0-2]|[12]?\d)\b/g;
  const RE_HOST = /\b[a-z0-9][a-z0-9-]{1,62}\.(?:local|lan|corp|internal|intranet|edu|edu\.[a-z]{2}|com|net|org|io)\b/gi;

  function contexto(texto, indice, radio) {
    const r = radio || 90;
    const ini = Math.max(0, indice - r), fin = Math.min(texto.length, indice + r);
    return texto.slice(ini, fin).replace(/\s+/g, " ").trim();
  }

  function analizarDocumento(texto, fuente) {
    const ips = [], vlans = new Map(), cidrs = new Set(), hosts = new Set();
    let m;
    RE_IP.lastIndex = 0;
    while ((m = RE_IP.exec(texto))) {
      ips.push({ valor: m[0], fuente, contexto: contexto(texto, m.index) });
      if (ips.length > 400) break;
    }
    RE_VLAN.lastIndex = 0;
    while ((m = RE_VLAN.exec(texto))) {
      const id = parseInt(m[1], 10);
      if (!vlans.has(id)) vlans.set(id, { id, fuente, contexto: contexto(texto, m.index) });
    }
    RE_CIDR.lastIndex = 0;
    while ((m = RE_CIDR.exec(texto))) cidrs.add(m[0]);
    RE_HOST.lastIndex = 0;
    while ((m = RE_HOST.exec(texto))) hosts.add(m[0].toLowerCase());
    return {
      fuente,
      caracteres: texto.length,
      ips,
      vlans: Array.from(vlans.values()),
      cidrs: Array.from(cidrs),
      hosts: Array.from(hosts)
    };
  }

  /* -------------------------------------------------------- gráfico → escena 3D */
  const ALTO_POR_TIPO = R3.ALTURA_TIPO || {};

  function aEscena(grafo, opciones) {
    opciones = opciones || {};
    const nodos = grafo.nodos || [];
    if (!nodos.length) return { nodos: [], enlaces: [], zonas: [] };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodos) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    }
    for (const z of grafo.zonas || []) {
      minX = Math.min(minX, z.x0); maxX = Math.max(maxX, z.x1);
      minY = Math.min(minY, z.y0); maxY = Math.max(maxY, z.y1);
    }
    const ancho = Math.max(1, maxX - minX), alto = Math.max(1, maxY - minY);
    const objetivo = opciones.anchoMundo || 24;      // unidades de mundo del lado mayor
    const escala = Math.max(ancho, alto) / objetivo;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

    const convertir = (x, y) => ({ x: (x - cx) / escala, z: (y - cy) / escala });
    const porId = new Map();

    const escenaNodos = nodos.slice(0, 260).map((n) => {
      const p = convertir(n.x + (n.ancho || 0) / 2, n.y + (n.alto || 0) / 2);
      const nodo = {
        id: n.id,
        tipo: n.tipo || "desconocido",
        nombre: n.etiqueta || n.id,
        sub: n.sub || (n.zona ? (grafo.zonas.find((z) => z.id === n.zona) || {}).nombre || "" : ""),
        x: p.x, z: p.z,
        color: n.color || null,
        estadoColor: "#34d399",
        etiqueta: n.ip || primeraIP(n.etiqueta) || ""
      };
      porId.set(n.id, nodo);
      return nodo;
    });

    const escenaEnlaces = (grafo.enlaces || []).filter((l) => porId.has(l.a) && porId.has(l.b)).map((l) => ({
      id: l.id,
      a: l.a, b: l.b,
      color: l.color || "#64748b",
      grosor: 3,
      tipo: "acceso",
      rotulo: l.etiqueta || "",
      traficoAmbiente: true
    }));

    const escenaZonas = (grafo.zonas || []).map((z) => {
      const a = convertir(z.x0, z.y0), b = convertir(z.x1, z.y1);
      return { nombre: z.nombre, x0: a.x, z0: a.z, x1: b.x, z1: b.z, color: z.color || "#38bdf8" };
    }).filter((z) => Math.abs(z.x1 - z.x0) > 0.5 && Math.abs(z.z1 - z.z0) > 0.5);

    return { nodos: escenaNodos, enlaces: escenaEnlaces, zonas: escenaZonas };
  }

  /* ---------------------------------------------------------- escena de inventario */
  function escenaInventario(inventario) {
    const ips = inventario.ips || [];
    if (ips.length < 2) return null;
    const vistos = new Set();
    const unicas = [];
    for (const it of ips) {
      if (vistos.has(it.valor)) continue;
      vistos.add(it.valor);
      unicas.push(it);
      if (unicas.length >= 40) break;
    }
    const subred = (ip) => ip.split(".").slice(0, 3).join(".");
    const grupos = new Map();
    for (const it of unicas) {
      const s = subred(it.valor);
      if (!grupos.has(s)) grupos.set(s, []);
      grupos.get(s).push(it);
    }
    const nodos = [], zonas = [];
    let fila = 0;
    const colores = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#22d3ee", "#f472b6", "#94a3b8"];
    for (const [red, lista] of grupos) {
      const zx = (fila % 3) * 9 - 9;
      const zz = Math.floor(fila / 3) * 5 - 2;
      zonas.push({ nombre: red + ".0/24", x0: zx - 3.6, z0: zz - 2, x1: zx + 3.6, z1: zz + 2, color: colores[fila % colores.length] });
      lista.forEach((it, i) => {
        nodos.push({
          id: "ip-" + it.valor,
          tipo: R3.engine && R3.engine.tipoPorIP ? R3.engine.tipoPorIP(it.valor) : "pc",
          nombre: it.valor,
          sub: "documentado en " + it.fuente,
          x: zx - 2.4 + (i % 4) * 1.6,
          z: zz - 1 + Math.floor(i / 4) * 1.5,
          color: colores[fila % colores.length],
          estadoColor: "#34d399"
        });
      });
      fila++;
    }
    return { nodos, enlaces: [], zonas };
  }

  /* ---------------------------------------------------------------- orquestador */
  function tipoDeArchivo(nombre, tipoMime) {
    const ext = (nombre.split(".").pop() || "").toLowerCase();
    if (ext === "drawio" || ext === "dio" || (ext === "xml" && /drawio/i.test(nombre))) return "drawio";
    if (ext === "docx") return "docx";
    if (ext === "pdf") return "pdf";
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "imagen";
    if (["txt", "md", "markdown", "csv", "tsv", "log"].includes(ext)) return "texto";
    if (ext === "json") return "json";
    if (ext === "doc") return "doc-antiguo";
    if (ext === "xlsx" || ext === "xls") return "hoja";
    if (tipoMime && /pdf/.test(tipoMime)) return "pdf";
    if (tipoMime && /image/.test(tipoMime)) return "imagen";
    if (tipoMime && /json/.test(tipoMime)) return "json";
    if (tipoMime && /text/.test(tipoMime)) return "texto";
    return "desconocido";
  }

  async function leerArchivo(archivo) {
    if (archivo.arrayBuffer) return new Uint8Array(await archivo.arrayBuffer());
    if (archivo instanceof Uint8Array) return archivo;
    return new Uint8Array(archivo);
  }

  async function procesar(archivos, opciones) {
    opciones = opciones || {};
    const fuentes = [], escenas = [], documentos = [], imagenes = [], avisos = [];
    const inventario = { ips: [], vlans: [], cidrs: [], hosts: [] };

    for (const archivo of archivos) {
      const nombre = archivo.name || "archivo";
      const tipo = tipoDeArchivo(nombre, archivo.type);
      const registro = { nombre, tipo, bytes: archivo.size || 0, ok: false, detalle: "" };
      try {
        const bytes = await leerArchivo(archivo);
        registro.bytes = bytes.length;
        if (tipo === "drawio") {
          const paginas = leerDrawio(bytes, nombre.replace(/\.(drawio|xml|dio)$/i, ""));
          let conNodos = 0;
          for (const p of paginas) {
            if (!p.nodos.length) continue;
            conNodos++;
            escenas.push({ nombre: p.nombre || nombre, fuente: nombre, grafo: p });
          }
          registro.ok = conNodos > 0;
          registro.detalle = `${paginas.length} página(s), ${conNodos} con topología`;
          if (!conNodos) avisos.push(`${nombre}: el diagrama no tiene formas con etiqueta reconocibles.`);
        } else if (tipo === "docx") {
          const r = leerDocx(bytes);
          documentos.push({ fuente: nombre, texto: r.texto, parrafos: r.parrafos });
          registro.ok = r.texto.length > 0;
          registro.detalle = `${r.parrafos} párrafos, ${r.texto.length} caracteres`;
        } else if (tipo === "pdf") {
          const r = leerPdf(bytes);
          documentos.push({ fuente: nombre, texto: r.texto, paginas: r.paginas });
          registro.ok = r.texto.length > 0;
          registro.detalle = r.texto.length
            ? `${r.paginas} flujo(s) de texto, ${r.texto.length} caracteres`
            : "sin capa de texto (¿PDF escaneado? requiere OCR, fuera de alcance)";
          if (!r.texto.length) avisos.push(`${nombre}: no se encontró texto seleccionable; se puede adjuntar como imagen.`);
        } else if (tipo === "texto" || tipo === "json") {
          const t = texto(bytes);
          if (tipo === "json") {
            try {
              const j = JSON.parse(t);
              if (j && Array.isArray(j.nodos)) {
                escenas.push({
                  nombre: j.nombre || nombre, fuente: nombre,
                  grafo: {
                    nodos: j.nodos.map((n, i) => ({
                      id: n.id || "n" + i,
                      etiqueta: n.nombre || n.etiqueta || n.id || "nodo " + i,
                      tipo: n.tipo || "desconocido",
                      x: (n.x != null ? n.x : i * 120), y: (n.z != null ? n.z * 100 : (n.y != null ? n.y : 0)),
                      ancho: 80, alto: 40, color: n.color || null
                    })),
                    enlaces: (j.enlaces || []).map((l, i) => ({ id: l.id || "e" + i, a: l.a, b: l.b, etiqueta: l.rotulo || l.etiqueta || "" })),
                    zonas: (j.zonas || []).map((z, i) => ({ id: "z" + i, nombre: z.nombre, x0: z.x0 * 100, y0: z.z0 * 100, x1: z.x1 * 100, y1: z.z1 * 100, color: z.color }))
                  }
                });
                registro.ok = true;
                registro.detalle = `escena importada: ${j.nodos.length} nodos`;
              }
            } catch (e) { /* JSON no válido: se trata como texto */ }
          }
          if (!registro.ok) {
            documentos.push({ fuente: nombre, texto: t });
            registro.ok = true;
            registro.detalle = `${t.length} caracteres de texto`;
          }
        } else if (tipo === "imagen") {
          const mime = archivo.type || (/\.svg$/i.test(nombre) ? "image/svg+xml" : "image/png");
          if (bytes.length > 8 * 1024 * 1024) {
            registro.detalle = "imagen mayor de 8 MB: se registra sin vista previa";
            imagenes.push({ fuente: nombre, bytes: bytes.length, mime, datos: null });
          } else {
            imagenes.push({ fuente: nombre, bytes: bytes.length, mime, datos: `data:${mime};base64,${btoa_(bytes)}` });
            registro.detalle = "evidencia visual adjunta";
          }
          registro.ok = true;
        } else {
          registro.detalle = "formato no soportado (usa .drawio, .pdf, .docx, .txt, .md, .csv, .json o imágenes)";
          avisos.push(`${nombre}: ${registro.detalle}`);
        }
      } catch (e) {
        registro.detalle = "error: " + e.message;
        avisos.push(`${nombre}: ${e.message}`);
      }
      fuentes.push(registro);
    }

    // Análisis de documentos: inventario + evidencias
    for (const doc of documentos) {
      const a = analizarDocumento(doc.texto, doc.fuente);
      doc.analisis = a;
      inventario.ips.push(...a.ips);
      for (const v of a.vlans) if (!inventario.vlans.some((x) => x.id === v.id)) inventario.vlans.push(v);
      for (const c of a.cidrs) if (!inventario.cidrs.includes(c)) inventario.cidrs.push(c);
      for (const h of a.hosts) if (!inventario.hosts.includes(h)) inventario.hosts.push(h);
    }

    // Si no hay topología declarada pero sí direcciones documentadas, se ofrece una escena de inventario
    let escenaInventarioGenerada = null;
    if (!escenas.length && inventario.ips.length >= 2) {
      escenaInventarioGenerada = escenaInventario(inventario);
      if (escenaInventarioGenerada) {
        escenas.push({ nombre: "Inventario documentado", fuente: "documentos", grafo: { nodos: [], enlaces: [], zonas: [] }, escenaDirecta: escenaInventarioGenerada });
        avisos.push("No había .drawio: se generó una escena de inventario con las direcciones IP documentadas (sin enlaces, porque el documento no declara conexiones).");
      }
    }

    return { fuentes, escenas, documentos, imagenes, inventario, avisos };
  }

  function btoa_(bytes) {
    let s = "";
    const trozo = 4096;
    for (let i = 0; i < bytes.length; i += trozo) s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(bytes.length, i + trozo)));
    return btoa(s);
  }

  /* Evidencias de un nodo: coincidencias de su etiqueta/IP en los documentos */
  function evidenciasDe(nodo, documentos, limite) {
    const salida = [];
    const etiqueta = limpiarEtiqueta(nodo.nombre || "");
    const agujas = [];
    if (etiqueta && etiqueta.length >= 3) agujas.push(etiqueta);
    if (nodo.ip) agujas.push(nodo.ip);
    for (const doc of documentos) {
      const t = doc.texto || "";
      for (const aguja of agujas) {
        let idx = t.toLowerCase().indexOf(aguja.toLowerCase());
        let cuenta = 0;
        while (idx >= 0 && cuenta < 2) {
          salida.push({ fuente: doc.fuente, aguja, cita: contexto(t, idx, 110) });
          idx = t.toLowerCase().indexOf(aguja.toLowerCase(), idx + aguja.length);
          cuenta++;
        }
      }
      if (salida.length >= (limite || 6)) break;
    }
    return salida.slice(0, limite || 6);
  }

  R3.Ingesta = {
    procesar, leerDrawio, leerDocx, leerPdf, analizarDocumento,
    aEscena, escenaInventario, evidenciasDe, tipoDeArchivo, primeraIP,
    limpiarEtiqueta, tipoPorEtiqueta, descomprimirDrawio
  };
})(window.R3 = window.R3 || {});
