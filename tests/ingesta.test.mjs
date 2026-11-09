/* _qa/test-ingesta.mjs — pruebas del pipeline de insumos con archivos reales generados aquí mismo. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import vm from "node:vm";

const RAIZ = path.resolve(import.meta.dirname, "..", "assets", "core");
const ctx = { window: {}, TextDecoder, TextEncoder, Uint8Array, atob, btoa, console };
vm.createContext(ctx);
for (const f of ["codec.js", "ingesta.js"]) {
  vm.runInContext(fs.readFileSync(path.join(RAIZ, f), "utf8"), ctx, { filename: f });
}
const R3 = ctx.window.R3;
const I = R3.Ingesta;

let ok = 0, mal = 0;
const prueba = async (nombre, fn) => {
  try { const r = await fn(); console.log(`  ✓ ${nombre}${r ? " — " + r : ""}`); ok++; }
  catch (e) { console.error(`  ✗ ${nombre}: ${e.message}`); mal++; }
};
const assert = (c, msg) => { if (!c) throw new Error(msg); };

/* ------------------------------------------------------------------ fixtures drawio */
const XML_DRAWIO = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
  <diagram id="p1" name="Campus">
    <mxGraphModel dx="1200" dy="800" grid="1" page="1">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="z1" value="Edificio A" style="swimlane;fillColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="0" y="0" width="400" height="300" as="geometry"/>
        </mxCell>
        <mxCell id="r1" value="&lt;b&gt;Router&lt;/b&gt; borde" style="shape=mxgraph.cisco.routers.router;strokeColor=#38bdf8;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="80" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="sw1" value="Switch A" style="rounded=0;" vertex="1" parent="z1">
          <mxGeometry x="60" y="120" width="80" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="pc1" value="PC Administración" style="rounded=0;" vertex="1" parent="z1">
          <mxGeometry x="200" y="200" width="80" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="fw1" value="FortiGate 200G" style="strokeColor=#fb923c;" vertex="1" parent="1">
          <mxGeometry x="200" y="40" width="80" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="r1" target="fw1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e2" value="trunk 802.1Q" edge="1" parent="1" source="fw1" target="sw1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e3" edge="1" parent="1" source="sw1" target="pc1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e4" edge="1" parent="1" source="pc1" target="noexiste">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

console.log("drawio");
await prueba("XML plano: nodos, enlaces, zonas y etiquetas HTML", () => {
  const paginas = I.leerDrawio(XML_DRAWIO, "campus");
  assert(paginas.length === 1, "esperaba 1 página");
  const p = paginas[0];
  assert(p.nodos.length === 4, "esperaba 4 nodos, hay " + p.nodos.length);
  const router = p.nodos.find((n) => n.id === "r1");
  assert(router.etiqueta.includes("Router"), "etiqueta HTML no limpiada: " + router.etiqueta);
  assert(router.tipo === "router", "tipo incorrecto: " + router.tipo);
  assert(p.nodos.find((n) => n.id === "pc1").tipo === "pc", "PC mal clasificado");
  assert(p.nodos.find((n) => n.id === "fw1").tipo === "firewall", "firewall mal clasificado");
  assert(p.enlaces.length === 3, "esperaba 3 enlaces válidos, hay " + p.enlaces.length);
  assert(p.zonas.length === 1 && p.zonas[0].nombre === "Edificio A", "zona no detectada");
  const pc = p.nodos.find((n) => n.id === "pc1");
  assert(pc.x >= 60 && pc.y >= 120, "coordenadas relativas al contenedor no resueltas: " + pc.x + "," + pc.y);
  return `${p.nodos.length} nodos · ${p.enlaces.length} enlaces · ${p.zonas.length} zona`;
});

await prueba("XML comprimido (base64 + deflate + escape)", () => {
  const interior = XML_DRAWIO.replace(/^[\s\S]*?<diagram[^>]*>/, "").replace(/<\/diagram>[\s\S]*$/, "");
  const comprimido = zlib.deflateRawSync(Buffer.from(encodeURIComponent(interior), "utf8"));
  const b64 = comprimido.toString("base64");
  const paginas = I.leerDrawio(b64, "campus");
  assert(paginas.length === 1, "esperaba 1 página");
  assert(paginas[0].nodos.length === 4, "nodos: " + paginas[0].nodos.length);
  return "mismo resultado que el XML plano";
});

await prueba("aEscena normaliza a unidades de mundo y conserva zonas", () => {
  const p = I.leerDrawio(XML_DRAWIO, "campus")[0];
  const esc = I.aEscena(p);
  assert(esc.nodos.length === 4, "nodos " + esc.nodos.length);
  const xs = esc.nodos.map((n) => n.x), zs = esc.nodos.map((n) => n.z);
  assert(Math.max(...xs) - Math.min(...xs) <= 26, "el ancho del mundo se dispara: " + (Math.max(...xs) - Math.min(...xs)));
  assert(esc.zonas.length === 1, "zonas " + esc.zonas.length);
  const z = esc.zonas[0];
  assert(z.x1 > z.x0 && z.z1 > z.z0, "zona degenerada");
  const dentro = esc.nodos.every((n) => n.x >= z.x0 - 0.5 && n.x <= z.x1 + 0.5);
  assert(dentro, "algún nodo cae fuera de su zona");
  return `${esc.nodos.length} nodos, ${esc.zonas.length} zona, mundo ${(Math.max(...xs) - Math.min(...xs)).toFixed(1)}×${(Math.max(...zs) - Math.min(...zs)).toFixed(1)}`;
});

