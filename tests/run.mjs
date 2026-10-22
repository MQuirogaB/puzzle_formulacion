import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import opentype from "opentype.js";
import { CATIONES, ANIONES, TODOS, compuesto, proporcion, porId, ionBonito } from "../docs/iones.js";
import { construirPieza, colocar, sanear, contorno } from "../docs/pieza.js";
import { construirSVG, envolverSVG } from "../docs/svg.js";
import { construirSTL, aBinario, zip, Malla } from "../docs/stl.js";
import { caja, areaFirmada } from "../docs/geo.js";

const C = createRequire(import.meta.url)("clipper-lib");
const b = fs.readFileSync(new URL("../docs/fonts/lexend-700.woff", import.meta.url));
const fuente = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const ctx = { clipper: C, fuente };
const sinNaN = (s) => assert.ok(!/NaN|undefined|Infinity/.test(s), "valores raros");
const ion = (id) => { const i = porId(id); assert.ok(i, id); return i; };

// ---------- datos ----------
const ids = TODOS.map((i) => i.id);
assert.equal(new Set(ids).size, ids.length, "ids duplicados: " + ids.filter((x, i) => ids.indexOf(x) !== i));
const cat = CATIONES.filter((c) => c.binario), an = ANIONES.filter((a) => a.binario);
assert.ok(cat.length >= 40 && an.length >= 15, `lista corta: ${cat.length} cationes, ${an.length} aniones`);
for (const c of CATIONES) assert.ok(c.carga > 0 && c.carga <= 5, c.id);
for (const a of ANIONES) assert.ok(a.carga < 0 && a.carga >= -4, a.id);
// elementos con varias valencias llevan nombre tradicional (salvo Mn⁴⁺, que tiene tres)
for (const c of CATIONES.filter((c) => c.variable && c.id !== "Mn4+")) assert.ok(c.trad, "falta tradicional " + c.id);

// ---------- compuestos y nombres ----------
const f = (a, b) => compuesto(ion(a), ion(b));
assert.deepEqual([proporcion(ion("Fe3+"), ion("Cl1-")).nCat, proporcion(ion("Fe3+"), ion("Cl1-")).nAn], [1, 3]);
assert.equal(f("Fe3+", "Cl1-").formula, "FeCl3");
assert.equal(f("Fe3+", "O2-").formula, "Fe2O3");
assert.equal(f("Mg2+", "Cl1-").formula, "MgCl2");
assert.equal(f("Al3+", "O2-").formula, "Al2O3");
assert.equal(f("Ca2+", "O2-").formula, "CaO");
assert.equal(f("Pb4+", "O2-").formula, "PbO2");
assert.equal(f("Sn4+", "S2-").formula, "SnS2");
assert.equal(f("Na1+", "N3-").formula, "Na3N");
assert.equal(f("Mn4+", "C4-").formula, "MnC");
assert.equal(f("H1+", "O2-").formula, "H2O");
assert.equal(f("Fe3+", "O2-").stock, "óxido de hierro(III)");
assert.equal(f("Fe3+", "O2-").trad, "óxido férrico");
assert.equal(f("Fe3+", "O2-").sistematica, "trióxido de dihierro");
assert.equal(f("Fe3+", "Cl1-").sistematica, "tricloruro de hierro");
assert.equal(f("Na1+", "Cl1-").stock, "cloruro de sodio");
assert.equal(f("Na1+", "Cl1-").trad, "cloruro de sodio");
assert.equal(f("Na1+", "Cl1-").sistematica, "monocloruro de sodio");
assert.equal(f("Ca2+", "O2-").sistematica, "monóxido de calcio");
assert.equal(f("Cu1+", "O2-").stock, "óxido de cobre(I)");
assert.equal(f("Cu1+", "O2-").trad, "óxido cuproso");
assert.equal(f("Cu1+", "O2-").sistematica, "monóxido de dicobre");
assert.equal(f("H1+", "O2-").especial, "agua");
assert.equal(f("H1+", "Cl1-").especial.slice(0, 4), "ácid");
assert.equal(f("Pb4+", "O2-").sistematica, "dióxido de plomo");
assert.equal(ionBonito(ion("Fe3+")), "Fe³⁺");
assert.equal(ionBonito(ion("Cl1-")), "Cl⁻");
// todas las combinaciones salen sin undefined y con carga neta cero
for (const c of cat) for (const a of an) {
  const k = compuesto(c, a);
  assert.equal(k.nCat * c.carga + k.nAn * a.carga, 0, k.formula);
  sinNaN(k.formula + k.stock + k.sistematica);
}

