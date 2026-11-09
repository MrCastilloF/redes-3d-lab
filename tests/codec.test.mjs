/* _qa/test-codec.mjs — pruebas del códec (inflate/zlib/zip) contra zlib de Node. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import vm from "node:vm";

const RAIZ = path.resolve(import.meta.dirname, "..", "assets", "core");
const ctx = { window: {}, TextDecoder, Uint8Array, atob, console, TextEncoder };
vm.createContext(ctx);
for (const f of ["codec.js"]) {
  vm.runInContext(fs.readFileSync(path.join(RAIZ, f), "utf8"), ctx, { filename: f });
}
const C = ctx.window.R3.Codec;

let ok = 0, mal = 0;
const prueba = (nombre, fn) => {
  try { const r = fn(); console.log(`  ✓ ${nombre}${r ? " — " + r : ""}`); ok++; }
  catch (e) { console.error(`  ✗ ${nombre}: ${e.message}`); mal++; }
};
const igual = (a, b, msg) => {
  const A = Buffer.from(a), B = Buffer.from(b);
  if (A.length !== B.length) throw new Error(`${msg}: longitudes ${A.length} vs ${B.length}`);
  for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) throw new Error(`${msg}: byte ${i} distinto`);
};
const bytesDe = (s) => new Uint8Array(Buffer.from(s, "utf8"));

console.log("inflate / zlib");
const textos = [
  "Explorador de Redes 3D — labs_redes_test",
  "a".repeat(5000),
  Array.from({ length: 400 }, (_, i) => `VLAN ${i} 10.10.${i}.0/24`).join("\n"),
  JSON.stringify({ nodos: Array.from({ length: 120 }, (_, i) => ({ id: "n" + i, ip: `10.10.1.${i}`, tipo: "pc" })) })
];
for (const t of textos) {
  const b = bytesDe(t);
  for (const nivel of [0, 1, 6, 9]) {
    prueba(`zlib nivel ${nivel} (${b.length} B)`, () => {
      igual(C.inflateZlib(new Uint8Array(zlib.deflateSync(b, { level: nivel }))), b, "zlib");
      return `${b.length} B`;
    });
    prueba(`deflateRaw nivel ${nivel}`, () => {
      igual(C.inflateRaw(new Uint8Array(zlib.deflateRawSync(b, { level: nivel }))), b, "raw");
      return `${b.length} B`;
    });
  }
}
prueba("texto plano almacenado (nivel 0)", () => {
  const b = bytesDe(textos[2]);
  igual(C.inflateRaw(new Uint8Array(zlib.deflateRawSync(b, { level: 0 }))), b, "stored");
  return "ok";
});

/* --------------------------------------------------------------------- ZIP mínimo */
function escribirZip(entradas) {
  const trozos = [], central = [];
  let offset = 0;
  const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
  for (const { nombre, datos, comprimir } of entradas) {
    const nombreB = Buffer.from(nombre, "utf8");
    const crudo = Buffer.from(datos);
    const comp = comprimir === false ? crudo : zlib.deflateRawSync(crudo);
    const crc = zlib.crc32 ? zlib.crc32(crudo) : 0;
    const cab = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]), u16(20), u16(0), u16(comprimir === false ? 0 : 8), u16(0), u16(0),
      u32(crc), u32(comp.length), u32(crudo.length), u16(nombreB.length), u16(0), nombreB
    ]);
    trozos.push(cab, comp);
    central.push(Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]), u16(20), u16(20), u16(0), u16(comprimir === false ? 0 : 8), u16(0), u16(0),
      u32(crc), u32(comp.length), u32(crudo.length), u16(nombreB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nombreB
    ]));
    offset += cab.length + comp.length;
  }
  const dir = Buffer.concat(central);
  const fin = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]), u16(0), u16(0), u16(entradas.length), u16(entradas.length),
    u32(dir.length), u32(offset), u16(0)
  ]);
  return new Uint8Array(Buffer.concat([...trozos, dir, fin]));
}

console.log("\nZIP");
prueba("lee entradas comprimidas y almacenadas", () => {
  const zip = escribirZip([
    { nombre: "word/document.xml", datos: Buffer.from("<w:document>hola ñ</w:document>") },
    { nombre: "docProps/app.xml", datos: Buffer.from("<Properties/>"), comprimir: false }
  ]);
  const m = C.leerZip(zip);
  const doc = C.texto(m.get("word/document.xml"));
  if (!doc.includes("hola ñ")) throw new Error("contenido incorrecto: " + doc);
  if (!m.has("docProps/app.xml")) throw new Error("falta entrada almacenada");
  return `${m.size} entradas`;
});

console.log(`\nResultado: ${ok} correctas, ${mal} fallidas`);
process.exit(mal ? 1 : 0);
