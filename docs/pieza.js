// Piezas del puzle de formulación. Todo en milímetros, y hacia abajo (como el SVG).
//
// Un catión de carga n es una pieza de alto n × «unidad» con n pestañas redondas a la derecha.
// Un anión de carga −n es una pieza de alto n × «unidad» con n huecos a la izquierda.
// Las pestañas y los huecos caen a la altura de cada unidad, así que el puzle solo encaja cuando las cargas se compensan:
// Mg²⁺ (2 pestañas) con dos Cl⁻ (1 hueco cada uno), Fe³⁺ con PO₄³⁻, dos H⁺ con O²⁻…

import { aplanar, caja, circulo, diferencia, engrosar, rect, union } from "./geo.js";
import { cargaTexto } from "./iones.js";

export const DEFAULTS = {
  unidad: 24,        // alto de la pieza por cada unidad de carga (mm)
  ancho: 30,         // ancho del cuerpo de la pieza, sin contar la pestaña (mm)
  tolerancia: 0.2,   // holgura de los huecos respecto a las pestañas (mm); 0,15–0,3 para 3D, ~0 para láser
  grosor: 3,         // grosor de la placa en 3D (mm)
  altoTexto: 0.8,    // altura del relieve / profundidad del texto incrustado (mm)
  modoTexto: "relieve", // "relieve" (texto sobre la placa) o "incrustado" (texto al ras: placas y textos aparte)
  separacion: 5,     // espacio entre piezas en la hoja (mm)
  anchoHoja: 300,    // ancho de la hoja / cama (mm): las piezas se colocan en filas
  tamanoTexto: 1,    // factor para agrandar o reducir las letras
};

const num = (v, d) => (Number.isFinite(v) ? v : d);

export function sanear(p = {}) {
  const q = { ...DEFAULTS, ...p };
  q.unidad = Math.min(60, Math.max(14, num(q.unidad, DEFAULTS.unidad)));
  q.ancho = Math.min(80, Math.max(18, num(q.ancho, DEFAULTS.ancho)));
  q.tolerancia = Math.min(1, Math.max(0, num(q.tolerancia, DEFAULTS.tolerancia)));
  q.grosor = Math.min(15, Math.max(1, num(q.grosor, DEFAULTS.grosor)));
  q.altoTexto = Math.min(q.grosor - 0.4, Math.max(0.2, num(q.altoTexto, DEFAULTS.altoTexto)));
  q.modoTexto = q.modoTexto === "incrustado" ? "incrustado" : "relieve";
  q.separacion = Math.min(40, Math.max(1, num(q.separacion, DEFAULTS.separacion)));
  q.anchoHoja = Math.min(2000, Math.max(60, num(q.anchoHoja, DEFAULTS.anchoHoja)));
  q.tamanoTexto = Math.min(2, Math.max(0.5, num(q.tamanoTexto, 1)));
  return q;
}

// ---------------------------------------------------------------------
// Contorno
// ---------------------------------------------------------------------

/** Forma de una pestaña con el eje en y = yc, saliendo del borde x = 0 hacia la derecha (cuello + bola). */
function pestana(r, yc) {
  const wn = 0.55 * r;                 // medio ancho del cuello
  const cx = 1.2 * r;                  // centro de la bola
  const cuello = rect(-0.6, yc - wn, cx, yc + wn);
  const bola = circulo(cx, yc, r);
  return { poligonos: [cuello, bola], profundidad: cx + r };
}

export const radioPestana = (p) => 0.19 * p.unidad;

/** Contorno de la pieza: devuelve un único polígono (lista de puntos), con (0, 0) arriba a la izquierda del cuerpo. */
export function contorno(C, tipo, n, p) {
  const q = sanear(p);
  const H = n * q.unidad, W = q.ancho, r = radioPestana(q);
  const cuerpo = [rect(0, 0, W, H)];
  const pestanas = [];
  for (let k = 0; k < n; k++) pestanas.push(...pestana(r, (k + 0.5) * q.unidad).poligonos);
  if (tipo === "cation") {
    const mov = pestanas.map((pl) => pl.map(([x, y]) => [x + W, y]));
    return { poligonos: union(C, cuerpo, mov), W, H, profundidad: pestana(r, 0).profundidad };
  }
  // anión: el hueco es la misma pestaña (desplazada al borde izquierdo) con la holgura de tolerancia
  const hueco = engrosar(C, union(C, pestanas), q.tolerancia);
  return { poligonos: diferencia(C, cuerpo, hueco), W, H, profundidad: pestana(r, 0).profundidad };
}

// ---------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------