/* --------------------------------------------------------------------- fixtures docx */
function escribirZip(entradas) {
  const trozos = [], central = [];
  let offset = 0;
  const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
  for (const { nombre, datos } of entradas) {
    const nombreB = Buffer.from(nombre, "utf8");
    const crudo = Buffer.from(datos);
    const comp = zlib.deflateRawSync(crudo);
    const cab = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), u16(20), u16(0), u16(8), u16(0), u16(0), u32(0), u32(comp.length), u32(crudo.length), u16(nombreB.length), u16(0), nombreB]);
    trozos.push(cab, comp);
    central.push(Buffer.concat([Buffer.from([0x50, 0x4b, 0x01, 0x02]), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0), u32(0), u32(comp.length), u32(crudo.length), u16(nombreB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nombreB]));
    offset += cab.length + comp.length;
  }
  const dir = Buffer.concat(central);
  return Buffer.concat([...trozos, dir, Buffer.from([0x50, 0x4b, 0x05, 0x06]), u16(0), u16(0), u16(entradas.length), u16(entradas.length), u32(dir.length), u32(offset), u16(0)]);
}

console.log("\ndocx");
await prueba("extrae párrafos de word/document.xml", () => {
  const xml = `<w:document><w:body>
    <w:p><w:r><w:t>Inventario de red del colegio</w:t></w:r></w:p>
    <w:p><w:r><w:t>El FortiGate 200G usa 10.10.99.1/24 y la VLAN 30 para estudiantes.</w:t></w:r></w:p>
  </w:body></w:document>`;
  const zip = escribirZip([{ nombre: "word/document.xml", datos: Buffer.from(xml, "utf8") }]);
  const r = I.leerDocx(new Uint8Array(zip));
  assert(r.texto.includes("FortiGate 200G"), "texto no extraído");
  assert(r.parrafos === 2, "párrafos: " + r.parrafos);
  return `${r.parrafos} párrafos, ${r.texto.length} caracteres`;
});