// ---------- piezas ----------
const P = sanear({});
for (const c of [...cat, ...an]) {
  const pz = construirPieza(ctx, c, P);
  const n = Math.abs(c.carga);
  assert.equal(pz.contorno.length, 1, `${c.id}: contorno de un solo trozo`);
  assert.ok(Math.abs(pz.H - n * P.unidad) < 1e-9);
  assert.ok(pz.texto.length > 0, `${c.id}: sin texto`);
  // el texto cae dentro del cuerpo de la pieza
  const t = caja(pz.texto);
  assert.ok(t.x1 >= 0 && t.x2 <= P.ancho && t.y1 >= 0 && t.y2 <= pz.H, `${c.id}: texto fuera (${t.x1.toFixed(1)}..${t.x2.toFixed(1)} × ${t.y1.toFixed(1)}..${t.y2.toFixed(1)})`);
  if (c.carga > 0) assert.ok(Math.abs(pz.caja.w - (P.ancho + pz.profundidad)) < 0.05, `${c.id}: ancho con pestaña`);
  else assert.ok(Math.abs(pz.caja.w - P.ancho) < 0.05, `${c.id}: ancho del anión`);
}
// la pestaña del catión cabe en el hueco del anión: el catión se superpone al anión sin pisarlo (con tolerancia > 0)
import { diferencia, union } from "../docs/geo.js";
{
  const area2 = (polys) => polys.reduce((s, p) => s + Math.abs(areaFirmada(p)), 0);
  for (const [cid, aid] of [["Mg2+", "Cl1-"], ["Fe3+", "O2-"], ["Na1+", "Cl1-"], ["Mn4+", "C4-"]]) {
    const c = construirPieza(ctx, ion(cid), P), a = construirPieza(ctx, ion(aid), P);
    const nA = Math.abs(a.ion.carga), nC = Math.abs(c.ion.carga);
    const lcm = (x, y) => { let m = x; while (m % y) m += x; return m; };
    const alto = lcm(nA, nC) * P.unidad;
    // columna de aniones apilados a la derecha del catión: sin solape
    const mueve = (pl, dx, dy) => pl.map((r) => r.map(([x, y]) => [x + dx, y + dy]));
    const reps = alto / (nA * P.unidad);
    let col = [];
    for (let k = 0; k < reps; k++) col = col.concat(mueve(a.contorno, P.ancho, k * nA * P.unidad));
    let cats = [];
    for (let k = 0; k < alto / (nC * P.unidad); k++) cats = cats.concat(mueve(c.contorno, 0, k * nC * P.unidad));
    const inter = (() => { const cl = new C.Clipper(); cl.AddPaths(cats.map((p) => p.map(([x, y]) => ({ X: Math.round(x * 1000), Y: Math.round(y * 1000) }))), C.PolyType.ptSubject, true); cl.AddPaths(col.map((p) => p.map(([x, y]) => ({ X: Math.round(x * 1000), Y: Math.round(y * 1000) }))), C.PolyType.ptClip, true); const out = new C.Paths(); cl.Execute(C.ClipType.ctIntersection, out, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero); return out; })();
    const areaInter = inter.reduce((s, p) => s + Math.abs(C.Clipper.Area(p)), 0) / 1e6;
    assert.ok(areaInter < 0.5, `${cid}+${aid}: se pisan ${areaInter.toFixed(2)} mm²`);
    // y el hueco que queda entre ambos es pequeño (holgura), no un agujero grande
    const huecoTotal = (() => { const todo = union(C, [...cats, ...col]); const h = caja(todo); return h.w * h.h - area2(todo); })();
    assert.ok(huecoTotal < 8 * P.tolerancia * P.unidad * alto / P.unidad + 20 * (alto / P.unidad), `${cid}+${aid}: huecos ${huecoTotal.toFixed(1)}`);
  }
}

