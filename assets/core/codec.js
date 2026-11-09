/* =====================================================================================================
   codec.js — Descompresión e inspección de contenedores SIN dependencias.
   · inflate (DEFLATE / RFC 1951) y descompresión zlib (RFC 1950)
   · lector de archivos ZIP (que es lo que son .docx y .xlsx)
   Es la base para leer .drawio comprimidos, .docx y los flujos de un PDF.
   ===================================================================================================== */
(function (R3) {
  "use strict";

  const LARGO_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const LARGO_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const ORDEN_CODIGOS = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  class LectorBits {
    constructor(datos, desde) {
      this.d = datos;
      this.pos = desde || 0;
      this.bitbuf = 0;
      this.bitcnt = 0;
    }
    bits(n) {
      let v = this.bitbuf;
      while (this.bitcnt < n) {
        if (this.pos >= this.d.length) throw new Error("inflate: datos truncados");
        v |= this.d[this.pos++] << this.bitcnt;
        this.bitcnt += 8;
      }
      this.bitbuf = v >>> n;
      this.bitcnt -= n;
      return v & ((1 << n) - 1);
    }
    alinear() { this.bitbuf = 0; this.bitcnt = 0; }
  }

  function tablaHuffman(longitudes) {
    const cuenta = new Uint16Array(16);
    for (let i = 0; i < longitudes.length; i++) cuenta[longitudes[i]]++;
    cuenta[0] = 0;
    const desplazamiento = new Uint16Array(16);
    for (let i = 1; i < 16; i++) desplazamiento[i] = desplazamiento[i - 1] + cuenta[i - 1];
    const simbolos = new Uint16Array(longitudes.length);
    for (let s = 0; s < longitudes.length; s++) {
      if (longitudes[s]) simbolos[desplazamiento[longitudes[s]]++] = s;
    }
    return { cuenta, simbolos };
  }

  function decodificar(lector, tabla) {
    let codigo = 0, primero = 0, indice = 0;
    for (let largo = 1; largo < 16; largo++) {
      codigo |= lector.bits(1);
      const cuenta = tabla.cuenta[largo];
      if (codigo - primero < cuenta) return tabla.simbolos[indice + (codigo - primero)];
      indice += cuenta;
      primero = (primero + cuenta) << 1;
      codigo <<= 1;
    }
    throw new Error("inflate: código Huffman inválido");
  }

  class Salida {
    constructor(estimado) {
      this.buf = new Uint8Array(Math.max(1024, estimado || 1024));
      this.len = 0;
    }
    reservar(n) {
      if (this.len + n <= this.buf.length) return;
      let cap = this.buf.length;
      while (cap < this.len + n) cap *= 2;
      const nuevo = new Uint8Array(cap);
      nuevo.set(this.buf.subarray(0, this.len));
      this.buf = nuevo;
    }
    byte(b) { this.reservar(1); this.buf[this.len++] = b & 255; }
    copiar(dist, largo) {
      if (dist > this.len) throw new Error("inflate: distancia inválida");
      this.reservar(largo);
      let desde = this.len - dist;
      for (let i = 0; i < largo; i++) this.buf[this.len++] = this.buf[desde++];
    }
    resultado() { return this.buf.subarray(0, this.len); }
  }

  /* ------------------------------------------------------------ inflate (RFC 1951) */
  function inflateRaw(datos, desde) {
    const lector = new LectorBits(datos, desde);
    const salida = new Salida((datos.length || 1) * 5);
    const LARGO_FIJO = new Uint8Array(288);
    for (let i = 0; i < 144; i++) LARGO_FIJO[i] = 8;
    for (let i = 144; i < 256; i++) LARGO_FIJO[i] = 9;
    for (let i = 256; i < 280; i++) LARGO_FIJO[i] = 7;
    for (let i = 280; i < 288; i++) LARGO_FIJO[i] = 8;
    const DIST_FIJO = new Uint8Array(30).fill(5);
    const tablaLargoFija = tablaHuffman(LARGO_FIJO);
    const tablaDistFija = tablaHuffman(DIST_FIJO);

    let ultimo = 0;
    while (!ultimo) {
      ultimo = lector.bits(1);
      const tipo = lector.bits(2);
      if (tipo === 0) {
        lector.alinear();
        const p = lector.pos;
        if (p + 4 > datos.length) throw new Error("inflate: bloque almacenado truncado");
        const len = datos[p] | (datos[p + 1] << 8);
        const nlen = datos[p + 2] | (datos[p + 3] << 8);
        if ((len ^ 0xffff) !== nlen) throw new Error("inflate: longitud inválida en bloque almacenado");
        lector.pos = p + 4;
        for (let i = 0; i < len; i++) {
          if (lector.pos >= datos.length) throw new Error("inflate: bloque almacenado truncado");
          salida.byte(datos[lector.pos++]);
        }
        continue;
      }
      let tablaLargo, tablaDist;
      if (tipo === 1) {
        tablaLargo = tablaLargoFija;
        tablaDist = tablaDistFija;
      } else if (tipo === 2) {
        const nlen = lector.bits(5) + 257;
        const ndist = lector.bits(5) + 1;
        const ncodigo = lector.bits(4) + 4;
        const longitudes = new Uint8Array(320);
        for (let i = 0; i < ncodigo; i++) longitudes[ORDEN_CODIGOS[i]] = lector.bits(3);
        const tablaCodigos = tablaHuffman(longitudes);
        const total = nlen + ndist;
        let i = 0;
        const llenas = new Uint8Array(total);
        while (i < total) {
          const simbolo = decodificar(lector, tablaCodigos);
          if (simbolo < 16) { llenas[i++] = simbolo; continue; }
          let repetir = 0, valor = 0;
          if (simbolo === 16) {
            if (i === 0) throw new Error("inflate: repetición sin base");
            valor = llenas[i - 1];
            repetir = 3 + lector.bits(2);
          } else if (simbolo === 17) repetir = 3 + lector.bits(3);
          else repetir = 11 + lector.bits(7);
          while (repetir-- && i < total) llenas[i++] = valor;
        }
        tablaLargo = tablaHuffman(llenas.subarray(0, nlen));
        tablaDist = tablaHuffman(llenas.subarray(nlen));
      } else {
        throw new Error("inflate: tipo de bloque inválido");
      }

      for (;;) {
        const simbolo = decodificar(lector, tablaLargo);
        if (simbolo < 256) { salida.byte(simbolo); continue; }
        if (simbolo === 256) break;
        const idx = simbolo - 257;
        if (idx >= LARGO_BASE.length) throw new Error("inflate: símbolo de longitud inválido");
        const largo = LARGO_BASE[idx] + lector.bits(LARGO_EXTRA[idx]);
        const dIdx = decodificar(lector, tablaDist);
        if (dIdx >= DIST_BASE.length) throw new Error("inflate: símbolo de distancia inválido");
        const dist = DIST_BASE[dIdx] + lector.bits(DIST_EXTRA[dIdx]);
        salida.copiar(dist, largo);
      }
    }
    return salida.resultado();
  }

  /* -------------------------------------------------------------- zlib (RFC 1950) */
  function inflateZlib(datos) {
    if (datos.length < 6) throw new Error("zlib: cabecera inválida");
    const cmf = datos[0], flg = datos[1];
    if ((cmf & 0x0f) !== 8) throw new Error("zlib: método de compresión distinto de deflate");
    if (((cmf << 8) + flg) % 31 !== 0) throw new Error("zlib: cabecera corrupta");
    const desde = (flg & 0x20) ? 6 : 2;   // con FDICT hay 4 bytes de diccionario
    return inflateRaw(datos, desde);
  }

  /* ------------------------------------------------------------------- utilidades */
  function texto(bytes) { return new TextDecoder("utf-8", { fatal: false }).decode(bytes); }
  function base64ABytes(b64) {
    const limpio = String(b64).replace(/\s+/g, "");
    const bin = atob(limpio);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ------------------------------------------------------------------------- ZIP */
  function leerZip(bytes) {
    const archivos = new Map();
    // Localiza el fin del directorio central (EOCD) desde el final del archivo
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("ZIP: no se encontró el índice central (¿archivo dañado?)");
    const leer16 = (p) => bytes[p] | (bytes[p + 1] << 8);
    const leer32 = (p) => (bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24)) >>> 0;
    const total = leer16(eocd + 10);
    let p = leer32(eocd + 16);
    for (let i = 0; i < total; i++) {
      if (leer32(p) !== 0x02014b50) break;
      const metodo = leer16(p + 10);
      const comprimido = leer32(p + 20);
      const sinComprimir = leer32(p + 24);
      const largoNombre = leer16(p + 28);
      const largoExtra = leer16(p + 30);
      const largoComentario = leer16(p + 32);
      const local = leer32(p + 42);
      const nombre = texto(bytes.subarray(p + 46, p + 46 + largoNombre));
      p += 46 + largoNombre + largoExtra + largoComentario;

      if (leer32(local) !== 0x04034b50) continue;
      const nombreLocal = leer16(local + 26);
      const extraLocal = leer16(local + 28);
      const inicio = local + 30 + nombreLocal + extraLocal;
      const crudo = bytes.subarray(inicio, inicio + (comprimido || sinComprimir));
      let datos;
      if (metodo === 0) datos = crudo;
      else if (metodo === 8) datos = inflateRaw(crudo);
      else continue;   // otros métodos (deflate64, bzip2…) no se usan en .docx
      archivos.set(nombre, datos);
    }
    return archivos;
  }

  R3.Codec = { inflateRaw, inflateZlib, leerZip, texto, base64ABytes };
})(window.R3 = window.R3 || {});