/* ---------------------------------------------------------------------- fixture PDF */
function pdfDePrueba(textoVisible) {
  const chars = Array.from(textoVisible);
  let cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CMapName /Test def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${chars.length} beginbfchar\n`;
  let hex = "";
  chars.forEach((c, i) => {
    const code = (0x0100 + i).toString(16).padStart(4, "0");
    const cp = c.codePointAt(0).toString(16).padStart(4, "0");
    cmap += `<${code}> <${cp}>\n`;
    hex += code;
  });
  cmap += "endbfchar\nendcmap\nend end\n";

  const contenido = `BT\n/F1 12 Tf\n72 720 Td\n<${hex}> Tj\nET\n`;
  const contenidoZ = zlib.deflateSync(Buffer.from(contenido, "latin1"));
  const cmapZ = zlib.deflateSync(Buffer.from(cmap, "latin1"));

  const partes = [];
  const push = (s) => partes.push(Buffer.isBuffer(s) ? s : Buffer.from(s, "latin1"));
  push("%PDF-1.4\n");
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>\nendobj\n");
  push("4 0 obj\n<< /Type /Font /Subtype /Type0 /BaseFont /ABCDEF+Prueba /Encoding /Identity-H /ToUnicode 5 0 R >>\nendobj\n");
  push(`5 0 obj\n<< /Length ${cmapZ.length} /Filter /FlateDecode >>\nstream\n`);
  push(cmapZ);
  push("\nendstream\nendobj\n");
  push(`6 0 obj\n<< /Length ${contenidoZ.length} /Filter /FlateDecode >>\nstream\n`);
  push(contenidoZ);
  push("\nendstream\nendobj\n");
  push("trailer\n<< /Root 1 0 R >>\n%%EOF\n");
  return Buffer.concat(partes);
}

console.log("\npdf");
await prueba("extrae texto con FlateDecode + ToUnicode (Identity-H)", () => {
  const original = "Nucleo FortiGate VLAN 30 con 10.10.30.1";
  const pdf = pdfDePrueba(original);
  const r = I.leerPdf(new Uint8Array(pdf));
  assert(r.texto.includes("Nucleo FortiGate"), "texto no recuperado: " + JSON.stringify(r.texto.slice(0, 80)));
  assert(r.texto.includes("VLAN 30"), "no se recuperó la segunda mitad");
  assert(r.paginas >= 1, "páginas " + r.paginas);
  return `"${r.texto.slice(0, 40)}…" (${r.texto.length} caracteres)`;
});

await prueba("analiza IP, VLAN y CIDR del texto", () => {
  const a = I.analizarDocumento("El gateway 10.10.30.1 pertenece a la VLAN 30 y la red 10.10.30.0/24. También 192.168.1.5.", "doc.txt");
  assert(a.ips.length === 3, "IPs: " + a.ips.length);
  assert(a.vlans.length === 1 && a.vlans[0].id === 30, "VLAN no detectada");
  assert(a.cidrs.includes("10.10.30.0/24"), "CIDR no detectado: " + a.cidrs.join(","));
  assert(a.ips[0].contexto.includes("gateway"), "contexto no capturado");
  return `${a.ips.length} IPs, ${a.vlans.length} VLAN, ${a.cidrs.length} CIDR`;
});

/* ----------------------------------------------------------------- orquestador */
console.log("\nprocesar()");
const archivo = (nombre, bytes) => ({ name: nombre, type: "", size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

await await prueba("drawio + docx + pdf producen una escena con documentos analizados", async () => {
  const docx = escribirZip([{ nombre: "word/document.xml", datos: Buffer.from("<w:document><w:body><w:p><w:r><w:t>FortiGate 200G administra la VLAN 30 con 10.10.99.1</w:t></w:r></w:p></w:body></w:document>", "utf8") }]);
  const pdf = pdfDePrueba("PC Administracion 10.10.10.21 conectada al Switch A");
  const r = await I.procesar([
    archivo("campus.drawio", new Uint8Array(Buffer.from(XML_DRAWIO, "utf8"))),
    archivo("informe.docx", new Uint8Array(docx)),
    archivo("plano.pdf", new Uint8Array(pdf))
  ]);
  assert(r.fuentes.length === 3, "fuentes " + r.fuentes.length);
  assert(r.escenas.length === 1, "escenas " + r.escenas.length);
  assert(r.documentos.length === 2, "documentos " + r.documentos.length);
  assert(r.inventario.ips.length >= 2, "inventario " + r.inventario.ips.length);
  assert(r.fuentes.every((f) => f.ok), "alguna fuente falló: " + JSON.stringify(r.fuentes.filter((f) => !f.ok)));
  return `${r.escenas.length} escena, ${r.documentos.length} documentos, ${r.inventario.ips.length} IPs`;
});

await prueba("sólo documentos: genera escena de inventario y avisa", () => {
  return I.procesar([archivo("notas.txt", new Uint8Array(Buffer.from("Servidor 10.10.60.10, gateway 10.10.60.1, PC 10.10.10.21 y 10.10.10.22", "utf8")))]).then((r) => {
    assert(r.escenas.length === 1, "escenas " + r.escenas.length);
    assert(r.avisos.some((a) => /inventario/i.test(a)), "falta el aviso de inventario");
    const directa = r.escenas[0].escenaDirecta;
    assert(directa && directa.nodos.length === 4, "nodos de inventario " + (directa ? directa.nodos.length : "n/a"));
    assert(directa.zonas.length === 2, "zonas " + directa.zonas.length);
    return `${directa.nodos.length} IPs en ${directa.zonas.length} subredes`;
  });
});

await prueba("evidencias: cita el texto alrededor de la etiqueta del nodo", async () => {
  const r = await I.procesar([archivo("informe.docx", new Uint8Array(escribirZip([{ nombre: "word/document.xml", datos: Buffer.from("<w:document><w:body><w:p><w:r><w:t>El FortiGate 200G aplica políticas UTP y enruta entre VLANes.</w:t></w:r></w:p></w:body></w:document>", "utf8") }])))]);
  const ev = I.evidenciasDe({ nombre: "FortiGate 200G" }, r.documentos, 3);
  assert(ev.length >= 1, "sin evidencias");
  assert(/UTP|pol[ií]ticas/.test(ev[0].cita), "cita poco útil: " + ev[0].cita);
  return `"…${ev[0].cita.slice(0, 60)}…"`;
});

await prueba("JSON exportado se reimporta como escena", async () => {
  const json = JSON.stringify({ nombre: "Mi red", nodos: [{ id: "a", nombre: "Router", tipo: "router", x: 0, z: 0 }, { id: "b", nombre: "PC", tipo: "pc", x: 2, z: 1 }], enlaces: [{ a: "a", b: "b", rotulo: "LAN" }] });
  const r = await I.procesar([archivo("red.json", new Uint8Array(Buffer.from(json, "utf8")))]);
  assert(r.escenas.length === 1, "escenas " + r.escenas.length);
  const esc = I.aEscena(r.escenas[0].grafo);
  assert(esc.nodos.length === 2 && esc.enlaces.length === 1, "no se reconstruyó la escena");
  return "2 nodos, 1 enlace";
});

await new Promise((r) => setTimeout(r, 300));
console.log(`\nResultado: ${ok} correctas, ${mal} fallidas`);
process.exit(mal ? 1 : 0);
