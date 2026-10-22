// Utilidades de geometría 2D (milímetros). Los polígonos son listas de [x, y]; ClipperLib hace las operaciones booleanas.

export const ESC = 1000; // Clipper trabaja con enteros: 1 mm = 1000 unidades

export const aClipper = (polys) => polys.map((p) => p.map(([x, y]) => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) })));
export const deClipper = (polys) => polys.map((p) => p.map((q) => [q.X / ESC, q.Y / ESC]));

export function areaFirmada(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
}

export function caja(polys) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

/** Comandos de opentype.js → polígonos (aproxima las curvas). */
export function aplanar(cmds, pasos = 10) {
  const polys = [];
  let cur = null, cx = 0, cy = 0;
  for (const c of cmds) {
    if (c.type === "M") { cur = [[c.x, c.y]]; polys.push(cur); cx = c.x; cy = c.y; }
    else if (c.type === "L") { cur.push([c.x, c.y]); cx = c.x; cy = c.y; }
    else if (c.type === "Q") {
      for (let i = 1; i <= pasos; i++) { const t = i / pasos, m = 1 - t; cur.push([m * m * cx + 2 * m * t * c.x1 + t * t * c.x, m * m * cy + 2 * m * t * c.y1 + t * t * c.y]); }
      cx = c.x; cy = c.y;
    } else if (c.type === "C") {
      for (let i = 1; i <= pasos; i++) {
        const t = i / pasos, m = 1 - t;
        cur.push([m ** 3 * cx + 3 * m * m * t * c.x1 + 3 * m * t * t * c.x2 + t ** 3 * c.x, m ** 3 * cy + 3 * m * m * t * c.y1 + 3 * m * t * t * c.y2 + t ** 3 * c.y]);
      }
      cx = c.x; cy = c.y;
    }
  }
  return polys.filter((p) => p.length >= 3);
}

export function circulo(cx, cy, r, n = 40) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}

export const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

function ejecutar(C, tipo, sujeto, recorte) {
  const clip = new C.Clipper();
  clip.AddPaths(aClipper(sujeto), C.PolyType.ptSubject, true);
  if (recorte) clip.AddPaths(aClipper(recorte), C.PolyType.ptClip, true);
  const out = new C.Paths();
  clip.Execute(tipo, out, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  return deClipper(out);
}

export const union = (C, a, b) => ejecutar(C, C.ClipType.ctUnion, a, b);
export const diferencia = (C, a, b) => ejecutar(C, C.ClipType.ctDifference, a, b);

export function engrosar(C, polys, delta) {
  if (!delta) return polys;
  const co = new C.ClipperOffset(2, 0.005 * ESC);
  co.AddPaths(aClipper(polys), C.JoinType.jtRound, C.EndType.etClosedPolygon);
  const out = new C.Paths();
  co.Execute(out, delta * ESC);
  return deClipper(out);
}

/**
 * Agrupa los polígonos en regiones { outer, holes } (con huecos e islas dentro de huecos).
 * Orientación normalizada: exterior antihorario, huecos horarios (en coordenadas x→derecha, y→arriba).
 */
export function regiones(C, polys) {
  const clip = new C.Clipper();
  clip.AddPaths(aClipper(polys), C.PolyType.ptSubject, true);
  const tree = new C.PolyTree();
  clip.Execute(C.ClipType.ctUnion, tree, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  const out = [];
  const orienta = (r, ccw) => ((areaFirmada(r) > 0) === ccw ? r : [...r].reverse());
  const visita = (nodo) => {
    for (const h of nodo.Childs()) {
      if (h.IsHole()) continue;
      const outer = orienta(deClipper([h.Contour()])[0], true);
      const holes = h.Childs().filter((x) => x.IsHole()).map((x) => orienta(deClipper([x.Contour()])[0], false));
      out.push({ outer, holes });
      for (const hh of h.Childs()) visita(hh); // islas dentro de los huecos
    }
  };
  visita(tree);
  return out;
}
