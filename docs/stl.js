// STL para imprimir en 3D. Las piezas (de pieza.js) se colocan en la cama como en la hoja SVG.
//
// Modos del texto:
//   relieve     la placa lleva las letras en relieve encima (un solo archivo)
//   incrustado  la placa tiene las letras rehundidas y las letras van aparte, al ras, para imprimirlas de otro color
//               (dos archivos que encajan: «placas» y «textos»)
// Sistema de coordenadas: x → derecha, y → hacia el fondo de la cama (el SVG tiene la y hacia abajo, así que se invierte), z → arriba.

import earcut from "./vendor/earcut.js";
import { areaFirmada, diferencia, regiones } from "./geo.js";

export class Malla {
  constructor() { this.t = []; }
  tri(a, b, c) { this.t.push(a, b, c); }
  get n() { return this.t.length / 3; }
  añadir(otra) { for (const v of otra.t) this.t.push(v); }
}

/** Triángulos de una región { outer, holes } a la altura z. `arriba`: normal +z (si no, −z). */
function tapa(malla, reg, z, arriba) {
  const anillos = [reg.outer, ...reg.holes];
  const plano = [], huecos = [];
  for (const a of anillos) { if (a !== reg.outer) huecos.push(plano.length / 2); for (const [x, y] of a) plano.push(x, y); }
  const idx = earcut(plano, huecos);
  const P = (i) => [plano[2 * i], plano[2 * i + 1], z];
  for (let i = 0; i < idx.length; i += 3) {
    const a = P(idx[i]), b = P(idx[i + 1]), c = P(idx[i + 2]);
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    if ((area > 0) === arriba) malla.tri(a, b, c); else malla.tri(a, c, b);
  }
}

/** Pared que recorre un anillo entre z0 y z1; la normal cae a la derecha del sentido de recorrido
 *  (hacia fuera del material si el exterior es antihorario y los huecos horarios). */
function pared(malla, anillo, z0, z1) {
  for (let i = 0; i < anillo.length; i++) {
    const [x1, y1] = anillo[i], [x2, y2] = anillo[(i + 1) % anillo.length];
    if (x1 === x2 && y1 === y2) continue;
    malla.tri([x1, y1, z0], [x2, y2, z0], [x2, y2, z1]);
    malla.tri([x1, y1, z0], [x2, y2, z1], [x1, y1, z1]);
  }
}

/** Sólido: las regiones extruidas entre z0 y z1. */
function extruir(malla, regs, z0, z1) {
  for (const r of regs) {
    tapa(malla, r, z1, true);
    tapa(malla, r, z0, false);
    pared(malla, r.outer, z0, z1);
    for (const h of r.holes) pared(malla, h, z0, z1);
  }
}

const volteo = (polys, dx, dy) => polys.map((pl) => pl.map(([x, y]) => [x + dx, -(y + dy)]));

/** Mallas de una pieza ya colocada: { placa, texto } (texto = null en modo relieve: va dentro de la placa). */
function piezaMallas(C, pz, q) {
  const T = q.grosor, h = q.altoTexto;
  const contorno = volteo(pz.contorno, pz.dx, pz.dy);
  const letras = volteo(pz.texto, pz.dx, pz.dy);
  const placa = new Malla();
  if (q.modoTexto === "relieve") {
    extruir(placa, regiones(C, contorno), 0, T);
    const txt = new Malla();
    extruir(txt, regiones(C, letras), T - 0.2, T + h);
    return { placa, relieve: txt, texto: null };
  }
  // incrustado: placa con las letras rehundidas h, y las letras aparte
  const regsLetras = regiones(C, letras);
  const R = regiones(C, diferencia(C, contorno, letras));
  const principal = R.reduce((a, b) => (areaFirmada(b.outer) > areaFirmada(a.outer) ? b : a));
  const regsContorno = regiones(C, contorno);
  for (const r of regsContorno) tapa(placa, r, 0, false);
  pared(placa, principal.outer, 0, T);
  for (const r of R) {
    tapa(placa, r, T, true);
    if (r !== principal) pared(placa, r.outer, T - h, T);   // islas (el centro de la «o», «a», «P»…)
    for (const hh of r.holes) pared(placa, hh, T - h, T);   // paredes del hueco de cada letra
  }
  for (const r of regsLetras) tapa(placa, r, T - h, true);  // fondo del hueco
  const txt = new Malla();
  extruir(txt, regsLetras, T - h, T);
  return { placa, relieve: null, texto: txt };
}

