// Hoja SVG para láser: contorno de corte (rojo) y letras (negro, relleno para grabar). Medidas en mm.

const r3 = (n) => Math.round(n * 1000) / 1000;

export const SVG_DEFAULTS = { colorCorte: "#ff0000", colorGrabado: "#000000", grosorLinea: 0.1, margen: 2, vista: false };

// Colores de la vista previa (imitan las piezas impresas: cationes claros, aniones oscuros). No van al archivo descargado.
const VISTA = { cation: { placa: "#a9cde8", texto: "#1f2a33" }, anion: { placa: "#2a2d33", texto: "#ffffff" } };

const pathDe = (polys, dx, dy) => polys.map((pl) => "M" + pl.map(([x, y]) => `${r3(x + dx)} ${r3(y + dy)}`).join("L") + "Z").join("");

/** `hoja` = resultado de colocar(). Devuelve { w, h, inner }. */
export function construirSVG(hoja, o = {}) {
  const s = { ...SVG_DEFAULTS, ...o };
  const m = s.margen;
  let corte = "", grabado = "";
  if (s.vista) {
    let v = "";
    for (const pz of hoja.piezas) {
      const c = VISTA[pz.tipo];
      v += `<path d="${pathDe(pz.contorno, pz.dx + m, pz.dy + m)}" fill="${c.placa}" stroke="#00000033" stroke-width="0.3" stroke-linejoin="round"/>` +
           `<path d="${pathDe(pz.texto, pz.dx + m, pz.dy + m)}" fill="${c.texto}" fill-rule="evenodd"/>`;
    }
    return { w: hoja.ancho + 2 * m, h: hoja.alto + 2 * m, inner: v };
  }
  hoja.piezas.forEach((pz, i) => {
    const id = `${pz.ion.id.replace(/[^A-Za-z0-9]/g, "")}-${i + 1}`;
    corte += `<path id="corte-${id}" d="${pathDe(pz.contorno, pz.dx + m, pz.dy + m)}"/>`;
    grabado += `<path id="texto-${id}" d="${pathDe(pz.texto, pz.dx + m, pz.dy + m)}"/>`;
  });
  const inner =
    `<g id="grabado" fill="${s.colorGrabado}" fill-rule="evenodd" stroke="none">${grabado}</g>` +
    `<g id="corte" fill="none" stroke="${s.colorCorte}" stroke-width="${s.grosorLinea}" stroke-linejoin="round">${corte}</g>`;
  return { w: hoja.ancho + 2 * m, h: hoja.alto + 2 * m, inner };
}

export function envolverSVG(w, h, inner, titulo = "") {
  const t = titulo ? `<title>${titulo.replace(/[<&>"]/g, "")}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r3(w)}mm" height="${r3(h)}mm" viewBox="0 0 ${r3(w)} ${r3(h)}">${t}${inner}</svg>\n`;
}