/** Trozos de texto de una fórmula: las letras normales y los dígitos como subíndice. */
function trozos(formula) {
  const out = [];
  for (const m of formula.matchAll(/(\d+)|([^\d]+)/g)) out.push({ txt: m[0], sub: !!m[1] });
  return out;
}

function polisTexto(fuente, txt, x, y, size) {
  return aplanar(fuente.getPath(txt, x, y, size).commands);
}

/**
 * Texto de la pieza: la fórmula grande y centrada y la carga arriba a la derecha.
 * Devuelve polígonos (sin unir) en las coordenadas de la pieza.
 */
export function texto(C, fuente, ion, tipo, n, p) {
  const q = sanear(p);
  const H = n * q.unidad, W = q.ancho, r = radioPestana(q);
  const prof = pestana(r, 0).profundidad;
  const xa = (tipo === "anion" ? prof + 1.2 : 1.8), xb = W - 1.8;
  const region = xb - xa;

  // carga: arriba a la derecha
  const signo = fuente.charToGlyphIndex("−") > 0 ? "−" : "-";
  const ct = cargaTexto(ion, signo);
  const partes = trozos(ion.f);
  const medir = (s) => partes.reduce((a, t) => a + fuente.getAdvanceWidth(t.txt, t.sub ? s * 0.6 : s), 0);
  const ssz0 = q.unidad * 0.52 * Math.min(1.5, 1 + 0.25 * (n - 1)) * q.tamanoTexto;
  const csz = Math.min(q.unidad * 0.26, ssz0 * 0.6) * Math.max(0.8, q.tamanoTexto) * (n === 1 ? 1.25 : 1);
  const cw = fuente.getAdvanceWidth(ct, csz);
  const polisCarga = polisTexto(fuente, ct, xb - cw, 2.2 + csz * 0.72, csz);
  const cbox = caja(polisCarga);

  // fórmula: grande y centrada; si choca con la carga se baja o se reduce un poco
  const formula = (ssz, yBase) => {
    const ancho = medir(ssz);
    let x = xa + (region - ancho) / 2;
    const polys = [];
    for (const t of partes) {
      const s = t.sub ? ssz * 0.6 : ssz;
      polys.push(...polisTexto(fuente, t.txt, x, t.sub ? yBase + ssz * 0.16 : yBase, s));
      x += fuente.getAdvanceWidth(t.txt, s);
    }
    return polys;
  };
  let ssz = ssz0;
  if (medir(ssz) > region * 0.86) ssz *= (region * 0.86) / medir(ssz);
  let yBase = H / 2 + ssz * 0.36;       // altura de las mayúsculas ≈ 0,72 em
  let polys = formula(ssz, yBase);
  for (let it = 0; it < 12; it++) {
    const fb = caja(polys);
    const choca = fb.x2 > cbox.x1 - 0.6 && fb.y1 < cbox.y2 + 0.8;
    if (!choca) break;
    const baja = cbox.y2 + 0.8 - fb.y1;
    if (fb.y2 + baja <= H - 1.5) { yBase += baja; polys = formula(ssz, yBase); }
    else { ssz *= 0.93; yBase = H / 2 + ssz * 0.36 + Math.max(0, H * 0.04); polys = formula(ssz, yBase); }
  }
  return [...polys, ...polisCarga];
}

// ---------------------------------------------------------------------
// Pieza completa y hoja
// ---------------------------------------------------------------------

export function construirPieza(ctx, ion, p) {
  const q = sanear(p);
  const n = Math.abs(ion.carga), tipo = ion.carga > 0 ? "cation" : "anion";
  const c = contorno(ctx.clipper, tipo, n, q);
  const t = union(ctx.clipper, texto(ctx.clipper, ctx.fuente, ion, tipo, n, q));
  const cb = caja(c.poligonos);
  return { ion, tipo, n, contorno: c.poligonos, texto: t, W: c.W, H: c.H, caja: cb, profundidad: c.profundidad };
}

/** Coloca las piezas en filas dentro del ancho de hoja. Devuelve { piezas (con x, y), ancho, alto }. */
export function colocar(piezas, p) {
  const q = sanear(p);
  const sep = q.separacion;
  let x = 0, y = 0, altoFila = 0, anchoMax = 0;
  const out = [];
  for (const pz of piezas) {
    const w = pz.caja.w, h = pz.caja.h;
    if (x > 0 && x + w > q.anchoHoja) { x = 0; y += altoFila + sep; altoFila = 0; }
    out.push({ ...pz, dx: x - pz.caja.x1, dy: y - pz.caja.y1 });
    x += w + sep; altoFila = Math.max(altoFila, h); anchoMax = Math.max(anchoMax, x - sep);
  }
  return { piezas: out, ancho: anchoMax, alto: y + altoFila };
}