/**
 * Construye los archivos. `hoja` = resultado de colocar(); `q` = parámetros saneados.
 * Devuelve [{ nombre, malla }]. Con `separar`, cationes y aniones van en archivos distintos.
 */
export function construirSTL(C, hoja, q, { separar = false } = {}) {
  const grupos = separar ? [["cationes", (p) => p.tipo === "cation"], ["aniones", (p) => p.tipo === "anion"]] : [["puzle", () => true]];
  const archivos = [];
  for (const [nom, filtro] of grupos) {
    const placas = new Malla(), textos = new Malla();
    for (const pz of hoja.piezas.filter(filtro)) {
      const m = piezaMallas(C, pz, q);
      placas.añadir(m.placa);
      if (m.relieve) placas.añadir(m.relieve);
      if (m.texto) textos.añadir(m.texto);
    }
    if (!placas.n) continue;
    if (q.modoTexto === "relieve") archivos.push({ nombre: `${nom}.stl`, malla: placas });
    else { archivos.push({ nombre: `${nom}-placas.stl`, malla: placas }); archivos.push({ nombre: `${nom}-textos.stl`, malla: textos }); }
  }
  return archivos;
}

// ---------------------------------------------------------------------
// Archivos
// ---------------------------------------------------------------------

/** STL binario. */
export function aBinario(malla) {
  const n = malla.n;
  const buf = new ArrayBuffer(84 + 50 * n);
  const dv = new DataView(buf);
  const cab = "Puzle de formulación · miguelquiroga.es";
  for (let i = 0; i < cab.length && i < 79; i++) dv.setUint8(i, cab.charCodeAt(i) & 127);
  dv.setUint32(80, n, true);
  let o = 84;
  for (let i = 0; i < n; i++) {
    const a = malla.t[3 * i], b = malla.t[3 * i + 1], c = malla.t[3 * i + 2];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const v of [nx, ny, nz, ...a, ...b, ...c]) { dv.setFloat32(o, v, true); o += 4; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Uint8Array(buf);
}

const TABLA_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = TABLA_CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/** ZIP sin comprimir con varios archivos [{ nombre, datos: Uint8Array }]. */
export function zip(archivos) {
  const enc = new TextEncoder();
  const partes = [], central = [];
  let desplaz = 0;
  const hoy = new Date();
  const fecha = ((hoy.getFullYear() - 1980) << 9) | ((hoy.getMonth() + 1) << 5) | hoy.getDate();
  const hora = (hoy.getHours() << 11) | (hoy.getMinutes() << 5) | (hoy.getSeconds() >> 1);
  for (const a of archivos) {
    const nom = enc.encode(a.nombre), crc = crc32(a.datos), tam = a.datos.length;
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true); loc.setUint16(8, 0, true);
    loc.setUint16(10, hora, true); loc.setUint16(12, fecha, true); loc.setUint32(14, crc, true);
    loc.setUint32(18, tam, true); loc.setUint32(22, tam, true); loc.setUint16(26, nom.length, true); loc.setUint16(28, 0, true);
    partes.push(new Uint8Array(loc.buffer), nom, a.datos);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint16(12, hora, true); cen.setUint16(14, fecha, true); cen.setUint32(16, crc, true);
    cen.setUint32(20, tam, true); cen.setUint32(24, tam, true); cen.setUint16(28, nom.length, true); cen.setUint32(42, desplaz, true);
    central.push(new Uint8Array(cen.buffer), nom);
    desplaz += 30 + nom.length + tam;
  }
  const tamCentral = central.reduce((s, x) => s + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true); fin.setUint32(16, desplaz, true);
  const todo = [...partes, ...central, new Uint8Array(fin.buffer)];
  const out = new Uint8Array(todo.reduce((s, x) => s + x.length, 0));
  let o = 0; for (const x of todo) { out.set(x, o); o += x.length; }
  return out;
}
