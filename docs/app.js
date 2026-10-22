import opentype from "opentype.js";

import { CATIONES, ANIONES, FAMILIAS_CATION, FAMILIAS_ANION, ionBonito } from "./iones.js?v=1";
import { DEFAULTS, sanear, construirPieza, colocar } from "./pieza.js?v=1";
import { construirSVG, envolverSVG } from "./svg.js?v=1";
import { construirSTL, aBinario, zip } from "./stl.js?v=1";

const el = (id) => document.getElementById(id);

window.addEventListener("error", (e) => {
  const s = el("status");
  if (s) { s.textContent = "Error: " + (e.message || "no se pudo iniciar") + ". Prueba a recargar con Ctrl+Shift+R."; s.classList.add("error"); }
});

const statusEl = el("status");
const holder = el("svg-holder");

// ---------------------------------------------------------------------
// Tipografías
// ---------------------------------------------------------------------

const FONTS = [
  { id: "lexend", nombre: "Lexend", archivo: "lexend-700" },
  { id: "atkinson", nombre: "Atkinson Hyperlegible", archivo: "atkinson-hyperlegible-700" },
  { id: "nunito", nombre: "Nunito", archivo: "nunito-700" },
  { id: "montserrat", nombre: "Montserrat", archivo: "montserrat-700" },
];
const cacheFuentes = {};
async function cargarFuente(archivo) {
  if (!cacheFuentes[archivo]) {
    const res = await fetch(`./fonts/${archivo}.woff`);
    if (!res.ok) throw new Error("no se pudo cargar la letra");
    cacheFuentes[archivo] = opentype.parse(await res.arrayBuffer());
  }
  return cacheFuentes[archivo];
}
const fuenteElegida = () => FONTS.find((f) => f.id === el("fontFamily").value) || FONTS[0];

// ---------------------------------------------------------------------
// Estado: piezas añadidas
// ---------------------------------------------------------------------

const piezasElegidas = [];            // ids de los iones añadidos, en orden

const NUM_FIELDS = ["unidad", "ancho", "tolerancia", "tamanoTexto", "anchoHoja", "separacion", "grosor", "altoTexto"];

function leerParametros() {
  const p = {};
  for (const k of NUM_FIELDS) { const v = Number(el(k).value); p[k] = el(k).value !== "" && Number.isFinite(v) ? v : DEFAULTS[k]; }
  p.modoTexto = el("modoTexto").value;
  return sanear(p);
}

function aplicarDefectos() {
  for (const k of NUM_FIELDS) el(k).value = DEFAULTS[k];
  el("modoTexto").value = DEFAULTS.modoTexto;
  el("fontFamily").value = FONTS[0].id;
  el("separar").checked = false;
}

// ---------------------------------------------------------------------
// Selector de iones
// ---------------------------------------------------------------------

function pintarIones(cont, lista, familias) {
  cont.replaceChildren();
  for (const fam of familias) {
    const ions = lista.filter((i) => i.binario && i.familia === fam);
    if (!ions.length) continue;
    const d = document.createElement("details");
    d.open = true;
    const s = document.createElement("summary");
    s.textContent = fam;
    const chips = document.createElement("div");
    chips.className = "chips";
    for (const ion of ions) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.id = ion.id;
      b.dataset.buscar = `${ion.f} ${ion.elem || ion.nombre} ${ion.trad || ""}`.toLowerCase();
      b.title = `Añadir ${ion.elem || ion.nombre}${ion.trad ? " (" + ion.trad + ")" : ""}`;
      b.innerHTML = `${ionBonito(ion)}<span class="nom">${ion.elem || ion.nombre}</span><span class="cuenta" hidden></span>`;
      b.addEventListener("click", () => { piezasElegidas.push(ion.id); cambioPiezas(); });
      chips.append(b);
    }
    d.append(s, chips);
    cont.append(d);
  }
}

const porId = (id) => [...CATIONES, ...ANIONES].find((i) => i.id === id);

function filtrar() {
  const q = el("filtro").value.trim().toLowerCase();
  for (const b of document.querySelectorAll(".chip")) b.classList.toggle("oculto", !!q && !b.dataset.buscar.includes(q));
  for (const d of document.querySelectorAll(".iones details")) d.hidden = !!q && ![...d.querySelectorAll(".chip")].some((b) => !b.classList.contains("oculto"));
}

function cambioPiezas() {
  const cuentas = {};
  for (const id of piezasElegidas) cuentas[id] = (cuentas[id] || 0) + 1;
  for (const b of document.querySelectorAll(".chip")) {
    const n = cuentas[b.dataset.id] || 0, c = b.querySelector(".cuenta");
    c.hidden = !n; c.textContent = `×${n}`;
    b.classList.toggle("elegido", n > 0);
  }
  const n = piezasElegidas.length;
  el("resumen").textContent = n
    ? `${n} pieza${n === 1 ? "" : "s"}. Para quitar una, púlsala en la vista previa.`
    : "Pulsa un catión o un anión para añadir su pieza (puedes repetirlo). Para quitar una pieza, púlsala en la vista previa.";
  scheduleGenerate();
}