// ---------- hoja SVG ----------
const conjunto = ["Mg2+", "Cl1-", "Cl1-", "Fe3+", "O2-", "Na1+"].map((id) => construirPieza(ctx, ion(id), P));
const hoja = colocar(conjunto, { ...P, anchoHoja: 150 });
assert.ok(hoja.ancho <= 150 + 1e-6 && hoja.alto > 0);
for (const a of hoja.piezas) for (const b2 of hoja.piezas) if (a !== b2) {
  const A = { x1: a.caja.x1 + a.dx, x2: a.caja.x2 + a.dx, y1: a.caja.y1 + a.dy, y2: a.caja.y2 + a.dy };
  const B = { x1: b2.caja.x1 + b2.dx, x2: b2.caja.x2 + b2.dx, y1: b2.caja.y1 + b2.dy, y2: b2.caja.y2 + b2.dy };
  assert.ok(A.x2 <= B.x1 || B.x2 <= A.x1 || A.y2 <= B.y1 || B.y2 <= A.y1, "piezas solapadas en la hoja");
}
const { w, h, inner } = construirSVG(hoja);
const svg = envolverSVG(w, h, inner, "Puzle");
sinNaN(svg);
assert.match(svg, /<g id="grabado" fill="#000000"/);
assert.match(svg, /<g id="corte" fill="none" stroke="#ff0000" stroke-width="0.1"/);
assert.ok(!/<text|transform=/.test(svg));
assert.equal((svg.match(/id="corte-/g) || []).length, 6);

// ---------- STL ----------
function revisarMalla(m, nombre) {
  // cerrada: cada arista aparece una vez en cada sentido
  const k = (v) => v.map((x) => Math.round(x * 1e4)).join(",");
  const aristas = new Map();
  for (let i = 0; i < m.n; i++) {
    const t = [m.t[3 * i], m.t[3 * i + 1], m.t[3 * i + 2]];
    for (let j = 0; j < 3; j++) {
      const a = k(t[j]), b2 = k(t[(j + 1) % 3]);
      if (a === b2) continue;
      aristas.set(`${a}>${b2}`, (aristas.get(`${a}>${b2}`) || 0) + 1);
    }
  }
  let malas = 0;
  for (const [e, n] of aristas) { const [a, b2] = e.split(">"); if (n !== 1 || aristas.get(`${b2}>${a}`) !== 1) malas++; }
  // volumen con signo > 0 (normales hacia fuera)
  let vol = 0;
  for (let i = 0; i < m.n; i++) { const [a, b2, c] = [m.t[3 * i], m.t[3 * i + 1], m.t[3 * i + 2]]; vol += (a[0] * (b2[1] * c[2] - b2[2] * c[1]) - a[1] * (b2[0] * c[2] - b2[2] * c[0]) + a[2] * (b2[0] * c[1] - b2[1] * c[0])) / 6; }
  return { malas, vol };
}
for (const modo of ["relieve", "incrustado"]) {
  const q = sanear({ modoTexto: modo });
  const pzs = ["Na1+", "Cl1-", "Fe3+", "O2-", "Mg2+"].map((id) => construirPieza(ctx, ion(id), q));
  const hj = colocar(pzs, q);
  for (const separar of [false, true]) {
    const files = construirSTL(C, hj, q, { separar });
    assert.equal(files.length, (modo === "relieve" ? 1 : 2) * (separar ? 2 : 1), `${modo}/${separar}: nº de archivos`);
    for (const fi of files) {
      const r = revisarMalla(fi.malla, fi.nombre);
      assert.equal(r.malas, 0, `${modo}/${fi.nombre}: ${r.malas} aristas abiertas`);
      assert.ok(r.vol > 0, `${modo}/${fi.nombre}: volumen ${r.vol}`);
      const bin = aBinario(fi.malla);
      assert.equal(bin.length, 84 + 50 * fi.malla.n);
      assert.ok(Number.isFinite(new DataView(bin.buffer).getFloat32(100, true)));
    }
  }
  // volumen esperado: ~ área de las placas × grosor
  const [uno] = construirSTL(C, hj, q);
  const areaPlacas = hj.piezas.reduce((s, p) => s + p.contorno.reduce((a, r) => a + Math.abs(areaFirmada(r)), 0), 0);
  const v = revisarMalla(uno.malla).vol;
  assert.ok(v > areaPlacas * q.grosor * 0.85 && v < areaPlacas * (q.grosor + q.altoTexto) * 1.05, `${modo}: volumen ${v.toFixed(0)} vs ${(areaPlacas * q.grosor).toFixed(0)}`);
}

// ZIP: cabecera y contenido
{
  const z = zip([{ nombre: "a.stl", datos: new Uint8Array([1, 2, 3]) }, { nombre: "b.stl", datos: new Uint8Array([4, 5]) }]);
  assert.equal(new DataView(z.buffer).getUint32(0, true), 0x04034b50);
  assert.equal(new DataView(z.buffer).getUint16(z.length - 22 + 10, true), 2);
}

console.log("ok");