// ---------------------------------------------------------------------
// Vista previa y descargas
// ---------------------------------------------------------------------

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function setStatus(msg, isError = false) { statusEl.textContent = msg; statusEl.classList.toggle("error", isError); }

let estado = null; // { hoja, q, ctx }
let busy = false, pending = false;

async function generate() {
  if (busy) { pending = true; return; }
  busy = true;
  try {
    const q = leerParametros();
    const ions = piezasElegidas.map(porId);
    if (!ions.length) {
      holder.replaceChildren(); el("stats").textContent = ""; el("avisos").textContent = "";
      estado = null; el("svg-btn").disabled = true; el("stl-btn").disabled = true;
      holder.innerHTML = `<p class="vacio-msg vista-vacia">Pulsa un catión o un anión para añadir su pieza.</p>`;
      setStatus("Añade alguna pieza para ver el puzle.");
      return;
    }
    const f = fuenteElegida();
    const fuente = await cargarFuente(f.archivo);
    if (!window.ClipperLib) throw new Error("no se cargó la librería de bordes");
    const ctx = { fuente, clipper: window.ClipperLib };
    // una pieza por ion (los iguales se calculan una vez y se repiten)
    const cache = new Map();
    const piezas = ions.map((ion) => {
      if (!cache.has(ion.id)) cache.set(ion.id, construirPieza(ctx, ion, q));
      return cache.get(ion.id);
    });
    const hoja = colocar(piezas, q);
    const vista = construirSVG(hoja, { vista: true });
    holder.innerHTML = envolverSVG(vista.w, vista.h, vista.inner);
    holder.querySelectorAll("g.pieza").forEach((g) => g.addEventListener("click", () => { piezasElegidas.splice(Number(g.dataset.i), 1); cambioPiezas(); }));
    el("stats").textContent = `${piezas.length} piezas · hoja de ${vista.w.toFixed(0)} × ${vista.h.toFixed(0)} mm`;
    el("avisos").textContent = hoja.ancho > q.anchoHoja + 1e-6 ? "Alguna pieza es más ancha que la hoja: sube el ancho de la hoja." : "";
    estado = { hoja, q, ctx };
    el("svg-btn").disabled = false; el("stl-btn").disabled = false;
    setStatus("Listo. Puedes descargar el SVG o el STL.");
  } catch (err) {
    console.error(err);
    setStatus("Error al generar: " + (err?.message || err), true);
  } finally {
    busy = false;
    if (pending) { pending = false; generate(); }
  }
}

let debounce = null;
function scheduleGenerate() { clearTimeout(debounce); debounce = setTimeout(generate, 220); }

el("svg-btn").addEventListener("click", () => {
  if (!estado) return;
  const s = construirSVG(estado.hoja);
  saveBlob(new Blob([envolverSVG(s.w, s.h, s.inner, "Puzle de formulación")], { type: "image/svg+xml" }), "puzle-formulacion.svg");
});

el("stl-btn").addEventListener("click", () => {
  if (!estado) return;
  try {
    setStatus("Preparando el STL…");
    const archivos = construirSTL(estado.ctx.clipper, estado.hoja, estado.q, { separar: el("separar").checked });
    const datos = archivos.map((a) => ({ nombre: a.nombre, datos: aBinario(a.malla) }));
    if (datos.length === 1) saveBlob(new Blob([datos[0].datos], { type: "model/stl" }), `puzle-formulacion-${datos[0].nombre}`);
    else saveBlob(new Blob([zip(datos.map((d) => ({ nombre: `puzle-formulacion-${d.nombre}`, datos: d.datos })))], { type: "application/zip" }), "puzle-formulacion-stl.zip");
    setStatus(datos.length === 1 ? "STL descargado." : `ZIP con ${datos.length} STL descargado.`);
  } catch (err) {
    console.error(err);
    setStatus("Error al crear el STL: " + (err?.message || err), true);
  }
});

// ---------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------

el("filtro").addEventListener("input", filtrar);
el("quitar-ultima").addEventListener("click", () => { piezasElegidas.pop(); cambioPiezas(); });
el("vaciar").addEventListener("click", () => { piezasElegidas.length = 0; cambioPiezas(); });
for (const k of [...NUM_FIELDS, "modoTexto", "fontFamily"]) { el(k).addEventListener("input", scheduleGenerate); el(k).addEventListener("change", scheduleGenerate); }
el("reset-btn").addEventListener("click", () => { aplicarDefectos(); scheduleGenerate(); });

// arranque
for (const f of FONTS) { const o = document.createElement("option"); o.value = f.id; o.textContent = f.nombre; el("fontFamily").append(o); }
aplicarDefectos();
pintarIones(el("cationes"), CATIONES, FAMILIAS_CATION);
pintarIones(el("aniones"), ANIONES, FAMILIAS_ANION);
cambioPiezas();
generate();
